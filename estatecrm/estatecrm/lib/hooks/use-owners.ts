'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAgentId } from '@/lib/stores/agent-store';
import type { Owner, Property } from '@/types/database';

export function useOwners(searchQuery?: string) {
  return useQuery({
    queryKey: ['owners', searchQuery],
    queryFn: async (): Promise<Owner[]> => {
      let query = supabase.from('owners').select('*').is('deleted_at', null).order('name');
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOwnerDetail(id: string) {
  return useQuery({
    queryKey: ['owner', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('owners').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Owner;
    },
    enabled: !!id,
  });
}

export function useOwnerProperties(ownerId: string) {
  return useQuery({
    queryKey: ['owner-properties', ownerId],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, images:property_images(*)')
        .eq('owner_id', ownerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Property[];
    },
    enabled: !!ownerId,
  });
}

export interface CreateOwnerInput {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
}

export async function createOwner(input: CreateOwnerInput) {
  const { data, error } = await supabase
    .from('owners')
    .insert({ ...input, created_by: getCurrentAgentId() })
    .select()
    .single();
  if (error) throw error;
  return data as Owner;
}

export async function updateOwner(id: string, patch: Partial<CreateOwnerInput>) {
  const { data, error } = await supabase.from('owners').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Owner;
}
