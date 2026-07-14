'use client';

import Link from 'next/link';
import type { PropertyWithRelations } from '@/types/database';
import { PROPERTY_STATUS_META } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { Building2 } from 'lucide-react';

export function PropertyRow({ property }: { property: PropertyWithRelations }) {
  const meta = PROPERTY_STATUS_META[property.status];
  const cover = property.images?.[0]?.url;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-surface-hover"
    >
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{property.title}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(property.price, property.currency)}</p>
      </div>
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ color: meta.color, backgroundColor: meta.bg }}>
        {meta.label}
      </span>
    </Link>
  );
}
