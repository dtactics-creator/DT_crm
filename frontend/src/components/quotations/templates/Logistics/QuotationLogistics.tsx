import { useRef } from 'react';
import type { Quotation, QuotationVersion } from '../../../../types';
import Button from '../../../ui/Button';
import { Download, Edit2, X, Share2, Mail, FileText } from 'lucide-react';
import { formatDate } from '../../../../lib/utils';
import { useChangeQuotationStatus } from '../../../../hooks/useQuotations';

export default function QuotationPreview({ quotation, version, onClose, onEdit }: {
  quotation: Quotation;
  version: QuotationVersion;
  onClose: () => void;
  onEdit: () => void;
}) {
  const changeStatus = useChangeQuotationStatus();
  
  const handlePrint = () => {
    window.print();
  };

  const handleSend = async () => {
    if (quotation.status === 'Draft') {
      await changeStatus.mutateAsync({ id: quotation.id, status: 'Sent' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col pt-[5vh] pb-0 sm:pb-[5vh] items-center overflow-y-auto print:bg-white print:p-0 print:block">
      {/* Action Bar (Hidden when printing) */}
      <div className="sticky top-0 z-10 w-full max-w-4xl bg-surface border-b border-app p-4 flex items-center justify-between shadow-lg rounded-t-2xl sm:mb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {quotation.status === 'Draft' && (
            <Button variant="secondary" icon={<Edit2 className="h-4 w-4" />} onClick={onEdit}>Edit</Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handlePrint}>Download PDF</Button>
          {quotation.status !== 'Accepted' && quotation.status !== 'Rejected' && (
            <Button icon={<Mail className="h-4 w-4" />} onClick={handleSend} loading={changeStatus.isPending}>
              Mark as Sent
            </Button>
          )}
        </div>
      </div>

      {/* A4 Paper Container */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-10 sm:p-14 shadow-2xl rounded-b-2xl sm:rounded-2xl print:shadow-none print:rounded-none print:w-auto print:min-h-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-brand-600 tracking-tight mb-2">QUOTATION</h1>
            <p className="text-gray-500 font-medium">Ref: {quotation.quotation_no} / V{version.version_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">DT_CRM Inc.</h2>
            <p className="text-gray-500 mt-1">123 Business Avenue</p>
            <p className="text-gray-500">Tech City, TC 12345</p>
            <p className="text-gray-500 mt-1">contact@dtactics.io</p>
          </div>
        </div>

        {/* Customer & Quote Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Quotation For</p>
            <p className="font-bold text-gray-800 text-lg">{version.customer_name || quotation.lead?.customer_name}</p>
            {(version.company || quotation.lead?.company) && <p className="text-gray-600">{version.company || quotation.lead?.company}</p>}
            {version.address && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{version.address}</p>}
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              {version.primary_phone && <p>📞 {version.primary_phone}</p>}
              {version.primary_email && <p>✉️ {version.primary_email}</p>}
            </div>
          </div>
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-sm grid grid-cols-2 gap-y-2">
            <span className="text-gray-500 font-medium">Date:</span>
            <span className="font-semibold text-gray-800 text-right">{formatDate(version.date || '')}</span>
            <span className="text-gray-500 font-medium">Valid Until:</span>
            <span className="font-semibold text-gray-800 text-right">{formatDate(version.valid_until || '')}</span>
            <span className="text-gray-500 font-medium">Enquiry No:</span>
            <span className="font-semibold text-gray-800 text-right">{version.enquiry_no || '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8 bg-gray-50 p-5 rounded-lg border border-gray-100 text-sm">
           <div>
             <span className="block text-gray-500 font-medium mb-1">Department</span>
             <span className="font-semibold text-gray-800">{version.department || '—'}</span>
           </div>
           <div>
             <span className="block text-gray-500 font-medium mb-1">Service Type</span>
             <span className="font-semibold text-gray-800">{version.service_type || '—'}</span>
           </div>
           <div>
             <span className="block text-gray-500 font-medium mb-1">From Location</span>
             <span className="font-semibold text-gray-800">{version.from_location || '—'}</span>
           </div>
           <div>
             <span className="block text-gray-500 font-medium mb-1">To Location</span>
             <span className="font-semibold text-gray-800">{version.to_location || '—'}</span>
           </div>
        </div>

        {/* Service Areas & Charges */}
        <div className="mb-12 space-y-8">
          {version.service_areas?.map((area: any, idx: number) => (
             <div key={area.id || idx} className="border border-gray-200 rounded-lg overflow-hidden">
               <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b border-gray-200">
                 <h3 className="font-bold text-gray-800">{area.name}</h3>
                 {area.location && <span className="text-sm text-gray-500">{area.location}</span>}
               </div>
               {area.remarks && (
                 <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-b border-gray-200 italic">
                   {area.remarks}
                 </div>
               )}
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-200 bg-white">
                     <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase">Charge Description</th>
                     <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase text-center">Basis</th>
                     <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase text-center">Currency</th>
                     <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {area.charges?.map((charge: any, cIdx: number) => (
                     <tr key={charge.id || cIdx} className="bg-white">
                       <td className="py-3 px-4 font-medium text-gray-800">{charge.charge_name}</td>
                       <td className="py-3 px-4 text-gray-600 text-center">{charge.basis || '—'}</td>
                       <td className="py-3 px-4 text-gray-600 text-center">{charge.currency}</td>
                       <td className="py-3 px-4 text-right tabular-nums text-gray-800">{Number(charge.rate).toFixed(2)}</td>
                     </tr>
                   ))}
                   {(!area.charges || area.charges.length === 0) && (
                     <tr>
                       <td colSpan={4} className="py-4 text-center text-sm text-gray-400">No charges listed</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          ))}
        </div>

        {/* Totals & Notes */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            {version.payment_terms && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Payment Terms</p>
                <p className="text-sm text-gray-700">{version.payment_terms}</p>
              </div>
            )}
            {version.notes && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{version.notes}</p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex justify-between mb-3 text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span className="text-gray-800 tabular-nums">{Number(version.subtotal).toFixed(2)}</span>
            </div>
            {Number(version.discount) > 0 && (
              <div className="flex justify-between mb-3 text-sm">
                <span className="text-gray-500">Discount:</span>
                <span className="text-red-500 tabular-nums">-{Number(version.discount).toFixed(2)}</span>
              </div>
            )}
            {Number(version.tax) > 0 && (
              <div className="flex justify-between mb-4 text-sm">
                <span className="text-gray-500">Tax:</span>
                <span className="text-gray-800 tabular-nums">+{Number(version.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-4 mt-4">
              <span className="font-bold text-gray-800 text-lg">Grand Total:</span>
              <span className="font-extrabold text-brand-600 text-xl tabular-nums">{version.currency} {Number(version.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {version.terms && (
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Terms & Conditions</p>
            <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">{version.terms}</p>
          </div>
        )}

        {/* Signature */}
        <div className="mt-20 pt-10 border-t border-gray-200 flex justify-between items-end break-inside-avoid">
          <div className="w-64 text-center">
            <div className="border-b border-gray-300 mb-2 h-16"></div>
            <p className="text-sm font-semibold text-gray-700">Authorized Signature</p>
            <p className="text-xs text-gray-500">DT_CRM Inc.</p>
          </div>
          <div className="w-64 text-center">
            <div className="border-b border-gray-300 mb-2 h-16"></div>
            <p className="text-sm font-semibold text-gray-700">Client Acceptance</p>
            <p className="text-xs text-gray-500">Date & Signature</p>
          </div>
        </div>

      </div>
    </div>
  );
}
