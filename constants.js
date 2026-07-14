// ============================================================================
// Sabitler ve Türkçe etiketler
// ============================================================================

const STATUS_META = {
  available: { label: 'Müsait', color: '#10b981', bg: 'rgba(16,185,129,0.13)' },
  reserved: { label: 'Rezerve', color: '#f59e0b', bg: 'rgba(245,158,11,0.13)' },
  negotiating: { label: 'Görüşülüyor', color: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
  sold: { label: 'Satıldı', color: '#8b5cf6', bg: 'rgba(139,92,246,0.13)' },
  rented: { label: 'Kiralandı', color: '#06b6d4', bg: 'rgba(6,182,212,0.13)' },
  archived: { label: 'Arşivlendi', color: '#6b7280', bg: 'rgba(107,114,128,0.13)' },
};

const PROPERTY_TYPE_LABELS = {
  apartment: 'Daire',
  villa: 'Villa',
  house: 'Müstakil Ev',
  office: 'Ofis',
  land: 'Arsa',
  shop: 'Dükkan',
  building: 'Bina',
  other: 'Diğer',
};

const LISTING_TYPE_LABELS = { sale: 'Satılık', rent: 'Kiralık' };

const PRIORITY_META = {
  low: { label: 'Düşük', color: '#6b7280' },
  medium: { label: 'Orta', color: '#3b82f6' },
  high: { label: 'Yüksek', color: '#f59e0b' },
  urgent: { label: 'Acil', color: '#ef4444' },
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'AED'];

const EVENT_ICONS = {
  created: 'plus',
  price_changed: 'dollar-sign',
  status_changed: 'refresh-cw',
  field_updated: 'edit-3',
  photos_added: 'image',
  photos_removed: 'image',
  note_added: 'message-square',
  agent_changed: 'user-cog',
  tag_added: 'tag',
  tag_removed: 'tag',
  restored_version: 'history',
};

const NOTIF_ICONS = {
  new_property: 'home',
  price_change: 'trending-up',
  mention: 'at-sign',
  task_assigned: 'check-square',
  property_sold: 'circle-dollar-sign',
  status_change: 'home',
  task_due_soon: 'check-square',
};
