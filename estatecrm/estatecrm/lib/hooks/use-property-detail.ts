'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { PropertyEvent, PropertyNote, Agent } from '@/types/database';

export function usePropertyDetail(id: string) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `*, owner:owners(*), assigned_agent:agents(*), images:property_images(*), tags:property_tags(tag:tags(*))`
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        images: (data.images ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
        tags: (data.tags as unknown as { tag: unknown }[])?.map((t) => t.tag) ?? [],
      };
    },
    enabled: !!id,
  });
}

export function usePropertyEvents(propertyId: string) {
  return useQuery({
    queryKey: ['property-events', propertyId],
    queryFn: async (): Promise<(PropertyEvent & { agent: Agent | null })[]> => {
      const { data, error } = await supabase
        .from('property_events')
        .select('*, agent:agents(*)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (PropertyEvent & { agent: Agent | null })[];
    },
    enabled: !!propertyId,
  });
}

export function usePropertyNotes(propertyId: string) {
  return useQuery({
    queryKey: ['property-notes', propertyId],
    queryFn: async (): Promise<(PropertyNote & { agent: Agent | null })[]> => {
      const { data, error } = await supabase
        .from('property_notes')
        .select('*, agent:agents(*)')
        .eq('property_id', propertyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as (PropertyNote & { agent: Agent | null })[];
    },
    enabled: !!propertyId,
  });
}

export function usePropertyVersions(propertyId: string) {
  return useQuery({
    queryKey: ['property-versions', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_versions')
        .select('*, agent:agents(*)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}
