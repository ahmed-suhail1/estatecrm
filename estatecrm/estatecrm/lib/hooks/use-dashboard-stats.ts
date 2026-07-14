'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface DashboardStats {
  totalListings: number;
  newToday: number;
  sold: number;
  rentals: number;
  available: number;
  tasksDueToday: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [total, newToday, sold, rentals, available, tasksDueToday] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .gte('created_at', startOfDay.toISOString()),
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'sold'),
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('listing_type', 'rent'),
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'available'),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('is_completed', false)
          .lte('due_date', endOfDay.toISOString()),
      ]);

      return {
        totalListings: total.count ?? 0,
        newToday: newToday.count ?? 0,
        sold: sold.count ?? 0,
        rentals: rentals.count ?? 0,
        available: available.count ?? 0,
        tasksDueToday: tasksDueToday.count ?? 0,
      };
    },
    staleTime: 10_000,
  });
}
