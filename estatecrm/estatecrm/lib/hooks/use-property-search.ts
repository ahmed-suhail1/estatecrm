'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { supabase } from '@/lib/supabase/client';
import type { PropertyWithRelations, PropertyStatus, ListingType, PropertyType } from '@/types/database';

// ============================================================================
// Search strategy
// ----------------------------------------------------------------------------
// 1. All non-deleted properties (with relations) are fetched once and cached
//    by React Query (staleTime 30s, realtime invalidation on writes). For an
//    office of 5-15 agents this is comfortably a few hundred to low
//    thousands of rows — fetching the full set client-side and searching
//    in-memory with Fuse.js gives *instant*, typo-tolerant, multi-field
//    search with zero network latency per keystroke, which beats a
//    server round-trip per query for this data scale.
// 2. For larger datasets (thousands+ of listings) this hook can be swapped
//    to call the `search_properties` Postgres function (full-text + trigram,
//    see migration 0001/0002) server-side instead — the UI layer doesn't
//    need to change, only this hook.
// 3. Filters (price, beds, status, etc.) are applied as a pre-filter before
//    fuzzy search, and also work standalone with an empty query.
// ============================================================================

export interface PropertyFilters {
  query?: string;
  listingType?: ListingType | 'all';
  propertyType?: PropertyType | 'all';
  status?: PropertyStatus | 'all';
  city?: string;
  district?: string;
  agentId?: string | 'all';
  tagIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}

async function fetchAllProperties(): Promise<PropertyWithRelations[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(
      `*, owner:owners(*), assigned_agent:agents(*), images:property_images(*), tags:property_tags(tag:tags(*))`
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p) => ({
    ...p,
    tags: (p.tags as unknown as { tag: PropertyWithRelations['tags'] }[])?.map((t) => t.tag).flat() ?? [],
  })) as unknown as PropertyWithRelations[];
}

export function useAllProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: fetchAllProperties,
    staleTime: 15_000,
  });
}

const fuseOptions: import('fuse.js').IFuseOptions<PropertyWithRelations> = {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'address', weight: 2 },
    { name: 'city', weight: 1.5 },
    { name: 'district', weight: 1.5 },
    { name: 'owner.name', weight: 1.5 },
    { name: 'owner.phone', weight: 2 },
    { name: 'assigned_agent.name', weight: 1 },
    { name: 'code', weight: 2 },
    { name: 'status', weight: 0.5 },
    { name: 'description', weight: 0.5 },
    { name: 'tags.label', weight: 1 },
  ],
  threshold: 0.32,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function useFilteredProperties(filters: PropertyFilters) {
  const { data: properties, isLoading, error } = useAllProperties();

  const fuse = useMemo(() => {
    if (!properties) return null;
    return new Fuse(properties, fuseOptions);
  }, [properties]);

  const results = useMemo(() => {
    if (!properties) return [];

    let base = properties;

    // Text search first (fuzzy, multi-field)
    const q = filters.query?.trim();
    if (q && q.length > 0 && fuse) {
      // Also match raw numeric price / property code exactly, since Fuse's
      // fuzzy matching on numbers-as-strings can be unreliable.
      const asNumber = Number(q.replace(/[^0-9.]/g, ''));
      const exactMatches = !isNaN(asNumber)
        ? base.filter((p) => p.code === asNumber || p.price === asNumber)
        : [];
      const fuzzyMatches = fuse.search(q).map((r) => r.item);
      const merged = [...exactMatches, ...fuzzyMatches];
      const seen = new Set<string>();
      base = merged.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    }

    base = base.filter((p) => {
      if (filters.listingType && filters.listingType !== 'all' && p.listing_type !== filters.listingType)
        return false;
      if (filters.propertyType && filters.propertyType !== 'all' && p.property_type !== filters.propertyType)
        return false;
      if (filters.status && filters.status !== 'all' && p.status !== filters.status) return false;
      if (filters.city && p.city !== filters.city) return false;
      if (filters.district && p.district !== filters.district) return false;
      if (filters.agentId && filters.agentId !== 'all' && p.assigned_agent_id !== filters.agentId)
        return false;
      if (filters.tagIds && filters.tagIds.length > 0) {
        const propTagIds = new Set((p.tags ?? []).map((t) => t.id));
        if (!filters.tagIds.some((id) => propTagIds.has(id))) return false;
      }
      if (filters.minPrice != null && p.price < filters.minPrice) return false;
      if (filters.maxPrice != null && p.price > filters.maxPrice) return false;
      if (filters.minBedrooms != null && (p.bedrooms ?? 0) < filters.minBedrooms) return false;
      if (filters.minBathrooms != null && (p.bathrooms ?? 0) < filters.minBathrooms) return false;
      if (filters.minArea != null && (p.area_sqm ?? 0) < filters.minArea) return false;
      if (filters.maxArea != null && (p.area_sqm ?? Infinity) > filters.maxArea) return false;
      return true;
    });

    if (!q) {
      switch (filters.sort) {
        case 'oldest':
          base = [...base].sort((a, b) => a.created_at.localeCompare(b.created_at));
          break;
        case 'price_asc':
          base = [...base].sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          base = [...base].sort((a, b) => b.price - a.price);
          break;
        default:
          base = [...base].sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
    }

    return base;
  }, [properties, fuse, filters]);

  return { results, isLoading, error, total: properties?.length ?? 0 };
}
