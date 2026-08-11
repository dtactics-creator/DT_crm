import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, Props>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full h-10 px-3.5 rounded-lg bg-surface text-base-fg text-sm placeholder:text-subtle-fg',
      'border transition-all duration-150 outline-none',
      'focus:ring-2 focus:ring-offset-0 ring-brand focus:border-brand-500',
      invalid ? 'border-red-400 focus:border-red-500' : 'border-app',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
export default Input;
