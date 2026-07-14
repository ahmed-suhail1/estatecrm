// ============================================================================
// API katmanı — tüm Supabase sorgu ve yazma işlemleri burada toplanır.
// Her yazma işlemi AgentIdentity.requireId() ile temsilciyi damgalar, böylece
// "her işlem kim tarafından yapıldı" kuralı tek noktadan garanti edilir.
// ============================================================================

const API = {
  // ---------------- Agents ----------------
  async getAgents(activeOnly = true) {
    let q = supabase.from('agents').select('*').order('name');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async addAgent(name) {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const { data, error } = await supabase.from('agents').insert({ name, avatar_color: color }).select().single();
    if (error) throw error;
    return data;
  },

  async setAgentActive(id, isActive) {
    const { error } = await supabase.from('agents').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },

  // ---------------- Tags ----------------
  async getTags() {
    const { data, error } = await supabase.from('tags').select('*').order('label');
    if (error) throw error;
    return data;
  },

  // ---------------- Properties ----------------
  async getProperties() {
    const { data, error } = await supabase
      .from('properties')
      .select(`*, owner:owners(*), assigned_agent:agents(*), images:property_images(*), tags:property_tags(tag:tags(*))`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((p) => ({ ...p, tags: (p.tags || []).map((t) => t.tag) }));
  },

  async getProperty(id) {
    const { data, error } = await supabase
      .from('properties')
      .select(`*, owner:owners(*), assigned_agent:agents(*), images:property_images(*), tags:property_tags(tag:tags(*))`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      ...data,
      images: (data.images || []).sort((a, b) => a.position - b.position),
      tags: (data.tags || []).map((t) => t.tag),
    };
  },

  async createProperty(input) {
    const agentId = AgentIdentity.requireId();
    const { tag_ids, ...rest } = input;
    const { data, error } = await supabase
      .from('properties')
      .insert({ ...rest, created_by: agentId, updated_by: agentId })
      .select()
      .single();
    if (error) throw error;
    if (tag_ids && tag_ids.length) {
      await supabase.from('property_tags').insert(tag_ids.map((tag_id) => ({ property_id: data.id, tag_id })));
    }
    return data;
  },

  async updateProperty(id, patch) {
    const agentId = AgentIdentity.requireId();
    const { tag_ids, ...rest } = patch;
    const { data, error } = await supabase
      .from('properties')
      .update({ ...rest, updated_by: agentId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (tag_ids !== undefined) {
      await supabase.from('property_tags').delete().eq('property_id', id);
      if (tag_ids.length) {
        await supabase.from('property_tags').insert(tag_ids.map((tag_id) => ({ property_id: id, tag_id })));
      }
    }
    return data;
  },

  async changeStatus(id, status) {
    const agentId = AgentIdentity.requireId();
    const { error } = await supabase.from('properties').update({ status, updated_by: agentId }).eq('id', id);
    if (error) throw error;
  },

  async uploadImage(propertyId, file, position) {
    const agentId = AgentIdentity.requireId();
    const ext = file.name.split('.').pop();
    const path = `${propertyId}/${uuid()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('property-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(path);
    const { error } = await supabase
      .from('property_images')
      .insert({ property_id: propertyId, url: urlData.publicUrl, storage_path: path, position, created_by: agentId });
    if (error) throw error;
  },

  async deleteImage(imageId, storagePath) {
    await supabase.from('property_images').delete().eq('id', imageId);
    if (storagePath) await supabase.storage.from('property-images').remove([storagePath]);
  },

  async getPropertyEvents(propertyId) {
    const { data, error } = await supabase
      .from('property_events')
      .select('*, agent:agents(*)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPropertyVersions(propertyId) {
    const { data, error } = await supabase
      .from('property_versions')
      .select('*, agent:agents(*)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async restoreVersion(propertyId, versionId) {
    const agentId = AgentIdentity.requireId();
    const { data: version, error: fErr } = await supabase.from('property_versions').select('snapshot').eq('id', versionId).single();
    if (fErr) throw fErr;
    const snap = { ...version.snapshot };
    delete snap.id; delete snap.created_at; delete snap.updated_at; delete snap.search_vector;
    const { error } = await supabase.from('properties').update({ ...snap, updated_by: agentId }).eq('id', propertyId);
    if (error) throw error;
    await supabase.from('property_events').insert({ property_id: propertyId, agent_id: agentId, event_type: 'restored_version', summary: 'Önceki bir sürüm geri yüklendi' });
  },

  // ---------------- Notes ----------------
  async getPropertyNotes(propertyId) {
    const { data, error } = await supabase
      .from('property_notes')
      .select('*, agent:agents(*)')
      .eq('property_id', propertyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async addNote(propertyId, body, mentionedAgentIds = []) {
    const agentId = AgentIdentity.requireId();
    const { data, error } = await supabase
      .from('property_notes')
      .insert({ property_id: propertyId, agent_id: agentId, body, mentioned_agent_ids: mentionedAgentIds })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ---------------- Favorites ----------------
  async getFavoriteIds() {
    const agentId = AgentIdentity.current?.id;
    if (!agentId) return [];
    const { data, error } = await supabase.from('favorites').select('property_id').eq('agent_id', agentId);
    if (error) throw error;
    return data.map((f) => f.property_id);
  },

  async toggleFavorite(propertyId, isFav) {
    const agentId = AgentIdentity.requireId();
    if (isFav) {
      const { error } = await supabase.from('favorites').delete().eq('agent_id', agentId).eq('property_id', propertyId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('favorites').insert({ agent_id: agentId, property_id: propertyId });
      if (error) throw error;
    }
  },

  // ---------------- Recently viewed ----------------
  async recordView(propertyId) {
    const agentId = AgentIdentity.current?.id;
    if (!agentId) return;
    await supabase.from('recently_viewed').upsert(
      { agent_id: agentId, property_id: propertyId, viewed_at: new Date().toISOString() },
      { onConflict: 'agent_id,property_id' }
    );
  },

  async getRecentlyViewed(limit = 6) {
    const agentId = AgentIdentity.current?.id;
    if (!agentId) return [];
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('viewed_at, property:properties(*, images:property_images(*))')
      .eq('agent_id', agentId)
      .order('viewed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map((r) => r.property).filter(Boolean);
  },

  // ---------------- Owners ----------------
  async getOwners(query) {
    let q = supabase.from('owners').select('*').is('deleted_at', null).order('name');
    if (query && query.trim()) {
      q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async getOwner(id) {
    const { data, error } = await supabase.from('owners').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getOwnerProperties(ownerId) {
    const { data, error } = await supabase
      .from('properties')
      .select('*, images:property_images(*)')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createOwner(input) {
    const agentId = AgentIdentity.current?.id;
    const { data, error } = await supabase.from('owners').insert({ ...input, created_by: agentId }).select().single();
    if (error) throw error;
    return data;
  },

  async updateOwner(id, patch) {
    const { data, error } = await supabase.from('owners').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ---------------- Duplicate detection ----------------
  async findSimilarOwners(phone, name) {
    const { data, error } = await supabase.rpc('find_similar_owners', { p_phone: phone || null, p_name: name || null });
    if (error) throw error;
    return data || [];
  },

  async findSimilarProperties(address, city) {
    const { data, error } = await supabase.rpc('find_similar_properties', { p_address: address || null, p_city: city || null });
    if (error) throw error;
    return data || [];
  },

  // ---------------- Tasks ----------------
  async getTasks({ onlyMine } = {}) {
    let q = supabase.from('tasks').select('*, assigned_agent:agents(*), property:properties(*)').order('due_date', { ascending: true, nullsFirst: false });
    if (onlyMine) {
      const agentId = AgentIdentity.current?.id;
      if (agentId) q = q.eq('assigned_agent_id', agentId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async createTask(input) {
    const agentId = AgentIdentity.current?.id;
    const { data, error } = await supabase.from('tasks').insert({ ...input, created_by: agentId }).select().single();
    if (error) throw error;
    await supabase.from('activity_feed').insert({
      agent_id: agentId, entity_type: 'task', entity_id: data.id, verb: 'created', summary: `Yeni görev oluşturuldu: ${input.title}`,
    });
    return data;
  },

  async toggleTaskComplete(id, isCompleted) {
    const { error } = await supabase.from('tasks').update({ is_completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null }).eq('id', id);
    if (error) throw error;
  },

  async countTasksDueToday() {
    const agentId = AgentIdentity.current?.id;
    if (!agentId) return 0;
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .eq('is_completed', false)
      .lte('due_date', end.toISOString());
    return count || 0;
  },

  // ---------------- Activity feed ----------------
  async getActivityFeed(limit = 30) {
    const { data, error } = await supabase.from('activity_feed').select('*, agent:agents(*)').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },

  // ---------------- Notifications ----------------
  async getNotifications(agentId, limit = 30) {
    const { data, error } = await supabase.from('notifications').select('*').eq('recipient_agent_id', agentId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },

  async markAllNotificationsRead(agentId) {
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_agent_id', agentId).eq('is_read', false);
  },

  // ---------------- Dashboard stats ----------------
  async getDashboardStats() {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [total, newToday, sold, rentals, tasksDueToday] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('properties').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startOfDay.toISOString()),
      supabase.from('properties').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'sold'),
      supabase.from('properties').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('listing_type', 'rent'),
      API.countTasksDueToday(),
    ]);
    return {
      totalListings: total.count || 0,
      newToday: newToday.count || 0,
      sold: sold.count || 0,
      rentals: rentals.count || 0,
      tasksDueToday,
    };
  },
};
