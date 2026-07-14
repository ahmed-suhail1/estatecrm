'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePropertyVersions } from '@/lib/hooks/use-property-detail';
import { restorePropertyVersion } from '@/lib/mutations/properties';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';
import { History, RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import type { Property } from '@/types/database';

export function PropertyVersionHistory({ propertyId }: { propertyId: string }) {
  const { data: versions, isLoading } = usePropertyVersions(propertyId);
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restorePropertyVersion(propertyId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property-events', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property-versions', propertyId] });
      toast.success('Version restored');
    },
    onError: () => toast.error('Could not restore version'),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Loading…</div>;
  if (!versions || versions.length === 0) {
    return <EmptyState icon={History} title="No version history" className="py-6" />;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
      {versions.map((v, i) => {
        const snap = v.snapshot as unknown as Property;
        return (
          <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={v.agent?.name ?? 'System'}
                color={v.agent?.avatar_color}
                url={v.agent?.avatar_url}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {formatCurrency(snap.price, snap.currency)} · {snap.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.agent?.name ?? 'System'} · {formatRelativeTime(v.created_at)}
                </p>
              </div>
            </div>
            {i !== 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => restoreMutation.mutate(v.id)}
                loading={restoreMutation.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            )}
            {i === 0 && <span className="text-xs text-muted-foreground shrink-0">Current</span>}
          </div>
        );
      })}
    </div>
  );
}
