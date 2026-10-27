import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnDataType, ColumnProfile, DataQualityReport, Dataset, ProposedJoin } from '../types';

// Sanitize string to valid SQL table/column name
export function sanitizeSqlIdentifier(name: string): string {
  const sanitized = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(sanitized) ? `tbl_${sanitized}` : sanitized;
}

// Infer data type from array of sample values
function inferColumnType(
  colName: string,
  values: any[],
  totalRows: number
): { type: ColumnDataType; description: string } {
  const nonNulls = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) {
    return { type: 'text', description: 'Empty or all null column' };
  }

  const lowerName = colName.toLowerCase();

  // Check identifier patterns
  if (
    lowerName === 'id' ||
    lowerName.endsWith('_id') ||
    lowerName.endsWith('id') ||
    lowerName.includes('code') ||
    lowerName.includes('uuid') ||
    lowerName.includes('key')
  ) {
    const distinct = new Set(nonNulls).size;
    if (distinct / nonNulls.length >= 0.8) {
      return { type: 'identifier', description: 'Unique identifier or reference key' };
    }
  }

  // Check date patterns
  const dateMatches = nonNulls.filter((v) => {
    if (v instanceof Date) return true;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return !isNaN(Date.parse(trimmed));
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) return !isNaN(Date.parse(trimmed));
      if (/^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) return !isNaN(Date.parse(trimmed));
    }
    return false;
  });
  if (dateMatches.length / nonNulls.length >= 0.75) {
    return { type: 'date', description: 'Calendar date or timestamp' };
  }

  // Check boolean patterns
  const boolMatches = nonNulls.filter((v) => {
    if (typeof v === 'boolean') return true;
    const str = String(v).toLowerCase().trim();
    return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(str);
  });
  if (boolMatches.length === nonNulls.length && nonNulls.length > 0) {
    return { type: 'boolean', description: 'Binary boolean flag (Yes/No)' };
  }

  // Check currency
  const currencyMatches = nonNulls.filter((v) => {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      return /^[$\u20AC\u00A3\u00A5]\s*[-+]?[0-9,]+(\.[0-9]+)?$/.test(trimmed) ||
             /[-+]?[0-9,]+(\.[0-9]+)?\s*[$\u20AC\u00A3\u00A5]$/.test(trimmed);
    }
    return false;
  });
  if (currencyMatches.length / nonNulls.length >= 0.6 || lowerName.includes('salary') || lowerName.includes('revenue') || lowerName.includes('cost') || lowerName.includes('expense') || lowerName.includes('price')) {
    const hasNumeric = nonNulls.some((v) => typeof v === 'number' || !isNaN(Number(String(v).replace(/[^0-9.-]+/g, ''))));
    if (hasNumeric) {
      return { type: 'currency', description: 'Monetary currency value' };
    }
  }

  // Check percentage
  const percentageMatches = nonNulls.filter((v) => {
    if (typeof v === 'string' && v.trim().endsWith('%')) return true;
    return false;
  });
  if (percentageMatches.length / nonNulls.length >= 0.6 || lowerName.includes('percent') || lowerName.includes('rate') || lowerName.includes('ratio')) {
    return { type: 'percentage', description: 'Percentage or proportional rate' };
  }

  // Check numbers
  const numberMatches = nonNulls.filter((v) => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') {
      const clean = v.trim().replace(/,/g, '');
      return clean !== '' && !isNaN(Number(clean));
    }
    return false;
  });
  if (numberMatches.length / nonNulls.length >= 0.8) {
    return { type: 'number', description: 'Continuous or discrete numeric measurement' };
  }

  // Check category
  const distinctCount = new Set(nonNulls.map((v) => String(v).toLowerCase().trim())).size;
  if (distinctCount <= 30 || (totalRows > 10 && distinctCount / nonNulls.length <= 0.35)) {
    return { type: 'category', description: `Discrete categorical grouping (${distinctCount} unique classes)` };
  }

  return { type: 'text', description: 'Descriptive or unstructured text' };
}

// Convert string values to clean typed primitives for execution
export function cleanRawValue(val: any, type: ColumnDataType): any {
  if (val === null || val === undefined || val === '') return null;

  if (type === 'number' || type === 'currency') {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  }

  if (type === 'percentage') {
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/%/g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  }

  if (type === 'boolean') {
    if (typeof val === 'boolean') return val ? 1 : 0;
    const s = String(val).toLowerCase().trim();
    return ['true', 'yes', '1', 'y'].includes(s) ? 1 : 0;
  }

  if (type === 'date') {
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const parsed = Date.parse(String(val));
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
    return String(val);
  }

  return String(val).trim();
}

// Profile dataset columns and build data quality audit
export function profileDataset(
  name: string,
  rawRows: Record<string, any>[],
  sourceType: Dataset['sourceType'],
  sheetNames?: string[],
  selectedSheet?: string
): Dataset {
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Dataset contains no records or rows could not be parsed.');
  }

  const firstRow = rawRows[0];
  const colKeys = Object.keys(firstRow).filter((k) => k !== '__rowNum__');
  const totalRows = rawRows.length;
  let totalMissing = 0;

  // Track duplicate rows by composite hash
  const rowHashes = new Set<string>();
  let duplicateRowCount = 0;

  rawRows.forEach((row) => {
    const hash = JSON.stringify(row);
    if (rowHashes.has(hash)) {
      duplicateRowCount++;
    } else {
      rowHashes.add(hash);
    }
  });

  const columns: ColumnProfile[] = colKeys.map((colName) => {
    const values = rawRows.map((r) => r[colName]);
    const nulls = values.filter((v) => v === null || v === undefined || v === '');
    totalMissing += nulls.length;

    const { type, description } = inferColumnType(colName, values, totalRows);
    const nonNulls = values.filter((v) => v !== null && v !== undefined && v !== '');
    const distinctSet = new Set(nonNulls.map((v) => String(v).trim()));
    const distinctCount = distinctSet.size;

    // Check primary key candidacy (unique and 0 nulls)
    const isPrimaryKeyCandidate = nulls.length === 0 && distinctCount === totalRows && totalRows > 1;

    // Sample distinct values
    const sampleValues = Array.from(distinctSet).slice(0, 5);

    // Compute min / max / mean for numeric fields
    let min: number | string | undefined = undefined;
    let max: number | string | undefined = undefined;
    let mean: number | undefined = undefined;

    if (type === 'number' || type === 'currency' || type === 'percentage') {
      const numVals = nonNulls
        .map((v) => cleanRawValue(v, type))
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      if (numVals.length > 0) {
        min = Math.min(...numVals);
        max = Math.max(...numVals);
        mean = Math.round((numVals.reduce((a, b) => a + b, 0) / numVals.length) * 100) / 100;
      }
    } else if (type === 'date') {
      const dateVals = nonNulls
        .map((v) => cleanRawValue(v, 'date'))
        .filter((v) => v && typeof v === 'string')
        .sort();
      if (dateVals.length > 0) {
        min = dateVals[0];
        max = dateVals[dateVals.length - 1];
      }
    }

    return {
      name: colName,
      type,
      inferredDescription: description,
      nullCount: nulls.length,
      distinctCount,
      sampleValues,
      min,
      max,
      mean,
      isPrimaryKeyCandidate,
      includedInAnalysis: true,
    };
  });

  // Identify quality issues
  const potentialIssues: DataQualityReport['potentialIssues'] = [];

  columns.forEach((col) => {
    const missingPct = (col.nullCount / totalRows) * 100;
    if (missingPct > 20) {
      potentialIssues.push({
        column: col.name,
        issue: `High rate of missing values (${missingPct.toFixed(1)}%)`,
        severity: missingPct > 50 ? 'high' : 'medium',
        remediation: 'Consider excluding this column or using imputation in your SQL queries.',
      });
    }

    if (col.distinctCount === 1 && totalRows > 1) {
      potentialIssues.push({
        column: col.name,
        issue: 'Single invariant value across all rows',
        severity: 'low',
        remediation: 'This column provides zero statistical variance. Recommend excluding it.',
      });
    }
  });

  if (duplicateRowCount > 0) {
    potentialIssues.push({
      issue: `Found ${duplicateRowCount} duplicate row(s) in this dataset`,
      severity: duplicateRowCount / totalRows > 0.05 ? 'high' : 'medium',
      remediation: 'Verify whether multiple identical entries are intentional or ingestion duplicates.',
    });
  }

  const primaryKeyCandidate = columns.find((c) => c.isPrimaryKeyCandidate)?.name;

  const qualityReport: DataQualityReport = {
    totalRows,
    totalColumns: columns.length,
    duplicateRows: duplicateRowCount,
    missingCells: totalMissing,
    missingPercentage: Math.round((totalMissing / (totalRows * columns.length || 1)) * 10000) / 100,
    potentialIssues,
    primaryKeyCandidate,
  };

  // Convert raw rows to cleaned typed objects
  const cleanedRows = rawRows.map((row) => {
    const cleaned: Record<string, any> = {};
    columns.forEach((col) => {
      cleaned[col.name] = cleanRawValue(row[col.name], col.type);
    });
    return cleaned;
  });

  const datasetId = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tableName = sanitizeSqlIdentifier(name.replace(/\.[^/.]+$/, ''));

  return {
    id: datasetId,
    name,
    sourceType,
    uploadedAt: new Date().toISOString(),
    sheetNames,
    selectedSheet,
    columns,
    rows: cleanedRows,
    qualityReport,
    tableName,
  };
}

// Parse CSV with auto-delimiter detection
export async function parseCsvFile(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          return reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
        }
        try {
          const dataset = profileDataset(file.name, results.data as Record<string, any>[], 'csv');
          resolve(dataset);
        } catch (err: any) {
          reject(err);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      },
    });
  });
}

// Parse Excel Workbook (.xlsx, .xls)
export async function parseExcelFile(
  file: File,
  targetSheet?: string
): Promise<{ dataset: Dataset; allSheets: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Workbook contains no worksheets.');
  }

  const sheetToUse = targetSheet && sheetNames.includes(targetSheet) ? targetSheet : sheetNames[0];
  const worksheet = workbook.Sheets[sheetToUse];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });

  if (!jsonData || jsonData.length === 0) {
    throw new Error(`Worksheet "${sheetToUse}" is empty.`);
  }

  const dataset = profileDataset(file.name, jsonData, 'excel', sheetNames, sheetToUse);
  return { dataset, allSheets: sheetNames };
}

// Parse JSON file (.json)
export async function parseJsonFile(file: File): Promise<Dataset> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON format: file could not be parsed as valid JSON.');
  }

  let records: Record<string, any>[] = [];
  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Check if wrapped in data or records key
    const arrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (arrayKey) {
      records = parsed[arrayKey];
    } else {
      records = [parsed];
    }
  }

  if (records.length === 0) {
    throw new Error('JSON file must contain an array of objects or structured records.');
  }

  return profileDataset(file.name, records, 'json');
}

// Identify potential foreign key relationships across multiple datasets
export function detectDatasetRelationships(left: Dataset, right: Dataset): ProposedJoin[] {
  const proposals: ProposedJoin[] = [];

  left.columns.forEach((lCol) => {
    right.columns.forEach((rCol) => {
      const lName = lCol.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rName = rCol.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check name match or ID link
      const nameMatch = lName === rName || lName.includes(rName) || rName.includes(lName);
      const typeCompatible = lCol.type === rCol.type || (lCol.type === 'identifier' && rCol.type === 'identifier');

      if (nameMatch && typeCompatible) {
        let confidence = 0.6;
        if (lName === rName) confidence += 0.3;
        if (lCol.isPrimaryKeyCandidate || rCol.isPrimaryKeyCandidate) confidence += 0.1;

        const relType =
          lCol.isPrimaryKeyCandidate && rCol.isPrimaryKeyCandidate
            ? 'one-to-one'
            : lCol.isPrimaryKeyCandidate || rCol.isPrimaryKeyCandidate
            ? 'one-to-many'
            : 'many-to-many';

        proposals.push({
          leftDatasetId: left.id,
          rightDatasetId: right.id,
          leftColumn: lCol.name,
          rightColumn: rCol.name,
          relationshipType: relType,
          confidenceScore: Math.min(confidence, 1.0),
          explanation: `Matches key "${lCol.name}" with "${rCol.name}" (${relType}). Compatibility verified on ${lCol.type}.`,
          confirmed: false,
        });
      }
    });
  });

  return proposals.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
