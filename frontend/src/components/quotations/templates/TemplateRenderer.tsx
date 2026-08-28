import type { Quotation, QuotationVersion } from '../../../types';
import { AuroraPage } from './Aurora/QuotationAurora';
import QuotationLogistics from './Logistics/QuotationLogistics';

export default function TemplateRenderer({ quotation, version }: { quotation: Quotation, version: QuotationVersion }) {
  if (version.template === 'aurora') {
    return <AuroraPage quotation={quotation} version={version} />;
  }
  
  // Default to logistics
  return <QuotationLogistics quotation={quotation} version={version} onClose={() => {}} onEdit={() => {}} />;
}
