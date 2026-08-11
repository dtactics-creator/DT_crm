import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const Select = forwardRef<HTMLSelectElement, Props>(({ className, invalid, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'w-full h-10 pl-3.5 pr-9 rounded-lg bg-surface text-base-fg text-sm appearance-none cursor-pointer',
        'border transition-all duration-150 outline-none',
        'focus:ring-2 focus:ring-offset-0 ring-brand focus:border-brand-500',
        invalid ? 'border-red-400 focus:border-red-500' : 'border-app',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg" />
  </div>
));
Select.displayName = 'Select';
export default Select;
