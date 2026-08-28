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
        Page {String(page).padStart(2, "0")} / 01
      </span>
    </footer>
  );
}

function LogoLockup() {
  return (
    <div className="flex items-center gap-3">
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 5 C 10 5, 10 35, 10 35" stroke="url(#paint0_linear)" strokeWidth="8" strokeLinecap="round" />
        <path d="M10 5 C 30 5, 35 15, 35 20 C 35 25, 30 35, 10 35" stroke="url(#paint1_linear)" strokeWidth="8" strokeLinecap="round" />
        <defs>
          <linearGradient id="paint0_linear" x1="10" y1="5" x2="10" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1c93d6" />
            <stop offset="1" stopColor="#3a3f8f" />
          </linearGradient>
          <linearGradient id="paint1_linear" x1="10" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c81e3a" />
            <stop offset="0.5" stopColor="#e87a17" />
            <stop offset="1" stopColor="#6fb01a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col justify-center">
        <span className="text-[22px] font-bold text-[#9c0d3a] leading-none tracking-tight" style={{ fontFamily: "Georgia, serif" }}>D'TACTICS</span>
        <span className="text-[7.5px] font-bold text-[#141a33] tracking-[0.12em] mt-[4px] uppercase">Information Technologies</span>
      </div>
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

      <header className="au-header">
        <LogoLockup />
        <div className="au-header-right">
          <span className="au-quote-pill">Quotation</span>
          <b className="au-quote-no">{quotation.quotation_no}</b>
        </div>
      </header>

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



          <section className="au-charges" style={{ marginTop: '48px' }}>
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
                  version.commercial_items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="au-item-desc">
                        {item.project_type || 'Service'}
                      </td>
                      <td className="au-item-basis">{formatCurrency(item.base_amount, version.currency)}</td>
                      <td className="au-item-basis">{item.gst_percent}%</td>
                      <td className="au-item-basis">{formatCurrency(item.gst_amount, version.currency)}</td>
                      <td className="au-item-amt">{formatCurrency(item.amount_inc_gst, version.currency)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-fg py-4">No services added</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

        <section className="au-milestones">
          <div className="au-milestones-list">
            <div className="au-sec-title au-sec-title-slim">
              <span className="au-sec-num au-sec-violet">03</span>
              <h3>Milestone Payment Plan</h3>
            </div>
            {(version.milestones || []).map((milestone, index) => {
              const tones = ["is-blue", "is-orange", "is-green", "is-red", "is-violet"];
              return (
                <div className={`au-milestone ${tones[index % tones.length]}`} key={index}>
                  <span className="au-ms-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="au-ms-body">
                    <strong>{milestone.label}</strong>
                    <small>{milestone.percent}% of project value</small>
                  </div>
                  <div className="au-ms-amt">
                    <span>{milestone.percent}%</span>
                    <b>{formatCurrency(milestone.amount, version.currency)}</b>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="au-total-card">
            <div className="au-total-glow"></div>
            <span className="au-total-label">Grand Total</span>
            <div className="au-total-value">
              <i>{version.currency}</i>
              <strong>{formatCurrency(version.grand_total, version.currency).replace(/^[^\d]+/, '')}</strong>
            </div>
            <p className="au-total-note">
              Inclusive of design, development, testing and deployment
              as per scope. Applicable taxes billed at actuals.
            </p>
            <div className="au-total-foot">
              <span>Payable in {(version.milestones || []).length} stages</span>
              <b>{(version.milestones || []).map(m => m.percent).join(' · ')}</b>
            </div>
          </aside>
        </section>

        <section className="au-sign">
          <div className="au-sign-block">
            <i className="au-sign-rule"></i>
            <b>Authorized Signatory</b>
            <small>dTactics IT Solutions</small>
          </div>
          </section>
      </div>

      <AuroraFooter page={1} quote={quotation.quotation_no} brand="dTactics IT Solutions · dtacticsit.com" />
    </article>
  );
}
