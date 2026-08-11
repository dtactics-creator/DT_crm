import type { ReactNode } from 'react';

export default function EmptyState({ icon, title, description, action }: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-14 w-14 rounded-2xl bg-surface-2 border border-app flex items-center justify-center text-subtle-fg mb-4">
        {icon}
      </div>
      <h3 className="text-[15px] font-bold text-base-fg">{title}</h3>
      <p className="text-[13px] text-muted-fg mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
