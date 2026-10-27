import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Printer,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  TrendingDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { exportToCsv } from '../services/exportService';

interface EmployeeRecord {
  Employee_ID?: string;
  Full_Name?: string;
  Department?: string;
  Role?: string;
  Location?: string;
  Gender?: string;
  Tenure_Years?: number;
  Monthly_Salary?: number;
  Annual_Salary?: number;
  Performance_Rating?: number;
  Overtime_Hours?: number;
  Absent_Days?: number;
  Job_Satisfaction_Score?: number;
  Employment_Status?: string;
  Attrition?: string;
  Hire_Date?: string;
  [key: string]: any;
}

interface EmployeeDetailsTableProps {
  rows: Record<string, any>[];
  tableName?: string;
}

export const EmployeeDetailsTable: React.FC<EmployeeDetailsTableProps> = ({ rows, tableName = 'employees' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedRating, setSelectedRating] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<string>('Full_Name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);

  // Extract distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const d = r.Department || r.department;
      if (d) set.add(String(d));
    });
    return Array.from(set).sort();
  }, [rows]);

  // Compute calculated risk score
  const calculateAttritionRisk = (emp: EmployeeRecord): { level: 'Low' | 'Medium' | 'High'; reason: string } => {
    if (emp.Employment_Status === 'Resigned' || emp.Attrition === 'Yes') {
      return { level: 'High', reason: 'Resigned / Departed' };
    }
    const overtime = emp.Overtime_Hours ?? 0;
    const satisfaction = emp.Job_Satisfaction_Score ?? 4;
    const tenure = emp.Tenure_Years ?? 3;

    if (satisfaction <= 2 && overtime >= 12) {
      return { level: 'High', reason: 'Low satisfaction + high overtime' };
    }
    if (satisfaction <= 2 || overtime >= 15 || tenure < 1) {
      return { level: 'Medium', reason: 'Elevated workload pressure' };
    }
    return { level: 'Low', reason: 'Stable engagement benchmark' };
  };

  // Filter and sort records
  const filteredEmployees = useMemo(() => {
    return rows.filter((r) => {
      const emp = r as EmployeeRecord;
      const name = String(emp.Full_Name || emp.name || emp.Employee_ID || '').toLowerCase();
      const id = String(emp.Employee_ID || '').toLowerCase();
      const role = String(emp.Role || emp.role || '').toLowerCase();
      const dept = String(emp.Department || emp.department || '');
      const status = String(emp.Employment_Status || emp.status || (emp.Attrition === 'Yes' ? 'Resigned' : 'Active'));
      const rating = emp.Performance_Rating ?? 0;
      const risk = calculateAttritionRisk(emp).level;

      // Keyword search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !role.includes(q) && !dept.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Department filter
      if (selectedDept !== 'ALL' && dept !== selectedDept) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'Active' && status !== 'Active') return false;
        if (selectedStatus === 'Resigned' && status !== 'Resigned') return false;
      }

      // Risk filter
      if (selectedRisk !== 'ALL' && risk !== selectedRisk) {
        return false;
      }

      // Rating filter
      if (selectedRating !== 'ALL') {
        const reqRating = Number(selectedRating);
        if (rating !== reqRating) return false;
      }

      return true;
    });
  }, [rows, searchTerm, selectedDept, selectedStatus, selectedRisk, selectedRating]);

  // Sort
  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];
    list.sort((a: any, b: any) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return list;
  }, [filteredEmployees, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedEmployees.length / pageSize) || 1;
  const paginatedEmployees = sortedEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const handleExportCsv = () => {
    exportToCsv(sortedEmployees, `employee_directory_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Summary Metrics for the top banner
  const activeCount = filteredEmployees.filter((e) => (e.Employment_Status || 'Active') === 'Active' && e.Attrition !== 'Yes').length;
  const resignedCount = filteredEmployees.length - activeCount;
  const avgSalary = Math.round(
    filteredEmployees.reduce((sum, e) => sum + (e.Monthly_Salary || (e.Annual_Salary ? e.Annual_Salary / 12 : 0)), 0) /
      (filteredEmployees.length || 1)
  );
  const avgTenure = (
    filteredEmployees.reduce((sum, e) => sum + (e.Tenure_Years || 0), 0) / (filteredEmployees.length || 1)
  ).toFixed(1);
  const highRiskCount = filteredEmployees.filter((e) => calculateAttritionRisk(e).level === 'High').length;

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-lg border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#4B5563] uppercase">Employees in View</span>
          <div className="text-xl font-bold text-[#111827] mt-1">{filteredEmployees.length}</div>
          <span className="text-[10px] text-gray-400">Total staff evaluated</span>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#4B5563] uppercase">Active vs Resigned</span>
          <div className="text-xl font-bold text-[#111827] mt-1">
            <span className="text-emerald-600">{activeCount}</span> / <span className="text-rose-600">{resignedCount}</span>
          </div>
          <span className="text-[10px] text-gray-400">Retention status</span>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#4B5563] uppercase">Avg Monthly Salary</span>
          <div className="text-xl font-bold text-[#111827] mt-1">${avgSalary.toLocaleString()}</div>
          <span className="text-[10px] text-gray-400">Benchmark compensation</span>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#4B5563] uppercase">Avg Tenure</span>
          <div className="text-xl font-bold text-[#111827] mt-1">{avgTenure} yrs</div>
          <span className="text-[10px] text-gray-400">Length of service</span>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#4B5563] uppercase">Retention Watchlist</span>
          <div className="text-xl font-bold text-rose-600 mt-1">{highRiskCount}</div>
          <span className="text-[10px] text-gray-400">High risk / resigned</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
              Employee Workforce Directory
            </h3>
            <span className="text-[11px] text-[#4B5563] font-mono bg-gray-100 px-2 py-0.5 rounded">
              {filteredEmployees.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-3 bg-gray-50/70 border-b border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, ID, or title..."
              className="w-full text-xs pl-7 pr-2 py-1.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-1.5 px-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-1.5 px-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Resigned">Resigned / Former</option>
            </select>
          </div>

          {/* Attrition Risk Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-1.5 px-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="High">High Attrition Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <select
              value={selectedRating}
              onChange={(e) => {
                setSelectedRating(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-1.5 px-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Performance Ratings</option>
              <option value="5">Rating: 5 Stars</option>
              <option value="4">Rating: 4 Stars</option>
              <option value="3">Rating: 3 Stars</option>
              <option value="2">Rating: 2 Stars</option>
            </select>
          </div>
        </div>

        {/* Structured Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#4B5563] font-semibold select-none">
              <tr>
                <th
                  onClick={() => handleSort('Employee_ID')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Employee</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Department')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Department & Role</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Location')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Tenure_Years')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Tenure</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Monthly_Salary')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Salary (Mo)</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Performance_Rating')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Rating</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Overtime_Hours')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Overtime</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Absent_Days')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Absence</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Job_Satisfaction_Score')}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Satisfaction</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Attrition Risk</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
              {paginatedEmployees.map((emp, idx) => {
                const name = emp.Full_Name || emp.name || `Employee ${idx + 1}`;
                const id = emp.Employee_ID || `EMP-${1000 + idx}`;
                const dept = emp.Department || emp.department || 'General';
                const role = emp.Role || emp.role || 'Staff Member';
                const loc = emp.Location || emp.location || 'HQ';
                const tenure = emp.Tenure_Years !== undefined ? `${emp.Tenure_Years}y` : '-';
                const salary = emp.Monthly_Salary || (emp.Annual_Salary ? Math.round(emp.Annual_Salary / 12) : null);
                const rating = emp.Performance_Rating ?? 3;
                const overtime = emp.Overtime_Hours ?? 0;
                const absence = emp.Absent_Days ?? 0;
                const satisfaction = emp.Job_Satisfaction_Score ?? 3;
                const status = emp.Employment_Status || (emp.Attrition === 'Yes' ? 'Resigned' : 'Active');
                const risk = calculateAttritionRisk(emp);

                const initials = name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <tr
                    key={id + idx}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    {/* Employee Profile */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-[11px] shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-[#111827]">{name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div>
                        <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          {dept}
                        </span>
                        <div className="text-[11px] text-[#4B5563] mt-0.5">{role}</div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-[#4B5563]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{loc}</span>
                      </div>
                    </td>

                    {/* Tenure */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-[11px]">
                      {tenure}
                    </td>

                    {/* Salary */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-semibold text-[#111827]">
                      {salary ? `$${salary.toLocaleString()}` : '-'}
                    </td>

                    {/* Performance Rating */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{rating}/5</span>
                      </div>
                    </td>

                    {/* Overtime */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-[11px]">
                      <span className={overtime > 12 ? 'text-amber-700 font-semibold' : 'text-[#4B5563]'}>
                        {overtime}h
                      </span>
                    </td>

                    {/* Absence Days */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-[11px] text-[#4B5563]">
                      {absence}d
                    </td>

                    {/* Satisfaction */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          satisfaction >= 4
                            ? 'bg-emerald-50 text-emerald-700'
                            : satisfaction === 3
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {satisfaction} / 5
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    {/* Attrition Risk */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          risk.level === 'High'
                            ? 'bg-red-100 text-red-800'
                            : risk.level === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-[#4B5563]'
                        }`}
                        title={risk.reason}
                      >
                        {risk.level}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        className="text-xs text-[#2563EB] hover:underline font-medium"
                      >
                        Dossier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination & Row Count */}
        <div className="p-3 bg-gray-50 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs text-[#4B5563]">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} records
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs p-1 bg-white border border-[#E5E7EB] rounded"
            >
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-[#E5E7EB] rounded hover:bg-gray-50 disabled:opacity-40"
            >
              &larr; Prev
            </button>
            <span className="font-medium text-[#111827]">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-[#E5E7EB] rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Employee Dossier Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
                  {(selectedEmployee.Full_Name || selectedEmployee.name || 'EM')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    {selectedEmployee.Full_Name || selectedEmployee.name || 'Employee Profile'}
                  </h3>
                  <div className="text-xs text-[#4B5563] flex items-center gap-2">
                    <span className="font-mono">{selectedEmployee.Employee_ID || 'ID-Active'}</span>
                    <span>&bull;</span>
                    <span>{selectedEmployee.Role || 'Staff Member'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Core Information Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-gray-50 rounded border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-semibold">Department</span>
                  <div className="font-semibold text-[#111827] mt-0.5">
                    {selectedEmployee.Department || 'General'}
                  </div>
                </div>
                <div className="p-2.5 bg-gray-50 rounded border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-semibold">Location / Office</span>
                  <div className="font-semibold text-[#111827] mt-0.5">
                    {selectedEmployee.Location || 'HQ Hub'}
                  </div>
                </div>
                <div className="p-2.5 bg-gray-50 rounded border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-semibold">Monthly Compensation</span>
                  <div className="font-semibold text-[#111827] mt-0.5">
                    ${(selectedEmployee.Monthly_Salary || 0).toLocaleString()} / mo
                  </div>
                </div>
                <div className="p-2.5 bg-gray-50 rounded border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-semibold">Tenure Length</span>
                  <div className="font-semibold text-[#111827] mt-0.5">
                    {selectedEmployee.Tenure_Years ?? 1} Years
                  </div>
                </div>
              </div>

              {/* Workload & Risk Diagnostic */}
              <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-blue-50/30 space-y-2">
                <div className="flex items-center justify-between font-semibold text-[#111827]">
                  <span>Retention Risk Assessment</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      calculateAttritionRisk(selectedEmployee).level === 'High'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {calculateAttritionRisk(selectedEmployee).level} Risk
                  </span>
                </div>
                <p className="text-[#4B5563]">
                  Diagnostic: {calculateAttritionRisk(selectedEmployee).reason}. Overtime recorded at{' '}
                  <strong>{selectedEmployee.Overtime_Hours ?? 0} hrs/week</strong> with job satisfaction score of{' '}
                  <strong>{selectedEmployee.Job_Satisfaction_Score ?? 4}/5</strong>.
                </p>
              </div>

              {/* Other attributes */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                  <span className="text-[#4B5563]">Performance Rating:</span>
                  <span className="font-semibold text-[#111827]">{selectedEmployee.Performance_Rating ?? 3} / 5</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                  <span className="text-[#4B5563]">Absence Days (Current Year):</span>
                  <span className="font-semibold text-[#111827]">{selectedEmployee.Absent_Days ?? 0} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                  <span className="text-[#4B5563]">Hire Date / Record:</span>
                  <span className="font-mono text-[#111827]">{selectedEmployee.Hire_Date || '2022-04-12'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#4B5563]">Employment Status:</span>
                  <span className="font-semibold text-[#111827]">{selectedEmployee.Employment_Status || 'Active'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-[#E5E7EB] flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded text-xs font-medium"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
