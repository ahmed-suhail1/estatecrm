'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PropertyForm, type NewOwnerDraft } from '@/components/properties/property-form';
import { createProperty } from '@/lib/mutations/properties';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAgentId } from '@/lib/stores/agent-store';
import type { PropertyFormOutput } from '@/lib/validation/property-schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

async function resolveOwnerId(values: PropertyFormOutput, newOwner: NewOwnerDraft | null): Promise<string | undefined> {
  if (newOwner) {
    const { data, error } = await supabase
      .from('owners')
      .insert({
        name: newOwner.name,
        phone: newOwner.phone || null,
        whatsapp: newOwner.whatsapp || null,
        created_by: getCurrentAgentId(),
      })
      .select()
      .single();
    if (error) throw error;
    return data.id;
  }
  return values.owner_id || undefined;
}

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ values, newOwner }: { values: PropertyFormOutput; newOwner: NewOwnerDraft | null }) => {
      const owner_id = await resolveOwnerId(values, newOwner);
      return createProperty({
        ...values,
        owner_id,
        bedrooms: values.bedrooms === '' ? undefined : Number(values.bedrooms),
        bathrooms: values.bathrooms === '' ? undefined : Number(values.bathrooms),
        area_sqm: values.area_sqm === '' ? undefined : Number(values.area_sqm),
        building_age: values.building_age === '' ? undefined : Number(values.building_age),
        lat: values.lat === '' ? undefined : Number(values.lat),
        lng: values.lng === '' ? undefined : Number(values.lng),
        assigned_agent_id: values.assigned_agent_id || undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Property created');
      router.push(`/properties/${data.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not create property');
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-20">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <h1 className="text-xl font-semibold mb-6">New Property</h1>
      <PropertyForm
        onSubmit={(values, newOwner) => mutation.mutate({ values, newOwner })}
        isSubmitting={mutation.isPending}
        submitLabel="Create Property"
      />
    </div>
  );
}
