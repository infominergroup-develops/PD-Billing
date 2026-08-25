import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { AuditLog, AuditActionType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  User,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  Edit,
} from 'lucide-react';

interface AuditLogsViewerProps {
  logs: AuditLog[];
  onClearLogs: () => void;
}

export const AuditLogsViewer: React.FC<AuditLogsViewerProps> = ({
  logs,
  onClearLogs,
}) => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((l) => {
    if (selectedAction !== 'all' && l.action !== selectedAction) return false;

    const q = searchQuery.toLowerCase();
    return (
      l.user.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.targetId && l.targetId.toLowerCase().includes(q))
    );
  });

  const handleExportAuditExcel = () => {
    const data = filteredLogs.map((l) => ({
      'Log ID': l.id,
      Timestamp: l.timestamp,
      'User Name': l.user,
      'User Role': l.userRole,
      'Action Type': l.action,
      Description: l.description,
      'Target ID': l.targetId || '',
      'Previous Value': l.oldValue || '',
      'New Value': l.newValue || '',
      'Session / IP': l.ipAddress || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0] || {}).map((k) => ({
      wch: Math.max(k.length + 3, 15),
    }));
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, `Infominer_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'AUTH_LOGIN':
      case 'AUTH_LOGOUT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">AUTH</span>;
      case 'UPLOAD_DATA':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">UPLOAD</span>;
      case 'OVERRIDE_RATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-[#eb8a23]">OVERRIDE</span>;
      case 'EDIT_CASE':
      case 'ADD_CASE':
      case 'DELETE_CASE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">CASE RECORD</span>;
      case 'GENERATE_INVOICE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">INVOICE</span>;
      case 'EXPORT_EXCEL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">EXPORT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full mx-auto animate-in fade-in duration-200" id="audit-logs-panel">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
                8
              </span>
              <h1 className="text-xl font-black text-[#2d3e50]">Compliance &amp; User Activity Audit Trail</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Immutable log of all user operations: data uploads, case modifications, rate overrides, invoice generations, and exports for audit compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAuditExcel}
              className="inline-flex items-center gap-1.5 bg-[#2d3e50] hover:bg-[#1e293b] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow"
              id="export-audit-excel-btn"
            >
              <Download className="w-3.5 h-3.5 text-[#eb8a23]" />
              <span>Export Audit Sheet</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear historical audit logs?')) {
                    onClearLogs();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl border border-red-200 transition cursor-pointer font-semibold"
                id="clear-audit-logs-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by user, description, or Client Application Number..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#eb8a23]"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:border-[#eb8a23]"
            >
              <option value="all">All Action Types ({logs.length})</option>
              <option value="UPLOAD_DATA">Uploads</option>
              <option value="OVERRIDE_RATE">Rate Overrides</option>
              <option value="EDIT_CASE">Case Edits</option>
              <option value="GENERATE_INVOICE">Invoices</option>
              <option value="EXPORT_EXCEL">Exports</option>
              <option value="AUTH_LOGIN">Authentication</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse" id="audit-trail-table">
            <thead className="bg-[#2d3e50] text-white font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 w-44">Timestamp</th>
                <th className="p-3 w-40">User &amp; Role</th>
                <th className="p-3 w-28 text-center">Category</th>
                <th className="p-3">Activity Description</th>
                <th className="p-3 w-32 font-mono">Target ID</th>
                <th className="p-3 w-20 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit records match your search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-[#2d3e50] truncate">{log.user}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        {log.userRole}
                      </div>
                    </td>
                    <td className="p-3 text-center">{getActionBadge(log.action)}</td>
                    <td className="p-3 text-slate-800">{log.description}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{log.targetId || '—'}</td>
                    <td className="p-3 text-center">
                      {(log.oldValue || log.newValue) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-[#eb8a23] hover:text-white text-slate-600 text-[10px] font-bold transition cursor-pointer"
                        >
                          Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#2d3e50]">Audit Change Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">User &amp; Time</span>
                <span className="font-bold text-[#2d3e50]">
                  {selectedLog.user} ({selectedLog.userRole}) at {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Description</span>
                <span className="text-slate-700">{selectedLog.description}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <span className="font-bold text-red-800 block mb-1">Previous Value</span>
                  <pre className="text-[11px] text-red-700 font-mono whitespace-pre-wrap">
                    {selectedLog.oldValue || 'None'}
                  </pre>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-800 block mb-1">New Value</span>
                  <pre className="text-[11px] text-emerald-700 font-mono whitespace-pre-wrap">
                    {selectedLog.newValue || 'None'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-[#2d3e50] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
