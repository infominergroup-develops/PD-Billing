import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ColumnMappingConfig, CaseRecord } from '../../types';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  ArrowRight,
  Database,
  Info,
} from 'lucide-react';
import { detectColumnNames, deduplicateRawRows } from '../../utils/billingEngine';
import { SAMPLE_CASES_RAW } from '../../constants/defaultData';

interface UploadSectionProps {
  onDataLoaded: (rawCases: Record<string, any>[], fileName: string, cols: ColumnMappingConfig) => void;
  onClearData: () => void;
  rawCount: number;
  uniqueCount: number;
  fileName?: string;
  onProceedToRates: () => void;
  samplePreviewCases: CaseRecord[];
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onDataLoaded,
  onClearData,
  rawCount,
  uniqueCount,
  fileName,
  onProceedToRates,
  samplePreviewCases,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFile = (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

        let ws: XLSX.WorkSheet | null = null;
        let sheetUsed = '';

        for (const sname of wb.SheetNames) {
          const candidate = wb.Sheets[sname];
          if (candidate && candidate['!ref'] && candidate['!ref'] !== 'A1') {
            ws = candidate;
            sheetUsed = sname;
            break;
          }
        }

        if (!ws && wb.SheetNames.length > 0) {
          ws = wb.Sheets[wb.SheetNames[0]];
          sheetUsed = wb.SheetNames[0];
        }

        if (!ws) {
          setErrorMessage('No valid spreadsheet data found in file.');
          setIsProcessing(false);
          return;
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: false, blankrows: true });

        if (!rows.length) {
          setErrorMessage('The uploaded file is empty (0 rows found).');
          setIsProcessing(false);
          return;
        }

        const cols = detectColumnNames(rows[0]);
        const deduplicated = deduplicateRawRows(rows, cols);

        onDataLoaded(deduplicated, file.name, cols);
        setIsProcessing(false);
      } catch (err: any) {
        console.error('File parse error:', err);
        setErrorMessage(`Error parsing file: ${err.message || 'Unknown format'}`);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const loadDemoData = () => {
    const cols = detectColumnNames(SAMPLE_CASES_RAW[0]);
    const deduplicated = deduplicateRawRows(SAMPLE_CASES_RAW, cols);
    onDataLoaded(deduplicated, 'Demo_MC_Verification_Report_2026.xlsx', cols);
  };

  const hasData = uniqueCount > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200" id="upload-section-container">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
                1
              </span>
              <h1 className="text-xl font-black text-[#2d3e50]">Upload Case Data (MC Report)</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Upload your activity-level MC Report Excel workbook (.xlsx/.xls). The engine will automatically prepare billing calculations and map your cases based on KM values and Client data.
            </p>
          </div>

          <button
            onClick={loadDemoData}
            className="inline-flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-[#eb8a23] border border-orange-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
            id="load-sample-in-upload-btn"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Sample Data</span>
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-6 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            hasData
              ? 'border-emerald-400 bg-emerald-50/40'
              : isDragging
              ? 'border-[#eb8a23] bg-orange-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-[#2d3e50] bg-slate-50/60 hover:bg-white'
          }`}
          id="upload-dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <div className="flex flex-col items-center">
            {hasData ? (
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-[#2d3e50] flex items-center justify-center mb-3 group-hover:bg-orange-100 transition">
                <Upload className="w-7 h-7 text-[#2d3e50]" />
              </div>
            )}

            <h3 className="text-sm font-bold text-[#2d3e50]">
              {hasData ? fileName || 'Dataset Loaded Successfully' : 'Click to select Excel file or drag & drop here'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports .xlsx, .xls, .csv formats (Activity level MC reports)
            </p>

            {hasData && (
              <div className="mt-3 inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-emerald-300 text-xs font-semibold text-emerald-800 shadow-xs">
                <Database className="w-3.5 h-3.5" />
                <span>{uniqueCount.toLocaleString('en-IN')} unique cases ready for rate mapping</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Status Alerts & Actions */}
        {hasData && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Data is securely cached in local storage for your session.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearData}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition cursor-pointer font-semibold"
                id="clear-dataset-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Stored Data</span>
              </button>

              <button
                onClick={onProceedToRates}
                className="inline-flex items-center gap-1.5 bg-[#eb8a23] hover:bg-[#d97917] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition cursor-pointer"
                id="proceed-to-rates-btn"
              >
                <span>Step 2: Master Rate Sheet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Preview Table */}
      {hasData && samplePreviewCases.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-[#2d3e50] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#eb8a23]" />
                Dataset Ingestion Preview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing sample rows after deduplication and column detection
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              First {Math.min(10, samplePreviewCases.length)} rows
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#2d3e50] text-white font-bold sticky top-0">
                <tr>
                  <th className="p-2.5 whitespace-nowrap">Client Application Number</th>
                  <th className="p-2.5 whitespace-nowrap">Client Name</th>
                  <th className="p-2.5 whitespace-nowrap">Applicant</th>
                  <th className="p-2.5 whitespace-nowrap">City</th>
                  <th className="p-2.5 whitespace-nowrap">State</th>
                  <th className="p-2.5 whitespace-nowrap">Product</th>
                  <th className="p-2.5 whitespace-nowrap">Billing KM</th>
                  <th className="p-2.5 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {samplePreviewCases.slice(0, 10).map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-slate-50/80">
                    <td className="p-2.5 font-mono text-[#2d3e50] font-bold">{c.clientApplicationNumber}</td>
                    <td className="p-2.5 text-slate-800">{c.clientDb}</td>
                    <td className="p-2.5 text-slate-700">{c.applicantName}</td>
                    <td className="p-2.5 text-slate-600">{c.city || '—'}</td>
                    <td className="p-2.5 text-slate-600">{c.state || '—'}</td>
                    <td className="p-2.5 text-slate-600">{c.product || '—'}</td>
                    <td className="p-2.5 font-bold text-[#eb8a23]">{c.kmUsedForBilling ?? '—'}</td>
                    <td className="p-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {c.caseStatus || 'Loaded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
