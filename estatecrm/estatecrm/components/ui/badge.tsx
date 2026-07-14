import { cn } from '@/lib/utils';

export function Badge({
  children,
  className,
  color,
  bg,
  variant = 'default',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  bg?: string;
  variant?: 'default' | 'outline';
  style?: React.CSSProperties;
}) {
  if (color && bg) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          className
        )}
        style={{ color, backgroundColor: bg, ...style }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border border-border text-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}
