import React, { useState } from 'react';
import { CaseRecord, RateRule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface EditableRecordsTableProps {
  cases: CaseRecord[];
  rates: RateRule[];
  onUpdateCase: (updatedCase: CaseRecord, changeReason?: string) => void;
  onAddCase: (newCase: CaseRecord) => void;
  onDeleteCase: (clientApplicationNumber: string) => void;
  onExportFilteredExcel: (filteredCases: CaseRecord[]) => void;
}

export const EditableRecordsTable: React.FC<EditableRecordsTableProps> = ({
  cases,
  rates,
  onUpdateCase,
  onAddCase,
  onDeleteCase,
  onExportFilteredExcel,
}) => {
  const { canEditRecords } = useAuth();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'billable' | 'exceptions' | 'cancelled' | 'overrides'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Edit / Override Modal State
  const [editingCase, setEditingCase] = useState<CaseRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter logic
  const uniqueClients = Array.from(new Set(cases.map((c) => c.clientDb).filter(Boolean))).sort();
  const uniqueStates = Array.from(new Set(cases.map((c) => c.state).filter(Boolean))).sort();
  const uniqueBranches = Array.from(new Set(cases.map((c) => c.branch).filter(Boolean))).sort();

  const baseFilteredForStatus = cases.filter((c) => {
    // Search
    const q = searchQuery.toLowerCase();
    if (q) {
      const matchesSearch =
        c.clientApplicationNumber.toLowerCase().includes(q) ||
        c.applicantName.toLowerCase().includes(q) ||
        c.clientDb.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.clientAppNo.toLowerCase().includes(q);

      if (!matchesSearch) return false;
    }

    // Client Filter
    if (clientFilter !== 'all' && c.clientDb !== clientFilter) return false;

    // State Filter
    if (stateFilter !== 'all' && c.state !== stateFilter) return false;

    return true;
  });

  const filtered = baseFilteredForStatus.filter((c) => {
    // Status Filter
    if (statusFilter === 'billable' && !c.isBillable) return false;
    if (statusFilter === 'exceptions' && !c.isException) return false;
    if (statusFilter === 'cancelled' && !c.isCancelled) return false;
    if (statusFilter === 'overrides' && !c.isManualOverride) return false;

    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCases = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    // Recalculate amount if rate changed or override
    const updated = {
      ...editingCase,
      billingAmt: editingCase.billingRate,
      isBillable: editingCase.billingRate > 0 && !editingCase.isCancelled,
      isException: editingCase.billingRate === 0 && !editingCase.isCancelled,
      updatedAt: new Date().toISOString(),
    };

    onUpdateCase(updated, editingCase.overrideReason || 'Direct record edit in dashboard');
    setEditingCase(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200" id="case-records-panel">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
                4
              </span>
              <h1 className="text-xl font-black text-[#2d3e50]">Case Records &amp; Billing Overrides</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Search, filter, inspect, and edit any case record. Manual rate overrides are tracked in the audit trail.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canEditRecords && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#2d3e50] hover:bg-[#1e293b] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                id="add-single-case-btn"
              >
                <Plus className="w-4 h-4 text-[#eb8a23]" />
                <span>Add Case Record</span>
              </button>
            )}

            <button
              onClick={() => onExportFilteredExcel(filtered)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
              id="export-filtered-records-btn"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export View ({filtered.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search ID, applicant, city..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#eb8a23]"
            />
          </div>

          {/* Status Tabs */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:border-[#eb8a23]"
            >
              <option value="all">All Statuses ({baseFilteredForStatus.length})</option>
              <option value="billable">Billable Only ({baseFilteredForStatus.filter((c) => c.isBillable).length})</option>
              <option value="exceptions">Exceptions Only ({baseFilteredForStatus.filter((c) => c.isException).length})</option>
              <option value="cancelled">Cancelled Only ({baseFilteredForStatus.filter((c) => c.isCancelled).length})</option>
              <option value="overrides">Manual Overrides ({baseFilteredForStatus.filter((c) => c.isManualOverride).length})</option>
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:border-[#eb8a23]"
            >
              <option value="all">All Clients ({uniqueClients.length})</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:border-[#eb8a23]"
            >
              <option value="all">All States ({uniqueStates.length})</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse" id="editable-records-table">
            <thead className="bg-[#2d3e50] text-white font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 whitespace-nowrap">Client Application Number</th>
                <th className="p-3 whitespace-nowrap">Client (DB)</th>
                <th className="p-3 whitespace-nowrap">Applicant Name</th>
                <th className="p-3 whitespace-nowrap">Branch / City</th>
                <th className="p-3 whitespace-nowrap">State</th>
                <th className="p-3 whitespace-nowrap">Product</th>
                <th className="p-3 whitespace-nowrap text-center">Billing KM</th>
                <th className="p-3 whitespace-nowrap">Slab Applied</th>
                <th className="p-3 whitespace-nowrap text-right">Rate (₹)</th>
                <th className="p-3 whitespace-nowrap text-center">Status</th>
                <th className="p-3 whitespace-nowrap">Remarks</th>
                <th className="p-3 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    No matching cases found.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition ${
                        c.isManualOverride
                          ? 'bg-orange-50/30'
                          : c.isException
                          ? 'bg-amber-50/30'
                          : c.isCancelled
                          ? 'bg-red-50/20'
                          : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-[#2d3e50] whitespace-nowrap">
                        {c.clientApplicationNumber}
                      </td>
                      <td className="p-3 text-slate-800 font-semibold max-w-[160px] truncate" title={c.clientDb}>
                        {c.clientDb}
                      </td>
                      <td className="p-3 text-slate-700 max-w-[140px] truncate" title={c.applicantName}>
                        {c.applicantName}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {c.branch} {c.city ? `(${c.city})` : ''}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{c.state || '—'}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{c.product || '—'}</td>
                      <td className="p-3 text-center font-bold text-[#eb8a23]">
                        {c.kmUsedForBilling !== null && c.kmUsedForBilling !== undefined ? `${c.kmUsedForBilling} km` : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {c.slabApplied || '—'}
                      </td>
                      <td className="p-3 text-right font-black text-[#2d3e50] whitespace-nowrap">
                        {c.billingRate > 0 ? `₹${c.billingRate.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {c.isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </span>
                        ) : c.isBillable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Billable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> Exception
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 max-w-[160px] truncate" title={c.remarks}>
                        {c.isManualOverride && (
                          <span className="text-[#eb8a23] font-bold mr-1">[Override]</span>
                        )}
                        {c.remarks || '—'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingCase(c)}
                            className="p-1.5 text-slate-500 hover:text-[#eb8a23] hover:bg-orange-50 rounded-lg transition cursor-pointer"
                            title="Edit Record & Rate Override"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {canEditRecords && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete case ${c.clientApplicationNumber}?`)) {
                                  onDeleteCase(c.clientApplicationNumber);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, filtered.length)}</strong> of{' '}
            <strong>{filtered.length}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Override Record Modal */}
      {editingCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-[#2d3e50]">
                  Edit Case &amp; Billing Rate
                </h3>
                <span className="font-mono text-xs text-[#eb8a23] font-bold">
                  {editingCase.clientApplicationNumber}
                </span>
              </div>
              <button
                onClick={() => setEditingCase(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Applicant Name</label>
                  <input
                    type="text"
                    value={editingCase.applicantName}
                    onChange={(e) => setEditingCase({ ...editingCase, applicantName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={editingCase.clientDb}
                    onChange={(e) => setEditingCase({ ...editingCase, clientDb: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    list="branch-list"
                    value={editingCase.branch}
                    onChange={(e) => setEditingCase({ ...editingCase, branch: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                  />
                  <datalist id="branch-list">
                    {uniqueBranches.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editingCase.city}
                    onChange={(e) => setEditingCase({ ...editingCase, city: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editingCase.state}
                    onChange={(e) => setEditingCase({ ...editingCase, state: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing KM</label>
                  <input
                    type="number"
                    value={editingCase.kmUsedForBilling ?? ''}
                    onChange={(e) =>
                      setEditingCase({
                        ...editingCase,
                        kmUsedForBilling: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Enter KM"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23] font-bold text-[#eb8a23]"
                  />
                </div>
              </div>

              {/* Rate Override Box */}
              <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2d3e50]">
                  <DollarSign className="w-4 h-4 text-[#eb8a23]" />
                  <span>Manual Billing Rate Override</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Override Billing Rate (₹)</label>
                    <input
                      type="number"
                      value={editingCase.billingRate}
                      onChange={(e) =>
                        setEditingCase({
                          ...editingCase,
                          billingRate: Number(e.target.value),
                          isManualOverride: true,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-orange-300 focus:outline-none focus:border-[#eb8a23] font-black text-sm bg-white text-[#2d3e50]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Override Reason / Audit Note</label>
                    <input
                      type="text"
                      value={editingCase.overrideReason || ''}
                      onChange={(e) =>
                        setEditingCase({
                          ...editingCase,
                          overrideReason: e.target.value,
                          isManualOverride: true,
                        })
                      }
                      placeholder="e.g. Special agreed rate / Senior approval"
                      className="w-full px-3 py-1.5 rounded-lg border border-orange-300 focus:outline-none focus:border-[#eb8a23] bg-white"
                      required={editingCase.isManualOverride}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#eb8a23] hover:bg-[#d97917] text-white font-bold cursor-pointer shadow"
                >
                  Save Changes &amp; Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Case Modal */}
      {isAddModalOpen && (
        <AddNewCaseModal
          rates={rates}
          uniqueBranches={uniqueBranches}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(newCase) => {
            onAddCase(newCase);
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface AddNewCaseModalProps {
  rates: RateRule[];
  uniqueBranches: string[];
  onClose: () => void;
  onAdd: (newCase: CaseRecord) => void;
}

const AddNewCaseModal: React.FC<AddNewCaseModalProps> = ({ rates, uniqueBranches, onClose, onAdd }) => {
  const [clientApplicationNumber, setCaseId] = useState(`CASE-${Date.now().toString().slice(-5)}`);
  const [applicantName, setApplicantName] = useState('');
  const [clientDb, setClientDb] = useState(rates[0]?.client || 'Aditya Birla Capital - PD');
  const [branch, setBranch] = useState('Main Branch');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Uttar Pradesh');
  const [product, setProduct] = useState('Home Loan');
  const [activityType, setActivityType] = useState('PD');
  const [km, setKm] = useState<number | ''>(25);
  const [billingRate, setBillingRate] = useState<number | ''>(800);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalRate = Number(billingRate) || 0;
    const newRecord: CaseRecord = {
      id: `case_${Date.now()}`,
      clientApplicationNumber,
      clientAppNo: `APP-${Date.now().toString().slice(-6)}`,
      applicantName: applicantName || 'Manual Entry',
      clientDb,
      rateSheetClient: clientDb,
      branch,
      city,
      state,
      product,
      activityType,
      caseStatus: 'Completed',
      kmUsedForBilling: km === '' ? null : Number(km),
      billingRate: finalRate,
      billingAmt: finalRate,
      slabApplied: 'Manual Creation',
      remarks: 'Manually Added Case',
      isBillable: finalRate > 0,
      isException: finalRate === 0,
      isCancelled: false,
      updatedAt: new Date().toISOString(),
    };

    onAdd(newRecord);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-[#2d3e50]">Add New Case Record</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Client Application Number *</label>
              <input
                type="text"
                value={clientApplicationNumber}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23] font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Applicant Name *</label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                placeholder="Full Name"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Client Institution</label>
              <input
                type="text"
                value={clientDb}
                onChange={(e) => setClientDb(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                list="add-branch-list"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
              />
              <datalist id="add-branch-list">
                {uniqueBranches.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Billing KM</label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23] font-bold text-[#eb8a23]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Billing Rate (₹) *</label>
              <input
                type="number"
                value={billingRate}
                onChange={(e) => setBillingRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#eb8a23] font-bold text-emerald-700"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#eb8a23] hover:bg-[#d97917] text-white font-bold cursor-pointer shadow"
            >
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
