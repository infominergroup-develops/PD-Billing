import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RateRule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  TableProperties,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface MasterRateSheetProps {
  rates: RateRule[];
  onUpdateRates: (rates: RateRule[]) => void;
  onProceedToMapping: () => void;
}

export const MasterRateSheet: React.FC<MasterRateSheetProps> = ({
  rates,
  onUpdateRates,
  onProceedToMapping,
}) => {
  const { canEditRates } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [localRates, setLocalRates] = useState<RateRule[]>(rates);
  const pendingUpdate = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setLocalRates(rates);
  }, [rates]);

  const [newClientData, setNewClientData] = useState<Partial<RateRule>>({
    client: '',
    state: '',
    branch: '',
    city: '',
    product: '',
    flat: null,
    s1k: null,
    s1r: null,
    s2k: null,
    s2r: null,
    s3r: null,
    other: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCellChange = (
    index: number,
    field: keyof RateRule,
    value: string
  ) => {
    setLocalRates(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'client' || field === 'state' || field === 'branch' || field === 'city' || field === 'product') {
        item[field] = value;
      } else {
        const num = value.trim() === '' ? null : Number(value);
        (item as any)[field] = isNaN(num as any) ? null : num;
      }

      updated[index] = item;

      if (pendingUpdate.current) clearTimeout(pendingUpdate.current);
      pendingUpdate.current = setTimeout(() => {
        onUpdateRates(updated);
      }, 500);

      return updated;
    });
  };

  const handleAddRow = () => {
    setIsAddModalOpen(true);
  };

  const handleSaveNewClient = () => {
    if (!newClientData.client) {
      alert('Client Name is required.');
      return;
    }
    const newId = Math.max(...localRates.map((r) => r.id), 0) + 1;
    const newRow: RateRule = {
      id: newId,
      client: newClientData.client,
      state: newClientData.state || '',
      branch: newClientData.branch || '',
      city: newClientData.city || '',
      product: newClientData.product || '',
      flat: newClientData.flat || null,
      s1k: newClientData.s1k || null,
      s1r: newClientData.s1r || null,
      s2k: newClientData.s2k || null,
      s2r: newClientData.s2r || null,
      s3r: newClientData.s3r || null,
      other: newClientData.other || null,
    };
    if (pendingUpdate.current) clearTimeout(pendingUpdate.current);
    const updated = [...localRates, newRow];
    setLocalRates(updated);
    onUpdateRates(updated);
    setIsAddModalOpen(false);
    setNewClientData({
      client: '',
      state: '',
      branch: '',
      city: '',
      product: '',
      flat: null,
      s1k: null,
      s1r: null,
      s2k: null,
      s2r: null,
      s3r: null,
      other: null,
    });
  };

  const handleDeleteRow = (index: number) => {
    if (!window.confirm('Delete this rate configuration row?')) return;
    if (pendingUpdate.current) clearTimeout(pendingUpdate.current);
    const updated = localRates.filter((_, i) => i !== index);
    setLocalRates(updated);
    onUpdateRates(updated);
  };

  const handleExportRates = () => {
    const data = localRates.map((r) => ({
      'Client Name': r.client,
      State: r.state || 'All',
      Branch: r.branch || 'All',
      City: r.city || 'All',
      Product: r.product || 'All',
      'Flat Rate (₹)': r.flat ?? '',
      'Slab 1 Max KM': r.s1k ?? '',
      'Slab 1 Rate (₹)': r.s1r ?? '',
      'Slab 2 Max KM': r.s2k ?? '',
      'Slab 2 Rate (₹)': r.s2r ?? '',
      'Beyond Slab 2 Rate (₹)': r.s3r ?? '',
      'Site/Other Visit Rate (₹)': r.other ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0] || {}).map((k) => ({
      wch: Math.max(k.length + 3, 14),
    }));
    XLSX.utils.book_append_sheet(wb, ws, 'Master Rates');
    XLSX.writeFile(wb, `Infominer_Master_Rate_Sheet_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportRates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

        const importedRates: RateRule[] = rows.map((r, idx) => {
          // Normalize keys by removing ALL non-alphanumeric characters (spaces, symbols, parens, asterisks, etc.) and lowercasing
          const normR: Record<string, any> = {};
          Object.keys(r).forEach(k => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            normR[cleanKey] = r[k];
          });

          const parseNum = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            const n = Number(String(val).replace(/[^0-9\.]/g, ''));
            return isNaN(n) ? null : n;
          };

          return {
            id: idx + 1,
            client: String(normR['clientname'] || normR['client'] || normR['clientinstitutionname'] || r['Client Name'] || '').trim(),
            state: normR['state'] === 'All' ? '' : String(normR['state'] || '').trim(),
            branch: normR['branch'] === 'All' ? '' : String(normR['branch'] || '').trim(),
            city: normR['city'] === 'All' ? '' : String(normR['city'] || '').trim(),
            product: normR['product'] === 'All' ? '' : String(normR['product'] || '').trim(),
            flat: parseNum(normR['flatrate'] ?? normR['flat']),
            s1k: parseNum(normR['slab1maxkm'] ?? normR['slab1km'] ?? normR['slab1']),
            s1r: parseNum(normR['slab1rate'] ?? normR['slab1rate₹']),
            s2k: parseNum(normR['slab2maxkm'] ?? normR['slab2km'] ?? normR['slab2']),
            s2r: parseNum(normR['slab2rate'] ?? normR['slab2rate₹']),
            s3r: parseNum(normR['beyondslab2rate'] ?? normR['beyondrate'] ?? normR['beyondslab2']),
            other: parseNum(normR['siteothervisitrate'] ?? normR['sitevisitrate'] ?? normR['sitevisit'] ?? normR['other']),
          };
        }).filter(r => r.client); // Filter out rows that have no client name

        if (importedRates.length) {
          onUpdateRates(importedRates);
          alert(`Successfully imported ${importedRates.length} master rate rules.`);
        } else {
          const sampleCols = rows.length > 0 ? Object.keys(rows[0]).join(', ') : 'No columns found';
          alert(`Could not find valid rate rules in the file. Ensure you have a 'Client Name' column. Columns detected: ${sampleCols}`);
        }
      } catch (err: any) {
        alert(`Failed to import rate sheet: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filteredRates = localRates
    .map((r, idx) => ({ ...r, originalIndex: idx }))
    .filter((r) => {
      // 1. Permanently remove anything that isn't PD, Income Assessment, or LIP (or empty = All)
      const p = (r.product || '').toLowerCase();
      const isAllowedProduct = 
        p === '' || 
        p.includes('pd') || 
        p.includes('personal discussion') || 
        p.includes('income assessment') || 
        p.includes('lip');

      if (!isAllowedProduct) return false;

      // 2. Apply search text
      const matchSearch =
        r.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.state && r.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.branch && r.branch.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.city && r.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.product && r.product.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // 3. Apply dropdown filter
      const matchProduct = productFilter === '' || (r.product && r.product.toLowerCase().includes(productFilter.toLowerCase()));
      
      return matchSearch && matchProduct;
    });

  return (
    <div className="space-y-6 w-full mx-auto animate-in fade-in duration-200" id="master-rates-container">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
                2
              </span>
              <h1 className="text-xl font-black text-[#2d3e50]">Master Rate Sheet Engine</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Configure tiered billing slabs or flat rates for each institution and state.
              Slab 1 applies when KM &le; Slab 1 Max; Slab 2 applies when KM &le; Slab 2 Max; Beyond Rate applies thereafter.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onProceedToMapping}
              className="inline-flex items-center gap-1.5 bg-[#eb8a23] hover:bg-[#d97917] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition cursor-pointer"
              id="proceed-to-mapping-btn"
            >
              <span>Step 3: Client Mapping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bank / NBFC or state..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#eb8a23]"
            />
          </div>

          <div className="relative max-w-[200px]">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#eb8a23] appearance-none bg-white"
            >
              <option value="">All Products</option>
              <option value="pd">PD / Personal Discussion</option>
              <option value="income assessment">Income Assessment</option>
              <option value="lip">LIP</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditRates && (
              <button
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 bg-[#2d3e50] hover:bg-[#1e293b] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                id="add-rate-row-btn"
              >
                <Plus className="w-3.5 h-3.5 text-[#eb8a23]" />
                <span>Add Client Rule</span>
              </button>
            )}

            <button
              onClick={handleExportRates}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              id="export-rates-btn"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Rate Sheet</span>
            </button>

            {canEditRates && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportRates}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  id="import-rates-btn"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {!canEditRates && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>You are viewing rates in Read-Only mode. Switch to Admin role in the top-right menu to edit rates.</span>
          </div>
        )}
      </div>

      {/* Rate Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse" id="master-rate-table">
            <thead className="bg-[#2d3e50] text-white font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3 min-w-[200px]">Client / Institution Name *</th>
                <th className="p-3 min-w-[100px]">Branch</th>
                <th className="p-3 min-w-[100px]">City</th>
                <th className="p-3 min-w-[100px]">Product</th>
                <th className="p-3 min-w-[100px]">State</th>
                <th className="p-3 w-28 text-center bg-blue-900/40">Flat Rate ₹</th>
                <th className="p-3 w-28 text-center">Slab 1 Max KM</th>
                <th className="p-3 w-28 text-center">Slab 1 Rate ₹</th>
                <th className="p-3 w-28 text-center">Slab 2 Max KM</th>
                <th className="p-3 w-28 text-center">Slab 2 Rate ₹</th>
                <th className="p-3 w-28 text-center">Beyond Rate ₹</th>
                <th className="p-3 w-28 text-center">Site Visit ₹</th>
                {canEditRates && <th className="p-3 w-12 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRates.map((r, visibleIndex) => {
                const i = r.originalIndex;
                const isFlat = r.flat !== null && r.flat !== undefined;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{visibleIndex + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={r.client}
                        disabled={!canEditRates}
                        onChange={(e) => handleCellChange(i, 'client', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent font-bold text-[#2d3e50]"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={r.branch || ''}
                        disabled={!canEditRates}
                        placeholder="All Branches"
                        onChange={(e) => handleCellChange(i, 'branch', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent text-slate-600"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={r.city || ''}
                        disabled={!canEditRates}
                        placeholder="All Cities"
                        onChange={(e) => handleCellChange(i, 'city', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent text-slate-600"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={r.product || ''}
                        disabled={!canEditRates}
                        placeholder="All Products"
                        onChange={(e) => handleCellChange(i, 'product', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent text-slate-600"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={r.state || ''}
                        disabled={!canEditRates}
                        placeholder="All States"
                        onChange={(e) => handleCellChange(i, 'state', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent text-slate-600"
                      />
                    </td>
                    <td className="p-2 bg-blue-50/30">
                      <input
                        type="number"
                        value={r.flat ?? ''}
                        disabled={!canEditRates}
                        placeholder="e.g. 800"
                        onChange={(e) => handleCellChange(i, 'flat', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent font-bold text-blue-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.s1k ?? ''}
                        disabled={!canEditRates || isFlat}
                        placeholder="Max KM"
                        onChange={(e) => handleCellChange(i, 's1k', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent disabled:opacity-30"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.s1r ?? ''}
                        disabled={!canEditRates || isFlat}
                        placeholder="Rate ₹"
                        onChange={(e) => handleCellChange(i, 's1r', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent font-bold text-emerald-700 disabled:opacity-30"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.s2k ?? ''}
                        disabled={!canEditRates || isFlat}
                        placeholder="Max KM"
                        onChange={(e) => handleCellChange(i, 's2k', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent disabled:opacity-30"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.s2r ?? ''}
                        disabled={!canEditRates || isFlat}
                        placeholder="Rate ₹"
                        onChange={(e) => handleCellChange(i, 's2r', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent font-bold text-emerald-700 disabled:opacity-30"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.s3r ?? ''}
                        disabled={!canEditRates || isFlat}
                        placeholder="Beyond ₹"
                        onChange={(e) => handleCellChange(i, 's3r', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent font-bold text-emerald-800 disabled:opacity-30"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={r.other ?? ''}
                        disabled={!canEditRates}
                        placeholder="Other ₹"
                        onChange={(e) => handleCellChange(i, 'other', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-200 focus:border-[#eb8a23] focus:bg-white bg-transparent"
                      />
                    </td>
                    {canEditRates && (
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(i)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#2d3e50] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#eb8a23]" />
                Add New Client Rate Rule
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={newClientData.client || ''}
                  onChange={(e) => setNewClientData({ ...newClientData, client: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={newClientData.state || ''}
                    onChange={(e) => setNewClientData({ ...newClientData, state: e.target.value })}
                    placeholder="All States"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch</label>
                  <input
                    type="text"
                    value={newClientData.branch || ''}
                    onChange={(e) => setNewClientData({ ...newClientData, branch: e.target.value })}
                    placeholder="All Branches"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={newClientData.city || ''}
                    onChange={(e) => setNewClientData({ ...newClientData, city: e.target.value })}
                    placeholder="All Cities"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Product</label>
                  <input
                    type="text"
                    value={newClientData.product || ''}
                    onChange={(e) => setNewClientData({ ...newClientData, product: e.target.value })}
                    placeholder="All Products"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Rate Configuration</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2 md:col-span-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Flat Rate (₹)</label>
                    <input
                      type="number"
                      value={newClientData.flat ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, flat: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 800"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-400 bg-white"
                    />
                    <p className="text-[10px] text-blue-600 mt-1">If set, overrides all slabs.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Slab 1 Max KM</label>
                    <input
                      type="number"
                      value={newClientData.s1k ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, s1k: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 mb-1">Slab 1 Rate (₹)</label>
                    <input
                      type="number"
                      value={newClientData.s1r ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, s1r: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-400 bg-emerald-50/30"
                    />
                  </div>
                  <div className="hidden md:block"></div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Slab 2 Max KM</label>
                    <input
                      type="number"
                      value={newClientData.s2k ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, s2k: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 mb-1">Slab 2 Rate (₹)</label>
                    <input
                      type="number"
                      value={newClientData.s2r ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, s2r: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-400 bg-emerald-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 mb-1">Beyond Rate (₹)</label>
                    <input
                      type="number"
                      value={newClientData.s3r ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, s3r: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-800 focus:outline-none focus:border-emerald-400 bg-emerald-50/30"
                    />
                  </div>

                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Site / Other Visit Rate (₹)</label>
                    <input
                      type="number"
                      value={newClientData.other ?? ''}
                      onChange={(e) => setNewClientData({ ...newClientData, other: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#eb8a23]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewClient}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-[#eb8a23] text-white hover:bg-[#d97917] transition shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Client Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
