'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { SimilarOwner, SimilarProperty } from '@/lib/hooks/use-duplicate-detection';

export function DuplicateWarning({
  owners,
  properties,
}: {
  owners?: SimilarOwner[];
  properties?: SimilarProperty[];
}) {
  const hasOwners = owners && owners.length > 0;
  const hasProperties = properties && properties.length > 0;
  if (!hasOwners && !hasProperties) return null;

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 animate-slide-down">
      <div className="flex gap-2.5">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm min-w-0">
          {hasOwners && (
            <div>
              <p className="font-medium text-foreground">Possible existing owner match</p>
              <ul className="mt-1 space-y-0.5">
                {owners!.map((o) => (
                  <li key={o.id}>
                    <Link href={`/owners/${o.id}`} className="text-primary hover:underline" target="_blank">
                      {o.name} {o.phone ? `· ${o.phone}` : ''}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasProperties && (
            <div>
              <p className="font-medium text-foreground">Similar address already listed</p>
              <ul className="mt-1 space-y-0.5">
                {properties!.map((p) => (
                  <li key={p.id}>
                    <Link href={`/properties/${p.id}`} className="text-primary hover:underline" target="_blank">
                      #{p.code} — {p.title} ({p.address})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
