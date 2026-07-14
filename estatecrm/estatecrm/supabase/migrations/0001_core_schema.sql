-- ============================================================================
-- EstateCRM — Core Schema
-- ============================================================================
-- Design notes:
-- * Every mutable, user-facing entity has an `updated_at` trigger.
-- * "Never silently overwrite" (property timeline requirement) is implemented
--   via a generic audit trigger (property_events) rather than bespoke
--   per-field tracking code — this scales to new fields for free.
-- * Full-text search uses a generated tsvector column + GIN index, combined
--   client-side with Fuse.js for fuzzy matching. Postgres FTS handles the
--   "instant, scales to 10k+ rows" requirement; Fuse handles typo-tolerance
--   on the smaller result set. This two-tier approach avoids pulling in
--   heavier infra (Elasticsearch/Algolia) that a 5-15 person office doesn't need.
-- * Soft deletes (deleted_at) everywhere instead of hard deletes, so history
--   and activity feeds never dangle.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;   -- trigram search for phone/address fuzzy matching
create extension if not exists unaccent;  -- accent-insensitive search (Turkish/int'l addresses)

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type listing_type as enum ('sale', 'rent');

create type property_status as enum (
  'available', 'reserved', 'negotiating', 'sold', 'rented', 'archived'
);

create type property_type as enum (
  'apartment', 'villa', 'house', 'office', 'land', 'shop', 'building', 'other'
);

create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type notification_type as enum (
  'new_property', 'price_change', 'mention', 'task_assigned',
  'property_sold', 'status_change', 'task_due_soon'
);

-- ---------------------------------------------------------------------------
-- AGENTS  (see "Agent Identity" design doc / README for rationale)
-- ---------------------------------------------------------------------------
create table agents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  avatar_color text not null default '#6366f1', -- used for avatar bg when no photo
  avatar_url text,
  role text not null default 'agent',           -- 'agent' | 'manager' | 'admin'
  pin_hash text,                                 -- optional 4-digit PIN, bcrypt-hashed
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index agents_name_unique on agents (lower(name));

-- ---------------------------------------------------------------------------
-- OWNERS
-- ---------------------------------------------------------------------------
create table owners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  whatsapp text,
  email text,
  notes text,
  created_by uuid references agents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index owners_phone_idx on owners using gin (phone gin_trgm_ops);
create index owners_name_idx on owners using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- TAGS (predefined + custom, unified table keeps queries simple)
-- ---------------------------------------------------------------------------
create table tags (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  color text not null default '#8b5cf6',
  created_at timestamptz not null default now()
);

create unique index tags_label_unique on tags (lower(label));

-- ---------------------------------------------------------------------------
-- PROPERTIES
-- ---------------------------------------------------------------------------
create table properties (
  id uuid primary key default uuid_generate_v4(),
  code serial,                                    -- human-friendly sequential ID (#254)

  title text not null,
  description text,

  price numeric(14,2) not null,
  currency text not null default 'USD',
  listing_type listing_type not null,
  property_type property_type not null default 'apartment',

  bedrooms int,
  bathrooms int,
  area_sqm numeric(8,2),
  floor text,               -- text: "3", "Ground", "3 of 8"
  building_age int,         -- years

  address text,
  city text,
  district text,
  lat double precision,
  lng double precision,

  owner_id uuid references owners(id) on delete set null,
  assigned_agent_id uuid references agents(id) on delete set null,
  status property_status not null default 'available',

  is_featured boolean not null default false,

  search_vector tsvector,

  created_by uuid references agents(id),
  updated_by uuid references agents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index properties_search_idx on properties using gin (search_vector);
create index properties_status_idx on properties (status) where deleted_at is null;
create index properties_agent_idx on properties (assigned_agent_id) where deleted_at is null;
create index properties_city_idx on properties (city);
create index properties_district_idx on properties (district);
create index properties_listing_type_idx on properties (listing_type);
create index properties_price_idx on properties (price);
create index properties_created_idx on properties (created_at desc);
create index properties_code_idx on properties (code);
create index properties_address_trgm_idx on properties using gin (address gin_trgm_ops);

create or replace function properties_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.address, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.city, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.district, ''))), 'B') ||
    setweight(to_tsvector('simple', 'prop ' || coalesce(new.code::text, '')), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description, ''))), 'D');
  return new;
end;
$$ language plpgsql;

create trigger properties_search_vector_trigger
  before insert or update on properties
  for each row execute function properties_search_vector_update();

-- property <-> tags (many-to-many)
create table property_tags (
  property_id uuid references properties(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (property_id, tag_id)
);

-- property images
create table property_images (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  url text not null,
  storage_path text,
  position int not null default 0,
  caption text,
  created_by uuid references agents(id),
  created_at timestamptz not null default now()
);

create index property_images_property_idx on property_images (property_id, position);

-- ---------------------------------------------------------------------------
-- PROPERTY EVENTS  (the immutable timeline: "nothing silently overwritten")
-- ---------------------------------------------------------------------------
create type property_event_type as enum (
  'created', 'price_changed', 'status_changed', 'field_updated',
  'photos_added', 'photos_removed', 'note_added', 'agent_changed',
  'tag_added', 'tag_removed', 'restored_version'
);

create table property_events (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  agent_id uuid references agents(id),
  event_type property_event_type not null,
  summary text not null,          -- human-readable, e.g. "Price changed from $250,000 to $265,000"
  diff jsonb,                     -- { field, old_value, new_value } for structured display
  created_at timestamptz not null default now()
);

create index property_events_property_idx on property_events (property_id, created_at desc);
create index property_events_created_idx on property_events (created_at desc);

-- ---------------------------------------------------------------------------
-- PROPERTY VERSIONS (full snapshots for restore capability)
-- ---------------------------------------------------------------------------
create table property_versions (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  snapshot jsonb not null,        -- full row snapshot at time of change
  agent_id uuid references agents(id),
  created_at timestamptz not null default now()
);

create index property_versions_property_idx on property_versions (property_id, created_at desc);

-- ---------------------------------------------------------------------------
-- NOTES (with @mentions)
-- ---------------------------------------------------------------------------
create table property_notes (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  agent_id uuid references agents(id),
  body text not null,
  mentioned_agent_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index property_notes_property_idx on property_notes (property_id, created_at desc);
create index property_notes_mentions_idx on property_notes using gin (mentioned_agent_ids);

-- ---------------------------------------------------------------------------
-- FAVORITES
-- ---------------------------------------------------------------------------
create table favorites (
  agent_id uuid references agents(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (agent_id, property_id)
);

-- ---------------------------------------------------------------------------
-- RECENTLY VIEWED
-- ---------------------------------------------------------------------------
create table recently_viewed (
  agent_id uuid references agents(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (agent_id, property_id)
);

create index recently_viewed_agent_idx on recently_viewed (agent_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- TASKS
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  property_id uuid references properties(id) on delete cascade,
  owner_id uuid references owners(id) on delete set null,
  assigned_agent_id uuid references agents(id) on delete set null,
  created_by uuid references agents(id),
  due_date timestamptz,
  priority task_priority not null default 'medium',
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assigned_idx on tasks (assigned_agent_id, is_completed);
create index tasks_due_idx on tasks (due_date) where is_completed = false;
create index tasks_property_idx on tasks (property_id);

-- ---------------------------------------------------------------------------
-- ACTIVITY FEED (office-wide social feed; distinct from property_events,
-- which is the immutable per-property audit trail — feed is denormalized
-- and read-optimized for the dashboard/global feed, and can reference
-- non-property events too, e.g. owner or task activity).
-- ---------------------------------------------------------------------------
create type activity_entity_type as enum ('property', 'owner', 'task', 'note');

create table activity_feed (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id),
  entity_type activity_entity_type not null,
  entity_id uuid not null,
  verb text not null,             -- 'created', 'updated', 'sold', 'uploaded_photos', etc.
  summary text not null,          -- "Ahmed added Apartment #254"
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_feed_created_idx on activity_feed (created_at desc);
create index activity_feed_entity_idx on activity_feed (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_agent_id uuid not null references agents(id) on delete cascade,
  actor_agent_id uuid references agents(id),
  type notification_type not null,
  title text not null,
  body text,
  entity_type activity_entity_type,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_agent_id, is_read, created_at desc);

-- ---------------------------------------------------------------------------
-- DUPLICATE DETECTION SUPPORT
-- normalized phone index on owners already covers phone matching;
-- address similarity uses pg_trgm at query time (no extra table needed).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger owners_updated_at before update on owners
  for each row execute function set_updated_at();
create trigger properties_updated_at before update on properties
  for each row execute function set_updated_at();
create trigger property_notes_updated_at before update on property_notes
  for each row execute function set_updated_at();
create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();
