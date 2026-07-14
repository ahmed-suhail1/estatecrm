'use client';

import Link from 'next/link';
import { Bed, Bath, Ruler, MapPin, Star, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatArea, cn } from '@/lib/utils';
import { PROPERTY_STATUS_META, PROPERTY_TYPE_LABELS, type PropertyWithRelations } from '@/types/database';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleFavorite } from '@/lib/mutations/properties';
import { toast } from 'sonner';

export function PropertyCard({ property }: { property: PropertyWithRelations }) {
  const meta = PROPERTY_STATUS_META[property.status];
  const cover = property.images?.[0]?.url;
  const queryClient = useQueryClient();

  const favMutation = useMutation({
    mutationFn: () => toggleFavorite(property.id, !!property.is_favorited),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['properties'] });
      queryClient.setQueryData<PropertyWithRelations[]>(['properties'], (old) =>
        old?.map((p) => (p.id === property.id ? { ...p, is_favorited: !p.is_favorited } : p))
      );
    },
    onError: () => toast.error('Could not update favorite'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface overflow-hidden shadow-card transition-all duration-200 hover:shadow-popover hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
            No photo
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md"
            style={{ color: meta.color, backgroundColor: meta.bg }}
          >
            {meta.label}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            favMutation.mutate();
          }}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(
              'h-4 w-4 transition-colors',
              property.is_favorited ? 'fill-amber-400 text-amber-400' : 'text-gray-500'
            )}
          />
        </button>
        <div className="absolute bottom-3 left-3">
          <span className="text-white text-base font-bold drop-shadow-lg">
            {formatCurrency(property.price, property.currency)}
            {property.listing_type === 'rent' && <span className="text-xs font-medium">/mo</span>}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-1">{property.title}</h3>
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground shrink-0 mt-0.5">
            <Hash className="h-3 w-3" />
            {property.code}
          </span>
        </div>

        {(property.district || property.city) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {property.district ? `${property.district}, ` : ''}
              {property.city}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
            </span>
          )}
          {property.area_sqm != null && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" /> {formatArea(property.area_sqm)}
            </span>
          )}
        </div>

        {property.tags && property.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {property.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} color={tag.color} bg={`${tag.color}20`}>
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between border-t border-border/60">
          <span className="text-[11px] text-muted-foreground">
            {PROPERTY_TYPE_LABELS[property.property_type]} · {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
          </span>
          {property.assigned_agent && (
            <Avatar
              name={property.assigned_agent.name}
              color={property.assigned_agent.avatar_color}
              url={property.assigned_agent.avatar_url}
              size="xs"
            />
          )}
        </div>
      </div>
    </Link>
  );
}
