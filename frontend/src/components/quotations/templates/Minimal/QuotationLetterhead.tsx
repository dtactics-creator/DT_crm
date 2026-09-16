import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Quotation, QuotationVersion } from '../../../../types';
import { formatCurrency } from '../../../../lib/utils';
import "./letterhead.css";

const PAGE_H = 1123;
const HEADER_H = 132;
const FOOTER_H = 108;
const USABLE_H = PAGE_H - HEADER_H - FOOTER_H;

type Block = { key: string; node: React.ReactNode };

const companyProfile = {
  name: "D'Tactics Information Technologies",
  address: "20a/166, 3rd Street, Thiyagarayapuram, Thiruvottiyur, Chennai 600019, Tamil Nadu, India.",
  mobile: "+91 - 99400 71971 & 63695 44439",
  email: "dinesh.s@dtacticsit.com",
  website: "www.dtacticsit.com"
};

function Header({ quoteNo }: { quoteNo: string }) {
  return (
    <header className="lh-header">
      <img src="/logo.png" alt="D'Tactics Logo" style={{ height: 44, objectFit: 'contain' }} />
      <div className="lh-header-side">
        <span>Quotation</span>
        <b>{quoteNo}</b>
      </div>
    </header>
  );
}

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <footer className="lh-footer">
      <p className="lh-footer-name">{companyProfile.name}</p>
      <p>{companyProfile.address}</p>
      <p>
        <strong>Mobile No. :</strong> {companyProfile.mobile}
      </p>
      <p>
        <strong>Email :</strong> {companyProfile.email}
        &nbsp;&nbsp;
        <strong>Website :</strong> {companyProfile.website}
      </p>
      <span className="lh-page-no">
        {page} / {total}
      </span>
    </footer>
  );
}

export function QuotationLetterhead({ quotation, version }: { quotation: Quotation, version: QuotationVersion }) {
  const formatDisplayDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const money = (value: number) => formatCurrency(value, version.currency);
  
  const bullets = version.lead_remarks ? version.lead_remarks.split('\n').filter(Boolean) : [];
  
  const totalBase = (version.commercial_items || []).reduce((sum, item) => sum + (Number(item.base_amount) || 0), 0);
  const totalGst = (version.commercial_items || []).reduce((sum, item) => sum + (Number(item.gst_amount) || 0), 0);
  const totalIncGst = (version.commercial_items || []).reduce((sum, item) => sum + (Number(item.amount_inc_gst) || 0), 0);

  const blocks = useMemo<Block[]>(() => {
    const list: Block[] = [];

    list.push({
      key: "intro",
      node: (
        <section className="lh-sec">
          <div className="lh-pair">
            <div>
              <p className="lh-kicker">To</p>
              <h1>{version.company || version.customer_name}</h1>
              <p className="lh-muted">{version.customer_name}</p>
              <p className="lh-address whitespace-pre-wrap">{version.address}</p>
              <p className="lh-muted lh-gap-top">
                {version.primary_phone}
                <br />
                {version.primary_email}
              </p>
            </div>
            <div className="lh-facts">
              <p>
                <span>Date</span>
                <b>{formatDisplayDate(version.date)}</b>
              </p>
              <p>
                <span>Valid until</span>
                <b>{formatDisplayDate(version.valid_until)}</b>
              </p>
              <p>
                <span>Prepared by</span>
                <b>{version.source_person || '—'}</b>
              </p>
              <p>
                <span>Project</span>
                <b>{version.project_type_description || version.service_type || "Custom software services"}</b>
              </p>
            </div>
          </div>
        </section>
      ),
    });

    if (bullets.length > 0) {
      list.push({
        key: "scope",
        node: (
          <section className="lh-sec">
            <h2>Scope of work</h2>
            <ul className="lh-ul">
              {bullets.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        ),
      });
    }

    list.push({
      key: "commercial",
      node: (
        <section className="lh-sec">
          <h2>Commercial proposal</h2>
          <div className="lh-cols">
            <span>Description</span>
            <span>Base</span>
            <span>GST</span>
            <span>Amount</span>
          </div>
          {version.commercial_items && version.commercial_items.length > 0 ? (
            version.commercial_items.map((row, idx) => {
              const formatLabel = (s: string) => s ? s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
              return (
                <div className="lh-cols lh-item" key={idx}>
                  <span>
                    <div className="font-semibold text-slate-800">{formatLabel(row.project_type || '') || 'Service'}</div>
                    {row.description && <div className="whitespace-pre-wrap">{row.description}</div>}
                    <small>
                      GST {row.gst_percent}% · {money(row.gst_amount || 0)}
                    </small>
                  </span>
                  <span>{money(row.base_amount || 0)}</span>
                  <span>{row.gst_percent}%</span>
                  <span>{money(row.amount_inc_gst || 0)}</span>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 italic py-2 text-xs">No services added</div>
          )}
          
          {version.commercial_items && version.commercial_items.length > 0 && (
            <div className="lh-sum">
              <p>
                <span>Total excluding GST</span>
                <b>{money(totalBase)}</b>
              </p>
              <p>
                <span>Total GST</span>
                <b>{money(totalGst)}</b>
              </p>
              <p className="is-total">
                <span>Total including GST</span>
                <b>{money(totalIncGst)}</b>
              </p>
            </div>
          )}
        </section>
      ),
    });

    if (version.milestones && version.milestones.length > 0) {
      list.push({
        key: "pay",
        node: (
          <section className="lh-sec">
            <h2>Payment schedule</h2>
            {version.milestones.map((milestone, index) => (
              <div className="lh-pay" key={index}>
                <span className="lh-pay-n">{index + 1}</span>
                <span className="lh-pay-name">
                  <div>{milestone.label || 'Milestone'}</div>
                  {milestone.description && <div className="text-[9px] text-slate-500 whitespace-pre-wrap">{milestone.description}</div>}
                </span>
                <span className="lh-pay-pct">{milestone.percent}%</span>
                <span className="lh-pay-amt">
                  {money(milestone.amount)}
                </span>
              </div>
            ))}
          </section>
        ),
      });
    }

    if (version.terms) {
      list.push({
        key: "terms",
        node: (
          <section className="lh-sec">
            <h2>Terms</h2>
            <ol className="lh-ol lh-ol-tight">
              {version.terms.split('\n').filter(Boolean).map((term, idx) => (
                <li key={idx}>{term}</li>
              ))}
            </ol>
          </section>
        ),
      });
    }

    list.push({
      key: "sign",
      node: (
        <section className="lh-sec lh-sign">
          <div>
            <p className="lh-kicker">For {companyProfile.name}</p>
            <div className="lh-rule" />
            <p>
              Authorized Signatory
              <br />
              <span className="lh-muted">Name / Date</span>
            </p>
          </div>
        </section>
      ),
    });

    return list;
  }, [bullets, version, money, totalBase, totalGst, totalIncGst]);

  const [heights, setHeights] = useState<number[] | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const next = Array.from(node.children).map(
      (child) => (child as HTMLElement).getBoundingClientRect().height,
    );
    setHeights((current) =>
      current && current.length === next.length
        ? current.every((value, index) => Math.abs(value - next[index]) < 0.5)
          ? current
          : next
        : next,
    );
  }, [blocks, fontsReady]);

  useEffect(() => {
    if (!document.fonts?.ready) return;
    let active = true;
    document.fonts.ready.then(() => {
      if (active) setFontsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const pageMap = useMemo(() => {
    if (!heights) return [];
    const pages: number[][] = [];
    let current: number[] = [];
    let used = 0;

    blocks.forEach((_, index) => {
      const height = (heights[index] ?? 0) + 8;
      if (current.length > 0 && used + height > USABLE_H) {
        pages.push(current);
        current = [];
        used = 0;
      }
      current.push(index);
      used += height;
    });
    if (current.length > 0) pages.push(current);
    return pages.length > 0 ? pages : [[]];
  }, [blocks, heights]);

  const totalPages = Math.max(1, pageMap.length);

  if (heights === null) {
    return (
      <div className="lh-measure" ref={measureRef} aria-hidden="true">
        {blocks.map((block) => (
          <div key={block.key}>{block.node}</div>
        ))}
      </div>
    );
  }

  return (
    <>
      {pageMap.map((pageIndexList, pageIndex) => (
        <div className="lh-sheet" key={`lh-page-${pageIndex}`}>
          <article className="lh-page">
            <Header quoteNo={quotation.quotation_no} />
            <div className="lh-body">
              {pageIndexList.map((blockIndex) => (
                <div key={blocks[blockIndex].key}>{blocks[blockIndex].node}</div>
              ))}
            </div>
            <Footer page={pageIndex + 1} total={totalPages} />
          </article>
        </div>
      ))}
    </>
  );
}
