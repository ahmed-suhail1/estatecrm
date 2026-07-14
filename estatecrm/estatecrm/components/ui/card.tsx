import { cn } from '@/lib/utils';
import * as React from 'react';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-card',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';
