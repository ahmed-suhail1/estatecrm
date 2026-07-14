'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PropertyForm, type NewOwnerDraft } from '@/components/properties/property-form';
import { updateProperty } from '@/lib/mutations/properties';
import { usePropertyDetail } from '@/lib/hooks/use-property-detail';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAgentId } from '@/lib/stores/agent-store';
import type { PropertyFormOutput } from '@/lib/validation/property-schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tag } from '@/types/database';

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

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: property, isLoading } = usePropertyDetail(id);

  const mutation = useMutation({
    mutationFn: async ({ values, newOwner }: { values: PropertyFormOutput; newOwner: NewOwnerDraft | null }) => {
      const owner_id = await resolveOwnerId(values, newOwner);
      return updateProperty(id, {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['property-events', id] });
      toast.success('Property updated');
      router.push(`/properties/${id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update property'),
  });

  if (isLoading || !property) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-20">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <h1 className="text-xl font-semibold mb-6">Edit Property</h1>
      <PropertyForm
        defaultValues={{
          ...property,
          description: property.description ?? '',
          bedrooms: property.bedrooms ?? undefined,
          bathrooms: property.bathrooms ?? undefined,
          area_sqm: property.area_sqm ?? undefined,
          floor: property.floor ?? '',
          building_age: property.building_age ?? undefined,
          address: property.address ?? '',
          city: property.city ?? '',
          district: property.district ?? '',
          lat: property.lat ?? undefined,
          lng: property.lng ?? undefined,
          owner_id: property.owner_id ?? '',
          assigned_agent_id: property.assigned_agent_id ?? '',
          tag_ids: (property.tags as unknown as Tag[])?.map((t) => t.id) ?? [],
        }}
        onSubmit={(values, newOwner) => mutation.mutate({ values, newOwner })}
        isSubmitting={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
