'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOwnerDetail, useOwnerProperties } from '@/lib/hooks/use-owners';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { PropertyRow } from '@/components/properties/property-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, MessageCircle, Mail, Building2 } from 'lucide-react';
import { phoneToCall, phoneToWhatsApp, initials } from '@/lib/utils';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOwner } from '@/lib/hooks/use-owners';
import { toast } from 'sonner';

export default function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: owner, isLoading } = useOwnerDetail(id);
  const { data: properties } = useOwnerProperties(id);
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null);

  const saveNotes = useMutation({
    mutationFn: (n: string) => updateOwner(id, { notes: n }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', id] });
      toast.success('Notes saved');
    },
  });

  if (isLoading || !owner) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-16">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xl">
            {initials(owner.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold">{owner.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {owner.phone && <span>{owner.phone}</span>}
              {owner.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{owner.email}</span>}
            </div>
            <div className="flex gap-2 mt-4">
              {owner.phone && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={phoneToCall(owner.phone)}><Phone className="h-3.5 w-3.5" /> Call</a>
                </Button>
              )}
              {(owner.whatsapp || owner.phone) && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={phoneToWhatsApp(owner.whatsapp || owner.phone || '')} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Notes</h2>
        <Textarea
          value={notes ?? owner.notes ?? ''}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Private notes about this owner..."
        />
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={notes == null || notes === owner.notes}
          loading={saveNotes.isPending}
          onClick={() => notes != null && saveNotes.mutate(notes)}
        >
          Save notes
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Properties ({properties?.length ?? 0})
        </h2>
        {!properties || properties.length === 0 ? (
          <EmptyState icon={Building2} title="No properties yet" className="py-8" />
        ) : (
          <div className="space-y-1">
            {properties.map((p) => (
              <PropertyRow key={p.id} property={p} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
