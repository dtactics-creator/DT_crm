import { Copy, Check, Share2, ExternalLink, Sparkles, X } from "lucide-react";
import { useState } from "react";

// Mock Reveal Type
export type Reveal = {
  type: string;
  title: string;
  description: string;
  image?: string;
  cta?: { label: string; url: string };
  couponCode?: string;
  expiry?: string;
  brand?: string;
  qr?: boolean;
};

const trackEvent = (e: any) => console.log('Track event', e);

export function RevealCard({ reveal, onAgain, onClose }: { reveal: Reveal; onAgain: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const track = (event_type: "cta_click" | "coupon_copy" | "share") =>
    trackEvent({
      event_type,
      reveal_type: reveal.type,
      reveal_title: reveal.title,
      brand: reveal.brand ?? null,
    });

  const qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=1a1440&color=f4d58d&data=" +
    encodeURIComponent(reveal.cta?.url && reveal.cta.url !== "#" ? reveal.cta.url : reveal.title);

  const copyCode = async () => {
    if (!reveal.couponCode) return;
    track("coupon_copy");
    try {
      await navigator.clipboard.writeText(reveal.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    track("share");
    const data = { title: reveal.title, text: reveal.description, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${reveal.title} — ${window.location.href}`);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="animate-card-emerge shadow-card-magic relative w-full max-w-md overflow-hidden rounded-3xl border border-gold/40 bg-card">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full bg-background/50 p-1.5 text-gold/70 backdrop-blur-md transition-colors hover:bg-background/80 hover:text-gold"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center justify-between px-5 pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          {reveal.type}
        </span>
        {reveal.brand && (
          <span className="font-body text-sm text-muted-foreground mr-8">{reveal.brand}</span>
        )}
      </div>

      {reveal.image && (
        <div className="mt-4 px-5">
          <img
            src={reveal.image}
            alt={reveal.title}
            loading="lazy"
            className="h-44 w-full rounded-2xl object-cover"
          />
        </div>
      )}

      {reveal.qr && !reveal.image && (
        <div className="mt-5 flex justify-center px-5">
          <img
            src={qrUrl}
            alt="Scan to redeem"
            loading="lazy"
            className="h-40 w-40 rounded-2xl border border-gold/40 bg-secondary p-2"
          />
        </div>
      )}

      <div className="px-6 pb-6 pt-4 text-center">
        <h2 className="font-display text-2xl leading-tight text-gold">{reveal.title}</h2>
        <p className="mt-2 font-body text-lg text-foreground/85">{reveal.description}</p>

        {reveal.couponCode && (
          <button
            onClick={copyCode}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-gold/60 bg-secondary px-4 py-2 font-mono text-lg font-bold tracking-widest text-gold transition-colors hover:bg-secondary/70"
          >
            {reveal.couponCode}
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}

        {reveal.expiry && (
          <p className="mt-2 font-body text-sm text-muted-foreground">{reveal.expiry}</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {reveal.cta && (
            <a 
              href={reveal.cta.url} 
              target="_blank" 
              rel="noreferrer" 
              onClick={() => track("cta_click")}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold h-11 px-8 rounded-xl w-full"
            >
              {reveal.cta.label}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <div className="flex gap-2">
            <button onClick={share} className="flex-1 flex items-center justify-center gap-2 h-11 font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button onClick={onAgain} className="flex-1 flex items-center justify-center gap-2 h-11 font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
              <Sparkles className="h-4 w-4" />
              Rub Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
