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
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!previewContainerRef.current) return;
    
    const node = previewContainerRef.current;
    const parent = node.parentNode;
    const placeholder = document.createElement('div');
    parent?.insertBefore(placeholder, node);
    
    document.body.appendChild(node);
    document.body.classList.add('printing-mode');

    const oldTitle = document.title;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '-');
    const projectName = version.company || version.customer_name || quotation.quotation_no || 'Quotation';
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/\s+/g, '_');
    
    document.title = `${safeProjectName}_${dateStr}_${timeStr}`;
    
    setTimeout(() => {
      window.print();
      
      document.title = oldTitle;
      document.body.classList.remove('printing-mode');
      parent?.insertBefore(node, placeholder);
      parent?.removeChild(placeholder);
    }, 100);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${quotation.status === 'Draft' ? 'DRAFT' : quotation.quotation_no} - Version ${version.version_number} (Letterhead)`}
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
      <div className="flex justify-center p-4 sm:p-8 bg-gray-100/50 print:p-0 print:bg-white print:overflow-visible custom-scrollbar min-h-[500px]">
        {/* Render directly to the screen so useLayoutEffect can measure heights correctly */}
        <div 
          ref={previewContainerRef}
          className="print-only print-only-wrapper w-full flex flex-col items-center gap-8"
        >
          <TemplateRenderer quotation={quotation} version={version} />
        </div>
      </div>
    </Modal>
  );
}
