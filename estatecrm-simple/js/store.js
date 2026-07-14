// ============================================================================
// Merkezi veri deposu — basit bellek içi önbellek (React Query'nin sade hali)
// ============================================================================

const Store = {
  properties: null,
  agents: null,
  tags: null,
  favoriteIds: null,

  async loadProperties(force = false) {
    if (this.properties && !force) return this.properties;
    this.properties = await API.getProperties();
    return this.properties;
  },

  async loadAgents(force = false) {
    if (this.agents && !force) return this.agents;
    this.agents = await API.getAgents(true);
    return this.agents;
  },

  async loadTags(force = false) {
    if (this.tags && !force) return this.tags;
    this.tags = await API.getTags();
    return this.tags;
  },

  async loadFavoriteIds(force = false) {
    if (this.favoriteIds && !force) return this.favoriteIds;
    this.favoriteIds = await API.getFavoriteIds();
    return this.favoriteIds;
  },

  invalidateProperties() { this.properties = null; },
  invalidateFavorites() { this.favoriteIds = null; },
  invalidateAll() { this.properties = null; this.agents = null; this.tags = null; this.favoriteIds = null; },
};

// ============================================================================
// Gerçek zamanlı senkronizasyon — tüm bağlı kullanıcılar arasında canlı güncelleme
// ============================================================================

const RealtimeSync = {
  channel: null,

  start() {
    if (this.channel) return;
    this.channel = supabase
      .channel('estatecrm-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        Store.invalidateProperties();
        Router.rerenderIfPath(['/', '/properties', '/map', '/favorites']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_notes' }, () => {
        Router.rerenderIfPath(['/properties']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_events' }, () => {
        Router.rerenderIfPath(['/properties']);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, () => {
        Router.rerenderIfPath(['/', '/activity']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        await Shell.refreshTaskCount();
        Router.rerenderIfPath(['/', '/tasks']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => {
        Store.invalidateFavorites();
        Router.rerenderIfPath(['/', '/favorites', '/properties']);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        Notifications.refreshDot();
        const agent = AgentIdentity.current;
        if (agent && payload.new.recipient_agent_id === agent.id) {
          Toast.info(payload.new.title);
        }
      })
      .subscribe();
  },
};
