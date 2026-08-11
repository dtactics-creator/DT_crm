import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full px-3.5 py-2.5 rounded-lg bg-surface text-base-fg text-sm placeholder:text-subtle-fg resize-none',
      'border transition-all duration-150 outline-none min-h-[90px]',
      'focus:ring-2 focus:ring-offset-0 ring-brand focus:border-brand-500',
      invalid ? 'border-red-400 focus:border-red-500' : 'border-app',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
export default Textarea;
