'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { SlidersHorizontal, X } from 'lucide-react';
import type { PropertyFilters } from '@/lib/hooks/use-property-search';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_META } from '@/types/database';
import type { Agent, Tag } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function PropertyFiltersBar({
  filters,
  onChange,
}: {
  filters: PropertyFilters;
  onChange: (f: PropertyFilters) => void;
}) {
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('*').eq('is_active', true).order('name');
      return (data ?? []) as Agent[];
    },
  });
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await supabase.from('tags').select('*').order('label');
      return (data ?? []) as Tag[];
    },
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeAdvancedCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.minBedrooms,
    filters.minBathrooms,
    filters.minArea,
    filters.maxArea,
  ].filter((v) => v != null).length + (filters.tagIds?.length ?? 0);

  function update(patch: Partial<PropertyFilters>) {
    onChange({ ...filters, ...patch });
  }

  function toggleTag(id: string) {
    const current = filters.tagIds ?? [];
    update({ tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id] });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.listingType ?? 'all'} onValueChange={(v) => update({ listingType: v as PropertyFilters['listingType'] })}>
        <SelectTrigger className="w-[110px]"><SelectValue placeholder="Sale/Rent" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="sale">For Sale</SelectItem>
          <SelectItem value="rent">For Rent</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.propertyType ?? 'all'} onValueChange={(v) => update({ propertyType: v as PropertyFilters['propertyType'] })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {Object.entries(PROPERTY_TYPE_LABELS).map(([k, label]) => (
            <SelectItem key={k} value={k}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status ?? 'all'} onValueChange={(v) => update({ status: v as PropertyFilters['status'] })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(PROPERTY_STATUS_META).map(([k, m]) => (
            <SelectItem key={k} value={k}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.agentId ?? 'all'} onValueChange={(v) => update({ agentId: v })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Agent" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {agents?.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.sort ?? 'newest'} onValueChange={(v) => update({ sort: v as PropertyFilters['sort'] })}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="price_asc">Price ↑</SelectItem>
          <SelectItem value="price_desc">Price ↓</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            More
            {activeAdvancedCount > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {activeAdvancedCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min price</Label>
                <Input type="number" placeholder="0" value={filters.minPrice ?? ''} onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <Label>Max price</Label>
                <Input type="number" placeholder="Any" value={filters.maxPrice ?? ''} onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <Label>Min beds</Label>
                <Input type="number" placeholder="Any" value={filters.minBedrooms ?? ''} onChange={(e) => update({ minBedrooms: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <Label>Min baths</Label>
                <Input type="number" placeholder="Any" value={filters.minBathrooms ?? ''} onChange={(e) => update({ minBathrooms: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <Label>Min m²</Label>
                <Input type="number" placeholder="Any" value={filters.minArea ?? ''} onChange={(e) => update({ minArea: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <Label>Max m²</Label>
                <Input type="number" placeholder="Any" value={filters.maxArea ?? ''} onChange={(e) => update({ maxArea: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>

            {tags && tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((tag) => {
                    const active = filters.tagIds?.includes(tag.id);
                    return (
                      <button key={tag.id} onClick={() => toggleTag(tag.id)}>
                        <Badge
                          color={active ? '#fff' : tag.color}
                          bg={active ? tag.color : `${tag.color}20`}
                          className={cn('cursor-pointer transition-all', active && 'ring-2 ring-offset-1 ring-offset-surface')}
                          style={active ? ({ '--tw-ring-color': tag.color } as React.CSSProperties) : undefined}
                        >
                          {tag.label}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() =>
                update({
                  minPrice: undefined,
                  maxPrice: undefined,
                  minBedrooms: undefined,
                  minBathrooms: undefined,
                  minArea: undefined,
                  maxArea: undefined,
                  tagIds: [],
                })
              }
            >
              <X className="h-3.5 w-3.5" /> Clear advanced filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
