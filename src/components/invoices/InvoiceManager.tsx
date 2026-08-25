import React, { useState } from 'react';
import { CaseRecord, Invoice, CompanyProfile, InvoiceItem } from '../../types';
import { InfominerLogo } from '../common/InfominerLogo';
import { useAuth } from '../../context/AuthContext';
import {
  Receipt,
  Printer,
  Download,
  Plus,
  Building,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  Trash2,
  Send,
  Sparkles,
} from 'lucide-react';

interface InvoiceManagerProps {
  cases: CaseRecord[];
  invoices: Invoice[];
  companyProfile: CompanyProfile;
  onSaveInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
}

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({
  cases,
  invoices,
  companyProfile,
  onSaveInvoice,
  onDeleteInvoice,
}) => {
  const { user } = useAuth();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedClientForNew, setSelectedClientForNew] = useState<string>('');
  const [selectedBranchForNew, setSelectedBranchForNew] = useState<string>('');
  const [taxType, setTaxType] = useState<'IGST' | 'CGST_SGST'>('CGST_SGST');
  const [poNumber, setPoNumber] = useState<string>('');

  const billableCases = cases.filter((c) => c.isBillable);

  // Group unique clients from billable cases
  const uniqueBillableClients = Array.from(
    new Set(billableCases.map((c) => c.clientDb).filter(Boolean))
  ).sort();

  const availableBranchesForClient = Array.from(
    new Set(billableCases.filter(c => c.clientDb === selectedClientForNew).map(c => c.branch).filter(Boolean))
  ).sort();

  const handleGenerateInvoice = (clientName: string) => {
    let clientCases = billableCases.filter((c) => c.clientDb === clientName);
    if (selectedBranchForNew) {
      clientCases = clientCases.filter((c) => c.branch === selectedBranchForNew);
    }
    
    if (!clientCases.length) {
      alert(`No billable cases found for ${clientName}${selectedBranchForNew ? ` at branch ${selectedBranchForNew}` : ''}`);
      return;
    }

    const items: InvoiceItem[] = clientCases.map((c) => ({
      clientApplicationNumber: c.clientApplicationNumber,
      applicantName: c.applicantName,
      branch: c.branch,
      city: c.city,
      activityType: c.activityType,
      km: c.kmUsedForBilling,
      slab: c.slabApplied,
      rate: c.billingRate,
      amount: c.billingAmt,
    }));

    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);

    let cgstRate = 0,
      cgstAmount = 0,
      sgstRate = 0,
      sgstAmount = 0,
      igstRate = 0,
      igstAmount = 0;

    if (taxType === 'CGST_SGST') {
      cgstRate = 9;
      cgstAmount = Math.round(subTotal * 0.09);
      sgstRate = 9;
      sgstAmount = Math.round(subTotal * 0.09);
    } else {
      igstRate = 18;
      igstAmount = Math.round(subTotal * 0.18);
    }

    const grandTotal = subTotal + cgstAmount + sgstAmount + igstAmount;

    const seq = (invoices.length + 1).toString().padStart(4, '0');
    const invoiceNumber = `${companyProfile.invoicePrefix}${seq}`;

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      clientName,
      clientBillingName: clientName,
      clientState: clientCases[0]?.state || 'Delhi NCR',
      poNumber: poNumber || `PO-${Math.floor(100000 + Math.random() * 900000)}`,
      items,
      subTotal,
      taxType,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      grandTotal,
      status: 'Generated',
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Admin',
    };

    onSaveInvoice(newInvoice);
    setSelectedInvoice(newInvoice);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full mx-auto animate-in fade-in duration-200" id="invoices-container">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
                6
              </span>
              <h1 className="text-xl font-black text-[#2d3e50]">GST Tax Invoice Generator</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Generate branded tax invoices with company logo, GST calculations (CGST/SGST/IGST), bank credentials, and case-level annexures.
            </p>
          </div>

          {/* Quick Invoice Creator */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <select
              value={selectedClientForNew}
              onChange={(e) => {
                setSelectedClientForNew(e.target.value);
                setSelectedBranchForNew(''); // reset branch when client changes
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-[#eb8a23]"
            >
              <option value="">— Select Client for Invoice —</option>
              {uniqueBillableClients.map((c) => (
                <option key={c} value={c}>
                  {c} ({billableCases.filter((bc) => bc.clientDb === c).length} cases)
                </option>
              ))}
            </select>

            {selectedClientForNew && availableBranchesForClient.length > 0 && (
              <select
                value={selectedBranchForNew}
                onChange={(e) => setSelectedBranchForNew(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-[#eb8a23]"
              >
                <option value="">All Branches</option>
                {availableBranchesForClient.map((b) => (
                  <option key={b} value={b}>
                    {b} ({billableCases.filter((bc) => bc.clientDb === selectedClientForNew && bc.branch === b).length} cases)
                  </option>
                ))}
              </select>
            )}

            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
            >
              <option value="CGST_SGST">CGST + SGST (18%)</option>
              <option value="IGST">IGST (18%)</option>
            </select>

            <button
              onClick={() => selectedClientForNew && handleGenerateInvoice(selectedClientForNew)}
              disabled={!selectedClientForNew}
              className="inline-flex items-center gap-1.5 bg-[#eb8a23] hover:bg-[#d97917] disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed shadow"
              id="create-invoice-btn"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Saved Invoices List + Live Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices List Sidebar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#2d3e50] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#eb8a23]" />
              Generated Invoices ({invoices.length})
            </h2>
          </div>

          <div className="mt-4 space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No invoices generated yet. Select a client from the dropdown above to create one.
              </div>
            ) : (
              invoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id;
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-[#eb8a23] bg-orange-50/40 shadow-xs'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#2d3e50]">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {inv.status}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-slate-800 mt-1 truncate">
                      {inv.clientName}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">{inv.items.length} cases</span>
                      <span className="font-black text-[#2d3e50]">
                        ₹{inv.grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Invoice Viewer / Printable Paper */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#2d3e50]">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 font-medium">
                    {selectedInvoice.clientName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 bg-[#2d3e50] hover:bg-[#1e293b] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow"
                    id="print-invoice-btn"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#eb8a23]" />
                    <span>Print / Save PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Delete this invoice?')) {
                        onDeleteInvoice(selectedInvoice.id);
                        setSelectedInvoice(null);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Page Canvas */}
              <div
                className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:rounded-none"
                id="printable-tax-invoice"
              >
                {/* Header with Infominer Logo */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-[#2d3e50]">
                  <div>
                    <InfominerLogo size="lg" variant="dark" showTagline />
                    <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-800">{companyProfile.name}</p>
                      <p>{companyProfile.addressLine1}</p>
                      <p>{companyProfile.addressLine2}, {companyProfile.city} - {companyProfile.pincode}</p>
                      <p><strong>GSTIN:</strong> {companyProfile.gstin} | <strong>PAN:</strong> {companyProfile.pan}</p>
                      <p><strong>Email:</strong> {companyProfile.email} | <strong>Phone:</strong> {companyProfile.phone}</p>
                    </div>
                  </div>

                  <div className="text-right sm:self-start">
                    <span className="inline-block px-3 py-1 rounded bg-[#2d3e50] text-white text-xs font-black tracking-widest uppercase">
                      TAX INVOICE
                    </span>
                    <div className="mt-3 text-xs space-y-1">
                      <div>
                        <span className="text-slate-500 font-semibold">Invoice No:</span>{' '}
                        <span className="font-mono font-bold text-[#2d3e50]">{selectedInvoice.invoiceNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Invoice Date:</span>{' '}
                        <span className="font-bold text-slate-800">{selectedInvoice.date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Due Date:</span>{' '}
                        <span className="font-bold text-slate-800">{selectedInvoice.dueDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">PO Reference:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">{selectedInvoice.poNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billed To Details */}
                <div className="grid grid-cols-2 gap-6 my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Billed To Client
                    </span>
                    <div className="font-black text-sm text-[#2d3e50]">{selectedInvoice.clientName}</div>
                    <div className="text-slate-600 mt-1 space-y-0.5">
                      <p>Branch / Operational Division: Regional Operations</p>
                      <p>Place of Supply: {selectedInvoice.clientState || 'Delhi / NCR'}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Service Description
                    </span>
                    <div className="font-bold text-slate-800">
                      Personal Discussion (PD) &amp; Field Verification Services
                    </div>
                    <p className="text-slate-600 mt-1">
                      SAC Code: 998311 (Management &amp; Consulting Verification Services)
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#2d3e50] text-white font-bold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Client Application Number</th>
                        <th className="p-2.5">Applicant Name</th>
                        <th className="p-2.5">Branch / City</th>
                        <th className="p-2.5 text-center">KM Slab</th>
                        <th className="p-2.5 text-right">Rate (₹)</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-[#2d3e50]">{item.clientApplicationNumber}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{item.applicantName}</td>
                          <td className="p-2.5 text-slate-600">{item.branch} ({item.city || '—'})</td>
                          <td className="p-2.5 text-center font-bold text-[#eb8a23]">{item.slab}</td>
                          <td className="p-2.5 text-right font-medium">₹{item.rate.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-bold text-[#2d3e50]">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Totals */}
                <div className="mt-6 pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
                  <div className="max-w-xs text-xs text-slate-600 space-y-1.5">
                    <span className="font-bold text-[#2d3e50] block mb-1">Bank Payment Details:</span>
                    <p><strong>Bank:</strong> {companyProfile.bankName}</p>
                    <p><strong>A/C No:</strong> <span className="font-mono">{companyProfile.bankAccountNo}</span></p>
                    <p><strong>IFSC:</strong> <span className="font-mono">{companyProfile.bankIfsc}</span></p>
                    <p><strong>Branch:</strong> {companyProfile.bankBranch}</p>
                  </div>

                  <div className="w-full sm:w-72 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Subtotal ({selectedInvoice.items.length} cases):</span>
                      <span className="font-bold text-slate-800">₹{selectedInvoice.subTotal.toLocaleString('en-IN')}</span>
                    </div>

                    {selectedInvoice.taxType === 'CGST_SGST' ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-600">CGST ({selectedInvoice.cgstRate}%):</span>
                          <span className="font-medium text-slate-700">₹{selectedInvoice.cgstAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-600">SGST ({selectedInvoice.sgstRate}%):</span>
                          <span className="font-medium text-slate-700">₹{selectedInvoice.sgstAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">IGST ({selectedInvoice.igstRate}%):</span>
                        <span className="font-medium text-slate-700">₹{selectedInvoice.igstAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-2 border-t-2 border-[#2d3e50] text-sm font-black text-[#2d3e50]">
                      <span>Grand Total:</span>
                      <span className="text-[#eb8a23]">₹{selectedInvoice.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Signatory Footer */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                  <div>
                    <p className="font-semibold text-slate-700">Thank you for your business!</p>
                    <p className="text-[10px] mt-0.5">This is a computer-generated tax invoice verified by Infominer Platform.</p>
                  </div>

                  <div className="text-right">
                    <div className="w-36 h-12 border-b border-slate-400 mb-1 ml-auto flex items-end justify-center pb-1">
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">DIGITALLY SIGNED</span>
                    </div>
                    <p className="font-bold text-slate-800">For {companyProfile.name}</p>
                    <p className="text-[10px]">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#2d3e50]">No Invoice Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select an existing invoice from the left panel or generate a new invoice using the client dropdown above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
