import { useState, useCallback } from 'react';
import { StarField } from '../magic/StarField';
import { MagicLamp } from '../magic/MagicLamp';
import { RevealCard } from '../magic/RevealCard';

// Extracted from original genie-s-wish project but adjusted for generic config
const isVideo = (url: string | undefined) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || url.endsWith('#video');
};

export default function GenieWishTemplate({ config, reveal, onReveal, onReset }: {
  config: any;
  reveal: any;
  onReveal: () => void;
  onReset: () => void;
}) {
  const [lampKey, setLampKey] = useState(0);

  const handleReveal = useCallback(() => {
    onReveal();
  }, [onReveal]);

  const rubAgain = useCallback(() => {
    onReset();
    setLampKey(k => k + 1);
  }, [onReset]);

  return (
    <main className="absolute inset-0 w-full overflow-hidden bg-gradient-night" style={{ background: config.background }}>
      {config.googleFontUrl && (
        <style>
          {config.googleFontUrl.split(',').map((url: string) => `@import url('${url.trim()}');`).join('\n')}
        </style>
      )}

      {/* Background Media */}
      {config.bgImage && isVideo(config.bgImage) ? (
        <video
          src={config.bgImage}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
      ) : config.bgImage ? (
        <img
          src={config.bgImage}
          alt=""
          width={1536}
          height={1024}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      <StarField />

      <div className="relative z-10 mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 text-center pt-16 sm:pt-24">
        <p className={`mb-3 text-sm uppercase tracking-[0.35em] ${config.subtitleColor === '#fcd34d' ? 'text-gold opacity-80' : ''}`} style={{ fontFamily: config.bodyFontFamily || 'var(--font-body)', ...(config.subtitleColor !== '#fcd34d' ? { color: config.subtitleColor } : {}) }}>
          {config.subtitle || 'Arabian Nights'}
        </p>
        <h1 className={`text-xl font-bold leading-snug tracking-wide sm:text-4xl ${config.titleColor === '#fbbf24' ? 'text-gold' : ''}`} style={{ fontFamily: config.titleFontFamily || 'var(--font-display)', ...(config.titleColor !== '#fbbf24' ? { color: config.titleColor } : {}) }}>
          {config.title || 'Rub the Magic Lamp and Discover Your Surprise!'}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-200 sm:text-2xl" style={{ fontFamily: config.bodyFontFamily || 'var(--font-body)' }}>
          Every rub unlocks something magical.
        </p>

        <div className="mt-8">
          <MagicLamp key={lampKey} onReveal={handleReveal} disabled={reveal !== null} lampImage={config.lampImage} />
        </div>
      </div>

      {/* Reveal overlay */}
      {reveal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0">
            <StarField />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <RevealCard reveal={reveal} config={config} onAgain={rubAgain} onClose={rubAgain} />
          </div>
        </div>
      )}
    </main>
  );
}
