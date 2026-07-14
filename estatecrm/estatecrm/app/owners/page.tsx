'use client';

import { useState } from 'react';
import { useOwners } from '@/lib/hooks/use-owners';
import { NewOwnerDialog } from '@/components/owners/new-owner-dialog';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Phone, MessageCircle } from 'lucide-react';
import { phoneToCall, phoneToWhatsApp, initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OwnersPage() {
  const [query, setQuery] = useState('');
  const { data: owners, isLoading } = useOwners(query);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Owners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{owners?.length ?? 0} property owners</p>
        </div>
        <NewOwnerDialog />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, email..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !owners || owners.length === 0 ? (
        <EmptyState icon={Users} title="No owners found" description="Add your first property owner to get started." />
      ) : (
        <div className="space-y-2">
          {owners.map((owner) => (
            <Card key={owner.id} className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {initials(owner.name)}
              </div>
              <Link href={`/owners/${owner.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate hover:text-primary transition-colors">{owner.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[owner.phone, owner.email].filter(Boolean).join(' · ') || 'No contact info'}
                </p>
              </Link>
              <div className="flex gap-1.5 shrink-0">
                {owner.phone && (
                  <Button size="icon-sm" variant="secondary" asChild>
                    <a href={phoneToCall(owner.phone)}><Phone className="h-3.5 w-3.5" /></a>
                  </Button>
                )}
                {(owner.whatsapp || owner.phone) && (
                  <Button size="icon-sm" variant="secondary" asChild>
                    <a href={phoneToWhatsApp(owner.whatsapp || owner.phone || '')} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
