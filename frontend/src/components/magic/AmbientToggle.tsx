import { Volume2, VolumeX } from "lucide-react";
import { useAmbientSound } from "@/hooks/useAmbientSound";

export function AmbientToggle() {
  const { enabled, toggle } = useAmbientSound();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Mute background music" : "Play background music"}
      className="fixed right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-background/60 text-gold backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-gold-bright"
    >
      {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}
