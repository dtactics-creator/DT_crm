import type { ReactNode } from 'react';

export default function Field({ label, error, required, hint, children }: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[13px] font-semibold text-base-fg">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-subtle-fg">{hint}</p>
      ) : null}
    </div>
  );
}
