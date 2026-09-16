import type { Quotation, QuotationVersion } from '../../../types';
import { QuotationLetterhead } from './Minimal/QuotationLetterhead';
import { AuroraPage } from './Aurora/QuotationAurora';
import QuotationLogistics from './Logistics/QuotationLogistics';

export default function TemplateRenderer({ quotation, version }: { quotation: Quotation, version: QuotationVersion }) {
  // Always use the Letterhead template as requested by the user
  return <QuotationLetterhead quotation={quotation} version={version} />;
}
