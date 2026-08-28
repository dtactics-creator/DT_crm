import { useRef } from 'react';
import type { Quotation, QuotationVersion } from '../../types';
import Button from '../ui/Button';
import { Download, Edit2, Share2, Mail } from 'lucide-react';
import TemplateRenderer from './templates/TemplateRenderer';
import Modal from '../ui/Modal';

export default function QuotationPreview({ 
  quotation, 
  version, 
  onClose,
  onEdit
}: { 
  quotation: Quotation; 
  version: QuotationVersion;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // A simple approach is to invoke window.print() and use print CSS to hide everything except the preview.
    window.print();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${quotation.status === 'Draft' ? 'DRAFT' : quotation.quotation_no} - Version ${version.version_number} (${version.template === 'aurora' ? 'IT Software' : 'Logistics Freight'})`}
      size="max-w-5xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {onEdit && (
            <Button variant="secondary" onClick={onEdit} icon={<Edit2 className="h-4 w-4" />}>
              Edit
            </Button>
          )}
          <Button variant="secondary" icon={<Share2 className="h-4 w-4" />}>
            Share Link
          </Button>
          <Button variant="secondary" icon={<Mail className="h-4 w-4" />}>
            Email PDF
          </Button>
          <Button onClick={handlePrint} icon={<Download className="h-4 w-4" />}>
            Download PDF
          </Button>
        </div>
      }
    >
      <div className="flex justify-center p-4 sm:p-8 bg-gray-100/50 print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
        <div 
          ref={printRef}
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-gray-900 shadow-lg print:shadow-none relative isolate origin-top transform-gpu"
        >
          <TemplateRenderer quotation={quotation} version={version} />
        </div>
      </div>
    </Modal>
  );
}
