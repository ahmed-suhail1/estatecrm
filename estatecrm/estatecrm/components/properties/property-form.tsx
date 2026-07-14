'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  propertyFormSchema,
  type PropertyFormValues,
  type PropertyFormOutput,
  CURRENCIES,
} from '@/lib/validation/property-schema';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Agent, Owner, Tag, PropertyType } from '@/types/database';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_META } from '@/types/database';
import { useSimilarOwners, useSimilarProperties } from '@/lib/hooks/use-duplicate-detection';
import { DuplicateWarning } from '@/components/properties/duplicate-warning';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export interface NewOwnerDraft {
  name: string;
  phone: string;
  whatsapp: string;
}

export function PropertyForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Property',
  isSubmitting,
}: {
  defaultValues?: Partial<PropertyFormValues>;
  onSubmit: (values: PropertyFormOutput, newOwner: NewOwnerDraft | null) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PropertyFormValues, unknown, PropertyFormOutput>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      currency: 'USD',
      listing_type: 'sale',
      property_type: 'apartment',
      status: 'available',
      tag_ids: [],
      ...defaultValues,
    },
  });

  const [ownerMode, setOwnerMode] = useState<'existing' | 'new'>('existing');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerWhatsapp, setNewOwnerWhatsapp] = useState('');

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('*').eq('is_active', true).order('name');
      return (data ?? []) as Agent[];
    },
  });
  const { data: owners } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data } = await supabase.from('owners').select('*').is('deleted_at', null).order('name');
      return (data ?? []) as Owner[];
    },
  });
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await supabase.from('tags').select('*').order('label');
      return (data ?? []) as Tag[];
    },
  });

  const watchedTagIds = watch('tag_ids') ?? [];
  const watchedAddress = watch('address');
  const watchedCity = watch('city');

  const { data: similarOwners } = useSimilarOwners(newOwnerPhone, newOwnerName);
  const { data: similarProperties } = useSimilarProperties(watchedAddress, watchedCity);

  function toggleTag(id: string) {
    setValue(
      'tag_ids',
      watchedTagIds.includes(id) ? watchedTagIds.filter((t) => t !== id) : [...watchedTagIds, id]
    );
  }

  function handleFormSubmit(values: PropertyFormOutput) {
    const newOwner =
      ownerMode === 'new' && newOwnerName.trim()
        ? { name: newOwnerName.trim(), phone: newOwnerPhone.trim(), whatsapp: newOwnerWhatsapp.trim() }
        : null;
    onSubmit(values, newOwner);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</h2>
        <div>
          <Label>Title *</Label>
          <Input {...register('title')} placeholder="e.g. Modern 2BR Apartment in Levent" />
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <Label>Description</Label>
          <Textarea {...register('description')} rows={4} placeholder="Describe the property..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Listing Type *</Label>
            <Select value={watch('listing_type')} onValueChange={(v) => setValue('listing_type', v as 'sale' | 'rent')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">For Sale</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property Type *</Label>
            <Select value={watch('property_type')} onValueChange={(v) => setValue('property_type', v as PropertyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={watch('status')} onValueChange={(v) => setValue('status', v as PropertyFormValues['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROPERTY_STATUS_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label>Price *</Label>
            <Input type="number" step="0.01" {...register('price')} placeholder="250000" />
            {errors.price && <p className="text-xs text-destructive mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Specifications</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <Label>Bedrooms</Label>
            <Input type="number" {...register('bedrooms')} />
          </div>
          <div>
            <Label>Bathrooms</Label>
            <Input type="number" {...register('bathrooms')} />
          </div>
          <div>
            <Label>Area (m²)</Label>
            <Input type="number" step="0.1" {...register('area_sqm')} />
          </div>
          <div>
            <Label>Floor</Label>
            <Input {...register('floor')} placeholder="3" />
          </div>
          <div>
            <Label>Building age</Label>
            <Input type="number" {...register('building_age')} placeholder="years" />
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location</h2>
        <div>
          <Label>Address</Label>
          <Input {...register('address')} placeholder="Street address" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>City</Label>
            <Input {...register('city')} />
          </div>
          <div>
            <Label>District</Label>
            <Input {...register('district')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Latitude</Label>
            <Input type="number" step="any" {...register('lat')} placeholder="41.0082" />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input type="number" step="any" {...register('lng')} placeholder="28.9784" />
          </div>
        </div>
        <DuplicateWarning properties={similarProperties} />
      </section>

      {/* Owner */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Owner</h2>
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setOwnerMode('existing')}
              className={cn('px-2 py-1 rounded-lg', ownerMode === 'existing' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
            >
              Existing
            </button>
            <button
              type="button"
              onClick={() => setOwnerMode('new')}
              className={cn('px-2 py-1 rounded-lg', ownerMode === 'new' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
            >
              + New owner
            </button>
          </div>
        </div>

        {ownerMode === 'existing' ? (
          <Select value={watch('owner_id') || undefined} onValueChange={(v) => setValue('owner_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select an owner" /></SelectTrigger>
            <SelectContent>
              {owners?.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name} {o.phone ? `· ${o.phone}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <Input placeholder="Owner name" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Phone" value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)} />
              <Input placeholder="WhatsApp (optional)" value={newOwnerWhatsapp} onChange={(e) => setNewOwnerWhatsapp(e.target.value)} />
            </div>
            <DuplicateWarning owners={similarOwners} />
            <p className="text-xs text-muted-foreground">
              This owner will be created when you save the property.
            </p>
          </div>
        )}
      </section>

      {/* Assignment & Tags */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assignment & Tags</h2>
        <div>
          <Label>Assigned Agent</Label>
          <Select value={watch('assigned_agent_id') || undefined} onValueChange={(v) => setValue('assigned_agent_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
            <SelectContent>
              {agents?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags?.map((tag) => {
              const active = watchedTagIds.includes(tag.id);
              return (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}>
                  <Badge
                    color={active ? '#fff' : tag.color}
                    bg={active ? tag.color : `${tag.color}20`}
                    className="cursor-pointer"
                  >
                    {tag.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 md:-mx-6 border-t border-border bg-surface/95 backdrop-blur-lg px-4 md:px-6 py-3 flex justify-end gap-2">
        <Button type="submit" loading={isSubmitting}>
          <Plus className="h-4 w-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
