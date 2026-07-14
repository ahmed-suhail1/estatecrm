'use client';

import { useMemo } from 'react';
import { useFavorites } from '@/lib/hooks/use-favorites';
import { useAllProperties } from '@/lib/hooks/use-property-search';
import { PropertyCard } from '@/components/properties/property-card';
import { PropertyCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Star } from 'lucide-react';

export default function FavoritesPage() {
  const { data: favoriteIds, isLoading: favLoading } = useFavorites();
  const { data: allProperties, isLoading: propsLoading } = useAllProperties();

  const favorites = useMemo(() => {
    if (!allProperties || !favoriteIds) return [];
    const set = new Set(favoriteIds);
    return allProperties.filter((p) => set.has(p.id)).map((p) => ({ ...p, is_favorited: true }));
  }, [allProperties, favoriteIds]);

  const isLoading = favLoading || propsLoading;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Properties you&rsquo;ve starred</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState icon={Star} title="No favorites yet" description="Star properties from any listing to save them here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  );
}
