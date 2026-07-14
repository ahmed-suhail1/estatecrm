// ============================================================================
// Core domain types — mirror the Postgres schema 1:1 so Supabase query
// results can be typed directly without a mapping layer.
// ============================================================================

export type ListingType = 'sale' | 'rent';

export type PropertyStatus =
  | 'available'
  | 'reserved'
  | 'negotiating'
  | 'sold'
  | 'rented'
  | 'archived';

export type PropertyType =
  | 'apartment'
  | 'villa'
  | 'house'
  | 'office'
  | 'land'
  | 'shop'
  | 'building'
  | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationType =
  | 'new_property'
  | 'price_change'
  | 'mention'
  | 'task_assigned'
  | 'property_sold'
  | 'status_change'
  | 'task_due_soon';

export type PropertyEventType =
  | 'created'
  | 'price_changed'
  | 'status_changed'
  | 'field_updated'
  | 'photos_added'
  | 'photos_removed'
  | 'note_added'
  | 'agent_changed'
  | 'tag_added'
  | 'tag_removed'
  | 'restored_version';

export interface Agent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_color: string;
  avatar_url: string | null;
  role: 'agent' | 'manager' | 'admin';
  pin_hash: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Owner {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
  created_at: string;
}

export interface Property {
  id: string;
  code: number;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  listing_type: ListingType;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  floor: string | null;
  building_age: number | null;
  address: string | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  owner_id: string | null;
  assigned_agent_id: string | null;
  status: PropertyStatus;
  is_featured: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  storage_path: string | null;
  position: number;
  caption: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PropertyEvent {
  id: string;
  property_id: string;
  agent_id: string | null;
  event_type: PropertyEventType;
  summary: string;
  diff: Record<string, unknown> | null;
  created_at: string;
}

export interface PropertyNote {
  id: string;
  property_id: string;
  agent_id: string | null;
  body: string;
  mentioned_agent_ids: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  property_id: string | null;
  owner_id: string | null;
  assigned_agent_id: string | null;
  created_by: string | null;
  due_date: string | null;
  priority: TaskPriority;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityEntityType = 'property' | 'owner' | 'task' | 'note';

export interface ActivityFeedItem {
  id: string;
  agent_id: string | null;
  entity_type: ActivityEntityType;
  entity_id: string;
  verb: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_agent_id: string;
  actor_agent_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: ActivityEntityType | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Composite / joined view models used by the UI layer
// ---------------------------------------------------------------------------

export interface PropertyWithRelations extends Property {
  owner?: Owner | null;
  assigned_agent?: Agent | null;
  images?: PropertyImage[];
  tags?: Tag[];
  is_favorited?: boolean;
}

export const PROPERTY_STATUS_META: Record<
  PropertyStatus,
  { label: string; color: string; bg: string }
> = {
  available: { label: 'Available', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  reserved: { label: 'Reserved', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  negotiating: { label: 'Negotiating', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  sold: { label: 'Sold', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  rented: { label: 'Rented', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  archived: { label: 'Archived', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  house: 'House',
  office: 'Office',
  land: 'Land',
  shop: 'Shop',
  building: 'Building',
  other: 'Other',
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#6b7280' },
  medium: { label: 'Medium', color: '#3b82f6' },
  high: { label: 'High', color: '#f59e0b' },
  urgent: { label: 'Urgent', color: '#ef4444' },
};
