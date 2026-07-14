'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface SimilarOwner {
  id: string;
  name: string;
  phone: string | null;
  similarity: number;
}

export interface SimilarProperty {
  id: string;
  title: string;
  address: string | null;
  code: number;
  similarity: number;
}

export function useSimilarOwners(phone?: string, name?: string) {
  return useQuery({
    queryKey: ['similar-owners', phone, name],
    queryFn: async (): Promise<SimilarOwner[]> => {
      if (!phone && !name) return [];
      const { data, error } = await supabase.rpc('find_similar_owners', {
        p_phone: phone || null,
        p_name: name || null,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!(phone && phone.length >= 4) || !!(name && name.length >= 3),
    staleTime: 5_000,
  });
}

export function useSimilarProperties(address?: string, city?: string) {
  return useQuery({
    queryKey: ['similar-properties', address, city],
    queryFn: async (): Promise<SimilarProperty[]> => {
      if (!address) return [];
      const { data, error } = await supabase.rpc('find_similar_properties', {
        p_address: address,
        p_city: city || null,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!(address && address.length >= 6),
    staleTime: 5_000,
  });
}
