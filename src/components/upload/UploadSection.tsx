import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ColumnMappingConfig, CaseRecord, DashboardStats } from '../../types';
import { PageHeader, btn } from '../common/ui';
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
  Loader2,
} from 'lucide-react';
import { detectColumnNames } from '../../utils/billingEngine';
import type { ImportSummary } from '../../utils/excelParser';
import { parseWorkbookAsync } from '../../utils/parseWorkbookAsync';
import { ACCEPT_ATTR, validateFileSignature, validateUploadMeta } from '../../utils/uploadValidation';
import { SAMPLE_CASES_RAW } from '../../constants/defaultData';
import { RawExcelViewer } from './RawExcelViewer';

interface UploadSectionProps {
  onDataLoaded: (
    rawCases: Record<string, any>[],
    fileName: string,
    cols: ColumnMappingConfig,
    summary: ImportSummary | null
  ) => void;
  onClearData: () => void;
  rawCount: number;
  stats: DashboardStats;
  importSummary: ImportSummary | null;
  fileName?: string;
  onProceedToRates: () => void;
  samplePreviewCases: CaseRecord[];
  rawCases: Record<string, any>[];
  onRawDataEdit: (updatedCases: Record<string, any>[]) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onDataLoaded,
  onClearData,
  rawCount,
  stats,
  importSummary,
  fileName,
  onProceedToRates,
  samplePreviewCases,
  rawCases,
  onRawDataEdit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'reading' | 'parsing'>('idle');
  const [readProgress, setReadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Kept in memory (not persisted) so another sheet can be picked without re-uploading.
  const bufferRef = useRef<{ buffer: ArrayBuffer; fileName: string } | null>(null);
  const isProcessing = stage !== 'idle';

  const parseBuffer = async (buffer: ArrayBuffer, name: string, sheetName?: string) => {
    setStage('parsing');
    setErrorMessage(null);
    try {
      const parsed = await parseWorkbookAsync(buffer, { sheetName });
      if (!parsed.rows.length) {
        const s = parsed.stats;
        setErrorMessage(
          s.headerRowNumber
            ? `Sheet "${s.sheetName}" has a header on row ${s.headerRowNumber} but no data rows below it.`
            : `Sheet "${s.sheetName}" is empty.`
        );
        return;
      }
      const cols = detectColumnNames(parsed.columns);
      onDataLoaded(parsed.rows, name, cols, { ...parsed.stats, fileName: name, sheets: parsed.sheets });
    } catch (err: any) {
      console.error('File parse error:', err);
      setErrorMessage(`Could not read this file: ${err.message || 'unknown format'}`);
    } finally {
      setStage('idle');
    }
  };

  const processFile = (file: File) => {
    const metaError = validateUploadMeta(file);
    if (metaError) {
      setErrorMessage(metaError);
      return;
    }
    setStage('reading');
    setReadProgress(0);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) setReadProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const sigError = validateFileSignature(file.name, buffer);
      if (sigError) {
        setErrorMessage(sigError);
        setStage('idle');
        return;
      }
      bufferRef.current = { buffer, fileName: file.name };
      parseBuffer(buffer, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
      setStage('idle');
    };
    reader.readAsArrayBuffer(file);
  };

  const switchSheet = (sheetName: string) => {
    if (bufferRef.current) parseBuffer(bufferRef.current.buffer, bufferRef.current.fileName, sheetName);
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
    if (e.dataTransfer.files.length > 1) {
      setErrorMessage('Drop one file at a time.');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const loadDemoData = () => {
    bufferRef.current = null;
    const cols = detectColumnNames(SAMPLE_CASES_RAW[0]);
    onDataLoaded(SAMPLE_CASES_RAW, 'Demo_MC_Verification_Report_2026.xlsx', cols, null);
  };

  const hasData = rawCount > 0;

  return (
    <div className="space-y-6" id="upload-section-container">
      <PageHeader
        eyebrow="Step 1"
        title="Upload MC report"
        description="Activity-level MC report — every non-blank, non-deleted row is counted as one case."
        actions={
          <button onClick={loadDemoData} className={btn.secondary} id="load-sample-in-upload-btn">
            <Sparkles className="h-4 w-4 text-brand-500" />
            Load sample data
          </button>
        }
      />

      <section className="card p-5 sm:p-6">
        {/* Dropzone */}
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Upload an Excel or CSV file"
          aria-busy={isProcessing}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          animate={{ scale: isDragging ? 1.01 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`group relative overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200 ${
            isDragging
              ? 'border-brand-500 bg-brand-50/70'
              : hasData
              ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400'
              : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-white'
          } ${isProcessing ? 'cursor-progress' : 'cursor-pointer'}`}
          id="upload-dropzone"
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ACCEPT_ATTR} className="hidden" />

          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isProcessing ? 'busy' : hasData ? 'done' : isDragging ? 'drag' : 'idle'}
                initial={{ opacity: 0, scale: 0.8, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ${
                  hasData && !isProcessing
                    ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                    : 'bg-white text-brand-500 ring-slate-200 group-hover:-translate-y-0.5 transition-transform'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : hasData ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : (
                  <Upload className={`h-6 w-6 ${isDragging ? 'animate-bounce' : ''}`} />
                )}
              </motion.div>
            </AnimatePresence>

            <h3 className="text-base font-semibold text-ink-900">
              {stage === 'reading'
                ? `Reading file… ${readProgress}%`
                : stage === 'parsing'
                ? 'Parsing workbook…'
                : isDragging
                ? 'Drop to upload'
                : hasData
                ? fileName || 'Dataset loaded'
                : (
                  <>
                    <span className="text-brand-600">Choose a file</span> or drag it here
                  </>
                )}
            </h3>

            {stage === 'reading' && (
              <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-brand-500"
                  animate={{ width: `${readProgress}%` }}
                  transition={{ ease: 'linear', duration: 0.15 }}
                />
              </div>
            )}
            {stage === 'parsing' && <div className="skeleton mt-3 h-1.5 w-56 rounded-full" />}

            <p className="mt-2 text-xs text-slate-500">
              {hasData && !isProcessing ? 'Drop another file to replace it · ' : ''}.xlsx, .xls or .csv · up to 20 MB
            </p>

            {hasData && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-xs ring-1 ring-emerald-200"
              >
                <Database className="h-3.5 w-3.5" />
                {stats.totalCases.toLocaleString('en-IN')} cases counted for billing
              </motion.div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasData && (
          <ImportBreakdown
            summary={importSummary}
            rawCount={rawCount}
            stats={stats}
            canSwitchSheet={!!bufferRef.current && !isProcessing}
            onSwitchSheet={switchSheet}
          />
        )}

        {hasData && (
          <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Saved in this browser and synced to the server for your session.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClearData}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                id="clear-dataset-btn"
              >
                <Trash2 className="h-4 w-4" />
                Clear data
              </button>
              <button onClick={onProceedToRates} className={`${btn.primary} group`} id="proceed-to-rates-btn">
                Continue to rate sheet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Raw Excel Data Viewer */}
      {hasData && rawCases.length > 0 && (
        <RawExcelViewer 
          rawCases={rawCases} 
          fileName={fileName} 
          onRawDataEdit={onRawDataEdit}
        />
      )}
    </div>
  );
};

const fmt = (n: number) => n.toLocaleString('en-IN');

const BreakdownRow: React.FC<{ label: string; value: string; tone?: 'muted' | 'total' }> = ({ label, value, tone }) => (
  <div
    className={`flex items-center justify-between py-1.5 ${
      tone === 'total' ? 'border-t border-slate-200 font-bold text-ink' : tone === 'muted' ? 'text-slate-500' : 'text-slate-700'
    }`}
  >
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/** Shows exactly how the uploaded rows became the counted cases, so every number can be checked. */
const ImportBreakdown: React.FC<{
  summary: ImportSummary | null;
  rawCount: number;
  stats: DashboardStats;
  canSwitchSheet: boolean;
  onSwitchSheet: (name: string) => void;
}> = ({ summary, rawCount, stats, canSwitchSheet, onSwitchSheet }) => (
  <div className="mt-6 grid gap-4 text-xs md:grid-cols-2">
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <h4 className="mb-2 text-sm font-semibold text-ink-900">How rows were counted</h4>
      {summary ? (
        <>
          <BreakdownRow label="Rows below the header" value={fmt(summary.scannedRows)} />
          <BreakdownRow label="− Blank rows skipped" value={fmt(summary.blankRows)} tone="muted" />
          {summary.repeatedHeaderRows > 0 && (
            <BreakdownRow label="− Repeated header rows skipped" value={fmt(summary.repeatedHeaderRows)} tone="muted" />
          )}
          <BreakdownRow label="= Rows imported" value={fmt(summary.dataRows)} tone="total" />
          {rawCount !== summary.dataRows && (
            <BreakdownRow label="Rows now (after manual adds/deletes)" value={fmt(rawCount)} tone="muted" />
          )}
        </>
      ) : (
        <BreakdownRow label="Rows loaded" value={fmt(rawCount)} />
      )}
      <BreakdownRow label="− Rows with a deletion date" value={fmt(stats.deletedRows)} tone="muted" />
      <BreakdownRow label="= Cases counted" value={fmt(stats.totalCases)} tone="total" />
    </div>

    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <h4 className="mb-2 text-sm font-semibold text-ink-900">Cases counted</h4>
      <BreakdownRow label="Billable" value={fmt(stats.billableCases)} />
      <BreakdownRow label="Exceptions (no rate / KM)" value={fmt(stats.exceptionCases)} />
      <BreakdownRow label="Cancelled – not billed" value={fmt(stats.cancelledCases)} />
      <BreakdownRow
        label="Total billing"
        value={`₹${stats.totalBillingAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
        tone="total"
      />
      {summary && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-slate-500">
          <span>Sheet</span>
          {summary.sheets.length > 1 ? (
            <select
              value={summary.sheetName}
              disabled={!canSwitchSheet}
              onChange={(e) => onSwitchSheet(e.target.value)}
              title={canSwitchSheet ? 'Read a different sheet' : 'Re-upload the file to switch sheets'}
              className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 disabled:opacity-60"
            >
              {summary.sheets.map((sh) => (
                <option key={sh.name} value={sh.name}>
                  {sh.name} ({fmt(sh.dataRows)} rows)
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-slate-700">{summary.sheetName}</span>
          )}
          <span>· header on row {summary.headerRowNumber}</span>
        </div>
      )}
    </div>
  </div>
);
