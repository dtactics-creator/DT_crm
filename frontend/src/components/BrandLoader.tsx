import { motion } from 'framer-motion';

export default function BrandLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app gap-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: [0.9, 1, 0.9], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-600/30"
      >
        D
      </motion.div>
      <p className="text-[13px] font-semibold text-muted-fg tracking-wide">Loading DTactics CRM…</p>
    </div>
  );
}
