'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFilteredProperties, type PropertyFilters } from '@/lib/hooks/use-property-search';
import { PropertyCard } from '@/components/properties/property-card';
import { PropertyFiltersBar } from '@/components/properties/property-filters';
import { PropertyCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search } from 'lucide-react';
import { useFavoritesSet } from '@/lib/hooks/use-favorites';

export default function PropertiesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<PropertyFilters>({ sort: 'newest' });
  const { results, isLoading, total } = useFilteredProperties(filters);
  const favIds = useFavoritesSet();

  const withFavorites = results.map((p) => ({ ...p, is_favorited: favIds.has(p.id) }));

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Properties</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading…' : `${results.length} of ${total} listings`}
            </p>
          </div>
          <Button onClick={() => router.push('/properties/new')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Property</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, address, phone, ID, price..."
            className="pl-9 h-10"
            value={filters.query ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          />
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <PropertyFiltersBar filters={filters} onChange={setFilters} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : withFavorites.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties found"
          description="Try adjusting your search or filters, or add a new listing."
          action={
            <Button onClick={() => router.push('/properties/new')}>
              <Plus className="h-4 w-4" /> Add property
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {withFavorites.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
