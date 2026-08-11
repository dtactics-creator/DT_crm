import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, size = 'max-w-md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className={`relative w-full ${size} bg-surface border border-app rounded-2xl elevated flex flex-col max-h-[90vh]`}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-app">
              <h2 className="text-base font-bold text-base-fg">{title}</h2>
              <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 transition-colors">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">{children}</div>
            {footer && <div className="px-5 py-4 border-t border-app bg-surface-2 rounded-b-2xl">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
