import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

const ToastCtx = createContext<{ toast: (message: string, type?: ToastType) => void }>({ toast: () => {} });

export function useToast() { return useContext(ToastCtx); }

const config = {
  success: { icon: CheckCircle2, color: '#10b981' },
  error: { icon: AlertCircle, color: '#ef4444' },
  info: { icon: Info, color: '#1f4ef0' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2.5rem)]">
        <AnimatePresence>
          {toasts.map((t) => {
            const { icon: Icon, color } = config[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="flex items-start gap-3 bg-surface border border-app rounded-xl px-4 py-3 card-shadow-lg"
              >
                <Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color }} />
                <p className="flex-1 text-[13px] font-medium text-base-fg leading-snug">{t.message}</p>
                <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-subtle-fg hover:text-base-fg">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
