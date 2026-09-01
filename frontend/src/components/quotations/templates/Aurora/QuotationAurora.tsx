import { Building2, Mail, MapPin, Phone } from "lucide-react";
import "./aurora.css";
import type { Quotation, QuotationVersion } from "../../../../types";
import { formatCurrency } from "../../../../lib/utils";

function AuroraFooter({ page, quote, brand }: { page: number; quote: string; brand: string }) {
  return (
    <footer className="au-footer">
      <span className="au-foot-brand">
        <span className="au-foot-dot au-dot-blue"></span>
        <span className="au-foot-dot au-dot-violet"></span>
        <span className="au-foot-dot au-dot-red"></span>
        <span className="au-foot-dot au-dot-orange"></span>
        <span className="au-foot-dot au-dot-green"></span>
        {brand}
      </span>
      <span className="au-foot-ref">
        {quote}
      </span>
      <span className="au-foot-page">
        <span className="page-counter"></span>
      </span>
    </footer>
  );
}

function LogoLockup() {
  return (
    <div className="flex items-center">
      <img src="/logo.png" alt="D'Tactics Logo" className="h-[42px] object-contain" />
    </div>
  );
}

export function AuroraPage({ quotation, version }: { quotation: Quotation, version: QuotationVersion }) {
  const bullets = version.lead_remarks ? version.lead_remarks.split('\n').filter(Boolean) : [];
  const formatDisplayDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <article className="au-page">
      <div className="au-mesh" aria-hidden="true" />
      <div className="au-accent-bar" aria-hidden="true" />

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <td>
              <header className="au-header">
                <LogoLockup />
                <div className="au-header-right">
                  <span className="au-quote-pill">Quotation</span>
                  <b className="au-quote-no">{quotation.quotation_no}</b>
                </div>
              </header>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="au-body">
                <section className="au-title-band">
                  <div className="au-title-left">
                    <p className="au-eyebrow">
                      <i className="au-eyebrow-swatch" />
                      Commercial proposal · Custom software services
                    </p>
                    <h1 className="au-title">
                      Project <span className="au-title-accent">quotation</span>
                    </h1>
                    <p className="au-title-copy">
                      Prepared by dTactics IT Solutions — engineering custom software,
                      web and mobile experiences for growing businesses.
                    </p>
                  </div>
                  <div className="au-title-right">
                    <a className="au-website" href="https://dtacticsit.com" target="_blank" rel="noreferrer">
                      dtacticsit.com
                    </a>
                    <div className="au-issuer-card">
                      <span>Issuer</span>
                      <b>dTactics IT Solutions</b>
                      <small>Custom software · Web · Mobile</small>
                    </div>
                  </div>
                </section>

                <section className="au-meta">
                  <div>
                    <span>Quote date</span>
                    <b>{formatDisplayDate(version.date)}</b>
                  </div>
                  <div>
                    <span>Valid until</span>
                    <b>{formatDisplayDate(version.valid_until)}</b>
                  </div>
                  <div>
                    <span>Account manager</span>
                    <b>{version.source_person || '—'}</b>
                  </div>
                  <div>
                    <span>Currency</span>
                    <b>{version.currency === 'INR' ? 'INR · ₹' : version.currency === 'USD' ? 'USD · $' : version.currency === 'EUR' ? 'EUR · €' : version.currency}</b>
                  </div>
                </section>

                <section className="au-client">
                  <div className="au-client-main">
                    <span className="au-client-flag">Prepared for</span>
                    <h2>{version.company || version.customer_name}</h2>
                    <p className="whitespace-pre-wrap">{version.address}</p>
                  </div>
                  <div className="au-client-side">
                    <div>
                      <span>Contact</span>
                      <b>{version.customer_name}</b>
                    </div>
                    <div>
                      <span>E-mail</span>
                      <b className="break-all">{version.primary_email || '—'}</b>
                    </div>
                    <div>
                      <span>Phone</span>
                      <b>{version.primary_phone || '—'}</b>
                    </div>
                  </div>
                </section>

                <section className="au-scope">
                  <div className="au-sec-title">
                    <span className="au-sec-num au-sec-blue">01</span>
                    <h3>Scope of Work</h3>
                    <i />
                  </div>
                  <div className="au-type-box" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>Project Type</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{version.project_type_description || version.service_type || 'Custom Service'}</div>
                  </div>
                  {version.lead_remarks && (
                    <ul className="au-bullets">
                      {version.lead_remarks.split('\n').filter(Boolean).map((rmk, idx) => {
                        const colors = ['is-blue', 'is-violet', 'is-red', 'is-orange', 'is-green'];
                        const colorClass = colors[idx % colors.length];
                        const numStr = String(idx + 1).padStart(2, '0');
                        return (
                          <li key={idx} className={`au-bullet ${colorClass}`}>
                            <span className="au-bullet-num">{numStr}</span>
                            <p>{rmk}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>



                <section className="au-charges" style={{ marginTop: '24px' }}>
                  <div className="au-sec-title">
                    <span className="au-sec-num au-sec-red">02</span>
                    <h3>Commercial Proposal</h3>
                    <i />
                    <span className="au-sec-note">All amounts in {version.currency}</span>
                  </div>
                  <table className="au-charge">
                    <thead>
                      <tr>
                        <th className="au-th-left">Project Service</th>
                        <th className="au-th-mid">Base Amount</th>
                        <th className="au-th-mid">GST %</th>
                        <th className="au-th-mid">GST Amt</th>
                        <th className="au-th-right">Amount Inc. GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {version.commercial_items && version.commercial_items.length > 0 ? (
                        version.commercial_items.map((item, idx) => {
                          const formatLabel = (s: string) => s ? s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
                          return (
                            <tr key={idx}>
                              <td className="au-item-desc">
                                <div className="font-semibold text-base-fg">{formatLabel(item.project_type || '') || 'Service'}</div>
                                {item.description && <div className="text-[11px] text-muted-fg mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                              </td>
                              <td className="au-item-basis">{formatCurrency(item.base_amount, version.currency)}</td>
                              <td className="au-item-basis">{item.gst_percent}%</td>
                              <td className="au-item-basis">{formatCurrency(item.gst_amount, version.currency)}</td>
                              <td className="au-item-amt">{formatCurrency(item.amount_inc_gst, version.currency)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-fg py-4">No services added</td>
                        </tr>
                      )}
                    </tbody>
                    {version.commercial_items && version.commercial_items.length > 0 && (
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                          <td className="au-item-desc text-right font-bold text-base-fg" style={{ paddingTop: '16px' }}>Total</td>
                          <td className="au-item-basis font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {formatCurrency(version.commercial_items.reduce((s, i) => s + (Number(i.base_amount) || 0), 0), version.currency)}
                          </td>
                          <td className="au-item-basis" style={{ paddingTop: '16px' }}></td>
                          <td className="au-item-basis font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {formatCurrency(version.commercial_items.reduce((s, i) => s + (Number(i.gst_amount) || 0), 0), version.currency)}
                          </td>
                          <td className="au-item-amt font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {formatCurrency(version.commercial_items.reduce((s, i) => s + (Number(i.amount_inc_gst) || 0), 0), version.currency)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </section>

                <section className="au-charges" style={{ marginTop: '24px' }}>
                  <div className="au-sec-title">
                    <span className="au-sec-num au-sec-violet">03</span>
                    <h3>Milestone Payment Plan</h3>
                    <i />
                  </div>
                  <table className="au-charge">
                    <thead>
                      <tr>
                        <th className="au-th-left">Milestone</th>
                        <th className="au-th-mid">Percent</th>
                        <th className="au-th-mid">Base Amount</th>
                        <th className="au-th-mid">GST %</th>
                        <th className="au-th-mid">GST Amt</th>
                        <th className="au-th-right">Amount Inc. GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {version.milestones && version.milestones.length > 0 ? (
                        version.milestones.map((milestone, idx) => {
                          const formatLabel = (s: string) => s ? s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
                          return (
                            <tr key={idx}>
                              <td className="au-item-desc">
                                <div className="font-semibold text-base-fg">{formatLabel(milestone.label || '') || 'Milestone'}</div>
                                {milestone.description && <div className="text-[11px] text-muted-fg mt-0.5 whitespace-pre-wrap">{milestone.description}</div>}
                              </td>
                              <td className="au-item-basis">{milestone.percent}%</td>
                              <td className="au-item-basis">{formatCurrency(milestone.base_amount || 0, version.currency)}</td>
                              <td className="au-item-basis">{milestone.gst_percent || 0}%</td>
                              <td className="au-item-basis">{formatCurrency(milestone.gst_amount || 0, version.currency)}</td>
                              <td className="au-item-amt">{formatCurrency(milestone.amount, version.currency)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-muted-fg py-4">No milestones added</td>
                        </tr>
                      )}
                    </tbody>
                    {version.milestones && version.milestones.length > 0 && (
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                          <td className="au-item-desc text-right font-bold text-base-fg" style={{ paddingTop: '16px' }}>Total</td>
                          <td className="au-item-basis font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {version.milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0)}%
                          </td>
                          <td className="au-item-basis font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {formatCurrency(version.milestones.reduce((s, m) => s + (Number(m.base_amount) || 0), 0), version.currency)}
                          </td>
                          <td className="au-item-basis" style={{ paddingTop: '16px' }}></td>
                          <td className="au-item-basis font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {formatCurrency(version.milestones.reduce((s, m) => s + (Number(m.gst_amount) || 0), 0), version.currency)}
                          </td>
                          <td className="au-item-amt font-bold text-base-fg" style={{ paddingTop: '16px' }}>
                            {formatCurrency(version.milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0), version.currency)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </section>

                <section className="au-sign">
                  <div className="au-sign-block">
                    <i className="au-sign-rule"></i>
                    <b>Authorized Signatory</b>
                    <small>dTactics IT Solutions</small>
                  </div>
                </section>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <AuroraFooter page={1} quote={quotation.quotation_no} brand="dTactics IT Solutions · dtacticsit.com" />
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
