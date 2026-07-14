import { supabase } from '@/lib/supabase/client';
import { getCurrentAgentId } from '@/lib/stores/agent-store';
import type { Property, PropertyStatus } from '@/types/database';

/**
 * All property writes go through this module so that "every action records
 * which agent performed it" is enforced in one place rather than trusted to
 * be remembered at every call site across the app.
 */

export interface CreatePropertyInput {
  title: string;
  description?: string;
  price: number;
  currency: string;
  listing_type: 'sale' | 'rent';
  property_type: Property['property_type'];
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  floor?: string;
  building_age?: number;
  address?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  owner_id?: string;
  assigned_agent_id?: string;
  status?: PropertyStatus;
  tag_ids?: string[];
}

function requireAgent(): string {
  const id = getCurrentAgentId();
  if (!id) throw new Error('No agent identity set. Please select an agent first.');
  return id;
}

export async function createProperty(input: CreatePropertyInput) {
  const agentId = requireAgent();
  const { tag_ids, ...rest } = input;

  const { data, error } = await supabase
    .from('properties')
    .insert({ ...rest, created_by: agentId, updated_by: agentId })
    .select()
    .single();

  if (error) throw error;

  if (tag_ids && tag_ids.length > 0) {
    await supabase
      .from('property_tags')
      .insert(tag_ids.map((tag_id) => ({ property_id: data.id, tag_id })));
  }

  return data as Property;
}

export async function updateProperty(id: string, patch: Partial<CreatePropertyInput>) {
  const agentId = requireAgent();
  const { tag_ids, ...rest } = patch;

  const { data, error } = await supabase
    .from('properties')
    .update({ ...rest, updated_by: agentId })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (tag_ids) {
    await supabase.from('property_tags').delete().eq('property_id', id);
    if (tag_ids.length > 0) {
      await supabase
        .from('property_tags')
        .insert(tag_ids.map((tag_id) => ({ property_id: id, tag_id })));
    }
  }

  return data as Property;
}

export async function softDeleteProperty(id: string) {
  const agentId = requireAgent();
  const { error } = await supabase
    .from('properties')
    .update({ deleted_at: new Date().toISOString(), updated_by: agentId })
    .eq('id', id);
  if (error) throw error;
}

export async function changePropertyStatus(id: string, status: PropertyStatus) {
  const agentId = requireAgent();
  const { error } = await supabase
    .from('properties')
    .update({ status, updated_by: agentId })
    .eq('id', id);
  if (error) throw error;
}

export async function addPropertyNote(propertyId: string, body: string, mentionedAgentIds: string[] = []) {
  const agentId = requireAgent();
  const { data, error } = await supabase
    .from('property_notes')
    .insert({
      property_id: propertyId,
      agent_id: agentId,
      body,
      mentioned_agent_ids: mentionedAgentIds,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleFavorite(propertyId: string, isFavorited: boolean) {
  const agentId = requireAgent();
  if (isFavorited) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('agent_id', agentId)
      .eq('property_id', propertyId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({ agent_id: agentId, property_id: propertyId });
    if (error) throw error;
  }
}

export async function recordView(propertyId: string) {
  const agentId = getCurrentAgentId();
  if (!agentId) return;
  await supabase
    .from('recently_viewed')
    .upsert(
      { agent_id: agentId, property_id: propertyId, viewed_at: new Date().toISOString() },
      { onConflict: 'agent_id,property_id' }
    );
}

export async function uploadPropertyImage(propertyId: string, file: File, position: number) {
  const agentId = requireAgent();
  const ext = file.name.split('.').pop();
  const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('property-images')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(path);

  const { error } = await supabase.from('property_images').insert({
    property_id: propertyId,
    url: urlData.publicUrl,
    storage_path: path,
    position,
    created_by: agentId,
  });
  if (error) throw error;
}

export async function deletePropertyImage(imageId: string, storagePath: string | null) {
  await supabase.from('property_images').delete().eq('id', imageId);
  if (storagePath) {
    await supabase.storage.from('property-images').remove([storagePath]);
  }
}

export async function restorePropertyVersion(propertyId: string, versionId: string) {
  const agentId = requireAgent();
  const { data: version, error: fetchError } = await supabase
    .from('property_versions')
    .select('snapshot')
    .eq('id', versionId)
    .single();
  if (fetchError) throw fetchError;

  const snapshot = version.snapshot as Record<string, unknown>;
  const restorable = { ...snapshot };
  delete restorable.id;
  delete restorable.created_at;
  delete restorable.updated_at;
  delete restorable.search_vector;

  const { error } = await supabase
    .from('properties')
    .update({ ...restorable, updated_by: agentId })
    .eq('id', propertyId);
  if (error) throw error;

  await supabase.from('property_events').insert({
    property_id: propertyId,
    agent_id: agentId,
    event_type: 'restored_version',
    summary: 'Restored a previous version',
  });
}
