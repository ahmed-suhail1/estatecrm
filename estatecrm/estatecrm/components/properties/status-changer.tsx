'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePropertyStatus } from '@/lib/mutations/properties';
import { PROPERTY_STATUS_META, type PropertyStatus } from '@/types/database';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export function StatusChanger({ propertyId, status }: { propertyId: string; status: PropertyStatus }) {
  const queryClient = useQueryClient();
  const meta = PROPERTY_STATUS_META[status];

  const mutation = useMutation({
    mutationFn: (newStatus: PropertyStatus) => changePropertyStatus(propertyId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-events', propertyId] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Could not update status'),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {Object.entries(PROPERTY_STATUS_META).map(([key, m]) => (
          <DropdownMenuItem key={key} onClick={() => mutation.mutate(key as PropertyStatus)}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
