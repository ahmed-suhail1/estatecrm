import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'hsl(var(--primary))',
  loading,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-4 flex items-center gap-3.5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-6 w-12 skeleton rounded" />
        ) : (
          <p className="text-xl font-semibold leading-none">{value}</p>
        )}
        <p className={cn('text-xs text-muted-foreground mt-1')}>{label}</p>
      </div>
    </Card>
  );
}
