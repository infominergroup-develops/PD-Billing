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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCellChange = (
    index: number,
    field: keyof RateRule,
    value: string
  ) => {
    const updated = [...rates];
    const item = { ...updated[index] };

    if (field === 'client' || field === 'state') {
      item[field] = value;
    } else {
      const num = value.trim() === '' ? null : Number(value);
      (item as any)[field] = isNaN(num as any) ? null : num;
    }

    updated[index] = item;
    onUpdateRates(updated);
  };

  const handleAddRow = () => {
    const newId = Math.max(...rates.map((r) => r.id), 0) + 1;
    const newRow: RateRule = {
      id: newId,
      client: 'New Financial Institution',
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
    };
    onUpdateRates([...rates, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    if (!window.confirm('Delete this rate configuration row?')) return;
    const updated = rates.filter((_, i) => i !== index);
    onUpdateRates(updated);
  };

  const handleExportRates = () => {
    const data = rates.map((r) => ({
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

        const importedRates: RateRule[] = rows.map((r, idx) => ({
          id: idx + 1,
          client: String(r['Client Name'] || r['client'] || '').trim(),
          state: r['State'] === 'All' ? '' : String(r['State'] || r['state'] || '').trim(),
          branch: r['Branch'] === 'All' ? '' : String(r['Branch'] || r['branch'] || '').trim(),
          city: r['City'] === 'All' ? '' : String(r['City'] || r['city'] || '').trim(),
          product: r['Product'] === 'All' ? '' : String(r['Product'] || r['product'] || '').trim(),
          flat: r['Flat Rate (₹)'] !== null && r['Flat Rate (₹)'] !== '' ? Number(r['Flat Rate (₹)']) : null,
          s1k: r['Slab 1 Max KM'] !== null && r['Slab 1 Max KM'] !== '' ? Number(r['Slab 1 Max KM']) : null,
          s1r: r['Slab 1 Rate (₹)'] !== null && r['Slab 1 Rate (₹)'] !== '' ? Number(r['Slab 1 Rate (₹)']) : null,
          s2k: r['Slab 2 Max KM'] !== null && r['Slab 2 Max KM'] !== '' ? Number(r['Slab 2 Max KM']) : null,
          s2r: r['Slab 2 Rate (₹)'] !== null && r['Slab 2 Rate (₹)'] !== '' ? Number(r['Slab 2 Rate (₹)']) : null,
          s3r: r['Beyond Slab 2 Rate (₹)'] !== null && r['Beyond Slab 2 Rate (₹)'] !== '' ? Number(r['Beyond Slab 2 Rate (₹)']) : null,
          other: r['Site/Other Visit Rate (₹)'] !== null && r['Site/Other Visit Rate (₹)'] !== '' ? Number(r['Site/Other Visit Rate (₹)']) : null,
        }));

        if (importedRates.length) {
          onUpdateRates(importedRates);
          alert(`Successfully imported ${importedRates.length} master rate rules.`);
        }
      } catch (err: any) {
        alert(`Failed to import rate sheet: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filteredRates = rates
    .map((r, idx) => ({ ...r, originalIndex: idx }))
    .filter(
      (r) =>
        r.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.state && r.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.branch && r.branch.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.city && r.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.product && r.product.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200" id="master-rates-container">
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
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bank / NBFC or state..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#eb8a23]"
            />
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
              {filteredRates.map((r) => {
                const i = r.originalIndex;
                const isFlat = r.flat !== null && r.flat !== undefined;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
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
    </div>
  );
};
