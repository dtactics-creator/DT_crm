import React from 'react';
import type { Quotation, QuotationVersion } from '../../../../types';
import { formatCurrency } from '../../../../lib/utils';
import './minimal.css';

function MinimalHeader() {
  return (
    <header className="min-header">
      <img src="/logo.png" alt="D'Tactics Information Technologies" />
    </header>
  );
}

function MinimalFooter() {
  return (
    <footer className="min-footer">
      <strong>D'Tactics Information Technologies</strong>
      20a/166, 3rd Street, Thiyagarayapuram, Thiruvottiyur, Chennai 600019, Tamil Nadu, India.<br />
      Mobile No. : + 91 – 99400 71971 & 63695 44439.<br />
      Email : <a href="mailto:dinesh.s@dtacticsit.com">dinesh.s@dtacticsit.com</a> &nbsp; Website : <a href="https://www.dtacticsit.com" target="_blank" rel="noreferrer">www.dtacticsit.com</a>
    </footer>
  );
}

export function QuotationMinimal({ quotation, version }: { quotation: Quotation, version: QuotationVersion }) {
  const formatDisplayDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  
  const totalAmount = (version.commercial_items || []).reduce((sum, item) => sum + (Number(item.amount_inc_gst) || 0), 0);

  return (
    <article className="min-page">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <td>
              <MinimalHeader />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="min-body">
                
                <div className="min-title-sec">
                  <h1 className="min-title">Quotation</h1>
                  <div className="text-gray-500 text-sm">Ref: {quotation.quotation_no}</div>
                </div>

                <div className="min-meta-grid">
                  <div className="min-meta-item">
                    <span className="min-meta-label">Quote Date</span>
                    <span className="min-meta-value">{formatDisplayDate(version.date)}</span>
                  </div>
                  <div className="min-meta-item">
                    <span className="min-meta-label">Valid Until</span>
                    <span className="min-meta-value">{formatDisplayDate(version.valid_until)}</span>
                  </div>
                  <div className="min-meta-item">
                    <span className="min-meta-label">Account Manager</span>
                    <span className="min-meta-value">{version.source_person || '—'}</span>
                  </div>
                  <div className="min-meta-item">
                    <span className="min-meta-label">Currency</span>
                    <span className="min-meta-value">{version.currency.toUpperCase()}</span>
                  </div>
                </div>

                <div className="min-client-sec">
                  <div className="min-meta-label">Prepared For</div>
                  <div className="min-client-title">{version.company || version.customer_name}</div>
                  {version.address && <div className="min-client-address">{version.address}</div>}
                  <div className="text-sm text-slate-600">
                    <div>Attn: {version.customer_name}</div>
                    {version.primary_email && <div>Email: {version.primary_email}</div>}
                    {version.primary_phone && <div>Phone: {version.primary_phone}</div>}
                  </div>
                </div>

                <div className="min-section">
                  <div className="min-section-title">Scope of Work</div>
                  <div className="mb-4">
                    <span className="min-meta-label mr-2">Project Type:</span>
                    <span className="font-semibold text-slate-800">{version.project_type_description || version.service_type || 'Custom Service'}</span>
                  </div>
                  {version.lead_remarks && (
                    <ul className="min-list">
                      {version.lead_remarks.split('\n').filter(Boolean).map((rmk, idx) => (
                        <li key={idx} className="min-list-item">{rmk}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="min-section">
                  <div className="min-section-title">Commercial Proposal</div>
                  <div className="flex flex-col gap-2">
                    {version.commercial_items && version.commercial_items.length > 0 ? (
                      version.commercial_items.map((item, idx) => {
                        const formatLabel = (s: string) => s ? s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
                        return (
                          <div key={idx} className="min-row page-break-inside-avoid">
                            <div className="flex-1 pr-4">
                              <div className="min-row-title">{formatLabel(item.project_type || '') || 'Service'}</div>
                              {item.description && <div className="min-row-desc whitespace-pre-wrap">{item.description}</div>}
                            </div>
                            <div className="min-row-amount">
                              {formatCurrency(item.amount_inc_gst, version.currency)}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-500 italic py-2">No services added</div>
                    )}
                  </div>
                  
                  {version.commercial_items && version.commercial_items.length > 0 && (
                    <div className="min-total-row page-break-inside-avoid">
                      <div>Total Amount (Inc. GST)</div>
                      <div>{formatCurrency(totalAmount, version.currency)}</div>
                    </div>
                  )}
                </div>

                {version.milestones && version.milestones.length > 0 && (
                  <div className="min-section">
                    <div className="min-section-title">Payment Milestones</div>
                    <div className="flex flex-col gap-2">
                      {version.milestones.map((milestone, idx) => {
                        const formatLabel = (s: string) => s ? s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
                        return (
                          <div key={idx} className="min-row page-break-inside-avoid">
                            <div className="flex-1 pr-4">
                              <div className="min-row-title">{formatLabel(milestone.label || '') || 'Milestone'} ({milestone.percent}%)</div>
                              {milestone.description && <div className="min-row-desc whitespace-pre-wrap">{milestone.description}</div>}
                            </div>
                            <div className="min-row-amount">
                              {formatCurrency(milestone.amount, version.currency)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {version.terms && (
                  <div className="min-section page-break-inside-avoid">
                    <div className="min-section-title">Terms & Conditions</div>
                    <ul className="min-list text-sm">
                      {version.terms.split('\n').filter(Boolean).map((term, idx) => (
                        <li key={idx} className="min-list-item text-xs">{term}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="min-sign page-break-inside-avoid">
                  <div className="min-sign-line"></div>
                  <div className="min-sign-name">Authorized Signatory</div>
                  <div className="min-sign-title">D'Tactics Information Technologies</div>
                </div>

              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <MinimalFooter />
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
