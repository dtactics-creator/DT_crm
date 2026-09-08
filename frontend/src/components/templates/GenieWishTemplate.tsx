import { useState, useCallback } from 'react';
import { StarField } from '../magic/StarField';
import { MagicLamp } from '../magic/MagicLamp';
import { RevealCard } from '../magic/RevealCard';

// Extracted from original genie-s-wish project but adjusted for generic config
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
    <main className="relative min-h-screen overflow-hidden bg-gradient-night" style={{ background: config.background }}>
      {config.googleFontUrl && (
        <style>
          {`@import url('${config.googleFontUrl}');`}
        </style>
      )}
      
      {/* Background Image */}
      {config.bgImage && (
        <img
          src={config.bgImage}
          alt=""
          width={1536}
          height={1024}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      <StarField />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-14 text-center">
        <p className={`mb-3 text-sm uppercase tracking-[0.35em] ${config.subtitleColor === '#fcd34d' ? 'text-gold opacity-80' : ''}`} style={{ fontFamily: config.bodyFontFamily || 'var(--font-body)', ...(config.subtitleColor !== '#fcd34d' ? { color: config.subtitleColor } : {}) }}>
          {config.subtitle || 'Arabian Nights'}
        </p>
        <h1 className={`text-3xl font-bold leading-tight sm:text-5xl ${config.titleColor === '#fbbf24' ? 'text-gold' : ''}`} style={{ fontFamily: config.titleFontFamily || 'var(--font-display)', ...(config.titleColor !== '#fbbf24' ? { color: config.titleColor } : {}) }}>
          {config.title || 'Rub the Magic Lamp and Discover Your Surprise!'}
        </h1>
        <p className="mt-4 max-w-xl text-xl text-slate-200 sm:text-2xl" style={{ fontFamily: config.bodyFontFamily || 'var(--font-body)' }}>
          Every rub unlocks something magical.
        </p>

        <div className="mt-8">
          <MagicLamp key={lampKey} onReveal={handleReveal} disabled={reveal !== null} lampImage={config.lampImage} />
        </div>

        <p className="mt-10 text-sm text-slate-400" style={{ fontFamily: config.bodyFontFamily || 'var(--font-body)' }}>
          ✦ A new wonder awaits with every visit ✦
        </p>
      </div>

      {/* Reveal overlay */}
      {reveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0">
            <StarField />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <RevealCard reveal={reveal} onAgain={rubAgain} onClose={rubAgain} />
          </div>
        </div>
      )}
    </main>
  );
}
