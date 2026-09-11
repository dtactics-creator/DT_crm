import {
  Check,
  Copy,
  Share2,
  Sparkles,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
export type Reveal = {
  type: string;
  title: string;
  description: string;
  brand?: string;
  image?: string;
  qr?: boolean;
  couponCode?: string;
  expiry?: string;
  cta?: { url: string; label: string; };
};

const trackEvent = (e: any) => console.log('Track event', e);

export function RevealCard({
  reveal,
  config,
  onAgain,
  onClose,
}: {
  reveal: Reveal;
  config?: any;
  onAgain: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const track = (
    event_type: "cta_click" | "coupon_copy" | "share"
  ) =>
    trackEvent({
      event_type,
      reveal_type: reveal.type,
      reveal_title: reveal.title,
      brand: reveal.brand ?? null,
    });

  const titleColor = config?.titleColor || "#fbbf24";
  const bodyFont =
    config?.bodyFontFamily || "var(--font-body)";
  const titleFont =
    config?.titleFontFamily || "var(--font-display)";

  const bgColor = config?.modalBackground || config?.background || "#080b13";
  const btnBgColor = config?.modalButtonColor || titleColor;
  const btnTextColor = config?.modalButtonTextColor || "#080b13";
  const accentColor = config?.modalAccentColor || titleColor;
  const textColor = config?.modalTextColor || "#ffffff";

  const qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=10131f&color=fbbf24&data=" +
    encodeURIComponent(
      reveal.cta?.url && reveal.cta.url !== "#"
        ? reveal.cta.url
        : reveal.title
    );

  const copyCode = async () => {
    if (!reveal.couponCode) return;

    track("coupon_copy");

    try {
      await navigator.clipboard.writeText(reveal.couponCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    track("share");

    const data = {
      title: reveal.title,
      text: reveal.description,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          `${reveal.title} — ${window.location.href}`
        );
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      <style>{`
        .theme-glass {
          border-color: color-mix(in srgb, ${textColor} 12%, transparent);
          background-color: color-mix(in srgb, ${textColor} 4%, transparent);
        }
        .theme-glass:hover {
          border-color: color-mix(in srgb, ${textColor} 20%, transparent);
          background-color: color-mix(in srgb, ${textColor} 8%, transparent);
        }
        .theme-border {
          border-color: color-mix(in srgb, ${textColor} 12%, transparent);
        }
        .theme-border-strong {
          border-color: color-mix(in srgb, ${textColor} 15%, transparent);
        }
      `}</style>
    <div
      className="
        relative
        flex
        w-[calc(100vw-24px)]
        max-w-[390px]
        max-h-[calc(100dvh-24px)]
        flex-col
        overflow-hidden
        rounded-[26px]
        border
        theme-border
        shadow-[0_24px_70px_rgba(0,0,0,0.55)]
        animate-card-emerge
      "
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="
            absolute
            -left-24
            -top-28
            h-60
            w-60
            rounded-full
            blur-[85px]
            opacity-[0.16]
          "
          style={{
            backgroundColor: accentColor,
          }}
        />

        <div
          className="
            absolute
            -bottom-28
            -right-24
            h-64
            w-64
            rounded-full
            bg-purple-500/10
            blur-[90px]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.075),transparent_45%)]
          "
        />
      </div>

      {/* =====================================================
          CLOSE
      ===================================================== */}

      <button
        onClick={onClose}
        aria-label="Close"
        className="
          absolute
          right-3.5
          top-3.5
          z-30
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-full
          border
          theme-glass
          backdrop-blur-md
          transition-all
          duration-200
          active:scale-90
          group
        "
      >
        <X className="h-4 w-4 stroke-[1.5] opacity-35 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          relative
          shrink-0
          px-5
          pb-3
          pt-5
        "
      >
        <div className="flex items-center justify-between pr-9">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />

            <span
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.25em]
                opacity-60
              "
              style={{
                fontFamily: bodyFont,
              }}
            >
              {reveal.type}
            </span>
          </div>

          {reveal.brand && (
            <span
              className="
                max-w-[130px]
                truncate
                text-[11px]
                font-medium
                uppercase
                tracking-[0.14em]
                opacity-60
              "
              style={{
                fontFamily: bodyFont,
              }}
            >
              {reveal.brand}
            </span>
          )}
        </div>
      </div>

      {/* =====================================================
          CONTENT SCROLLER
      ===================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain
          scrollbar-thin
          scrollbar-track-transparent
          scrollbar-thumb-white/10
        "
      >
        {/* ===================================================
            IMAGE
        =================================================== */}

        {reveal.image && (
          <div className="px-4">
            <div
              className="
                group
                relative
                overflow-hidden
                rounded-[19px]
                border
                theme-glass
                p-1
              "
            >
              <div className="relative overflow-hidden rounded-[15px]">
                <img
                  src={reveal.image}
                  alt={reveal.title}
                  loading="lazy"
                  className="
                    h-[125px]
                    w-full
                    object-cover
                    transition-transform
                    duration-500
                    group-hover:scale-[1.025]
                    sm:h-[145px]
                  "
                />

                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/30
                    via-transparent
                    to-white/[0.03]
                  "
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            QR
        =================================================== */}

        {reveal.qr && !reveal.image && (
          <div className="flex justify-center px-5 pt-1">
            <div
              className="
                aspect-[3/4]
                w-[135px]
                shrink-0
                relative
                rounded-[20px]
                border
                theme-border-strong
                bg-black/40
                p-2.5
              "
            >
              <div
                className="
                  absolute
                  inset-2
                  rounded-2xl
                  opacity-10
                  blur-xl
                "
                style={{
                  backgroundColor: accentColor,
                }}
              />

              <div className="relative rounded-xl bg-[#10131f] p-1.5">
                <img
                  src={qrUrl}
                  alt="Scan to redeem"
                  loading="lazy"
                  className="
                    h-[105px]
                    w-[105px]
                    rounded-lg
                    sm:h-[115px]
                    sm:w-[115px]
                  "
                />
              </div>

              <p
                className="
                  mt-1.5
                  text-center
                  text-[13px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  opacity-80
                "
                style={{
                  fontFamily: bodyFont,
                }}
              >
                Scan to redeem
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            MAIN
        =================================================== */}

        <div
          className="
            relative
            px-5
            pb-5
            pt-4
            text-center
          "
        >
          {/* Reward label */}
          {/* <div
            className="
              mb-2
              flex
              items-center
              justify-center
              gap-1.5
            "
          >
            <span className="h-px w-5 bg-white/10" />

            <span
              className="
                text-[13px]
                font-semibold
                uppercase
                tracking-[0.28em]
                opacity-60
              "
              style={{
                fontFamily: bodyFont,
              }}
            >
              Your reward
            </span>

            <span className="h-px w-5 bg-white/10" />
          </div> */}

          {/* =================================================
              TITLE
          ================================================= */}

          <h2
            className="
              mx-auto
              max-w-[340px]
              text-[24px]
              font-medium
              leading-[1.15]
              tracking-[-0.035em]
              sm:text-[27px]
            "
            style={{
              fontFamily: titleFont,
              color: titleColor,
              textShadow: `0 0 30px ${titleColor}20`,
            }}
          >
            {reveal.title}
          </h2>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <p
            className="
              mx-auto
              mt-2
              max-w-[315px]
              text-[14px]
              leading-[1.55]
              opacity-80
            "
            style={{
              fontFamily: bodyFont,
            }}
          >
            {reveal.description}
          </p>

          {/* =================================================
              COUPON & EXPIRY
          ================================================= */}

          {(reveal.couponCode || reveal.expiry) && (
            <div
              className="
                mt-5
                flex
                items-center
                justify-center
                gap-2
                px-3
                py-2.5
              "
              style={{ fontFamily: bodyFont }}
            >
              {reveal.couponCode && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] uppercase tracking-wider opacity-60">Coupon No:</span>
                  <span className="font-mono text-[13px] font-semibold opacity-90">{reveal.couponCode}</span>
                  <button
                    onClick={copyCode}
                    className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md theme-glass transition-colors active:scale-95"
                    title={copied ? "Copied!" : "Copy code"}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-70" />
                    )}
                  </button>
                </div>
              )}

              {reveal.couponCode && reveal.expiry && (
                <span className="mx-1 h-4 w-px shrink-0 theme-border border-r" />
              )}

              {reveal.expiry && (
                <div className="min-w-0 truncate text-[12px] tracking-wide opacity-60">
                  {reveal.expiry}
                </div>
              )}
            </div>
          )}

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="mt-4 space-y-2">
            {/* Primary CTA */}
            {reveal.cta && (
              <a
                href={reveal.cta.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => track("cta_click")}
                className="
                  group
                  relative
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  overflow-hidden
                  rounded-[15px]
                  px-5
                  py-3
                  text-[14px]
                  font-semibold
                  shadow-lg
                  transition-all
                  duration-200
                  hover:scale-[1.01]
                  active:scale-[0.985]
                "
                style={{
                  backgroundColor: btnBgColor,
                  color: btnTextColor,
                  fontFamily: bodyFont,
                }}
              >
                <span className="relative z-10">
                  {reveal.cta.label}
                </span>

                <ArrowUpRight
                  className="
                    relative
                    z-10
                    h-3.5
                    w-3.5
                    opacity-60
                    transition-transform
                    duration-200
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                  "
                />

                <span
                  className="
                    absolute
                    inset-0
                    translate-y-full
                    bg-white/20
                    transition-transform
                    duration-300
                    group-hover:translate-y-0
                  "
                />
              </a>
            )}

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={share}
                className="
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  rounded-[15px]
                  border
                  theme-glass
                  py-2.5
                  text-[13px]
                  font-medium
                  transition-all
                  duration-200
                  active:scale-[0.97]
                  group
                "
                style={{
                  fontFamily: bodyFont,
                }}
              >
                <span className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </span>
              </button>

              <button
                onClick={onAgain}
                className="
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  rounded-[15px]
                  border
                  theme-glass
                  py-2.5
                  text-[13px]
                  font-medium
                  transition-all
                  duration-200
                  active:scale-[0.97]
                  group
                "
                style={{
                  fontFamily: bodyFont,
                }}
              >
                <span className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="h-3.5 w-3.5" />
                  Rub Again
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          BOTTOM ACCENT
      ===================================================== */}

      <div className="relative h-px w-full shrink-0 bg-white/[0.05]">
        <div
          className="
            absolute
            left-1/2
            top-0
            h-px
            w-14
            -translate-x-1/2
          "
          style={{
            backgroundColor: titleColor,
            boxShadow: `0 0 12px ${titleColor}`,
          }}
        />
      </div>
      </div>
    </>
  );
}
