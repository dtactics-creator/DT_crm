import { avatarColor, initials } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function Avatar({ name, src, size = 32, className }: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const color = avatarColor(name || '?');
  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size }} className={cn('rounded-full object-cover', className)} />;
  }
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white shrink-0', className)}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
    >
      {initials(name || '?')}
    </div>
  );
}
