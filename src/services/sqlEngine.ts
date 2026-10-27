import alasql from 'alasql';
import { Dataset, SqlQueryResult } from '../types';

// Track registered tables
const registeredTables = new Set<string>();

// Register a dataset as a queryable SQL table
export function registerDatasetTable(dataset: Dataset): void {
  const tableName = dataset.tableName;

  try {
    // Drop existing table if exists in alasql in-memory db
    if (registeredTables.has(tableName)) {
      alasql(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    // Filter to only columns included in analysis
    const includedCols = dataset.columns.filter((c) => c.includedInAnalysis);
    const colNames = new Set(includedCols.map((c) => c.name));

    // Prepare rows with only included columns
    const cleanRows = dataset.rows.map((row) => {
      const filtered: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        if (colNames.has(k)) {
          filtered[k] = row[k];
        }
      });
      return filtered;
    });

    // Create table and insert rows
    alasql(`CREATE TABLE \`${tableName}\``);
    alasql.tables[tableName].data = cleanRows;
    registeredTables.add(tableName);
  } catch (err: any) {
    console.error(`Failed to register table ${tableName}:`, err);
    throw new Error(`Failed to initialize SQL table "${tableName}": ${err.message}`);
  }
}

// SQL Security Validator: Read-only guard
export function validateQuerySecurity(sql: string): { valid: boolean; reason?: string } {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Query is empty.' };
  }

  // Check for multiple semicolon-separated statements
  const statements = trimmed
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length > 1) {
    return {
      valid: false,
      reason: 'Multiple SQL statements are not permitted. Please run one query at a time.',
    };
  }

  const query = statements[0];
  const upper = query.toUpperCase();

  // Must begin with approved read-only operations
  const isReadOnly =
    upper.startsWith('SELECT') ||
    upper.startsWith('WITH') ||
    upper.startsWith('EXPLAIN') ||
    upper.startsWith('SHOW');

  if (!isReadOnly) {
    return {
      valid: false,
      reason: 'Only read-only queries (SELECT, WITH) are permitted in WorkforceIQ analytics.',
    };
  }

  // Explicitly forbidden destructive or external keywords
  const forbiddenPatterns = [
    /\bDROP\b/i,
    /\bDELETE\b/i,
    /\bUPDATE\b/i,
    /\bINSERT\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bEXEC\b/i,
    /\bATTACH\b/i,
    /\bDETACH\b/i,
    /\bFILE\b/i,
    /\bINTO\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(query)) {
      return {
        valid: false,
        reason: `Destructive or prohibited command detected (${pattern.toString()}). Only SELECT statements are allowed.`,
      };
    }
  }

  return { valid: true };
}

// Execute safe SQL query
export async function executeSqlQuery(sql: string, maxRows = 500): Promise<SqlQueryResult> {
  const securityCheck = validateQuerySecurity(sql);
  if (!securityCheck.valid) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: securityCheck.reason,
    };
  }

  const startTime = performance.now();
  try {
    // Clean SQL: remove trailing semicolon
    const cleanSql = sql.trim().replace(/;+$/, '');
    const res: any = alasql(cleanSql);

    const endTime = performance.now();
    const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;

    let rows: Record<string, any>[] = [];
    if (Array.isArray(res)) {
      rows = res;
    } else if (res && typeof res === 'object') {
      rows = [res];
    }

    // Limit display rows to avoid rendering freeze on huge results
    const truncatedRows = rows.slice(0, maxRows);
    const columns = rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows: truncatedRows,
      rowCount: rows.length,
      executionTimeMs,
    };
  } catch (err: any) {
    const endTime = performance.now();
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      error: err.message || 'An unexpected error occurred during SQL execution.',
    };
  }
}
