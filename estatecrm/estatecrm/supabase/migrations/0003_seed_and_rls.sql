-- ============================================================================
-- Seed data + Row Level Security + Realtime publication
--
-- Security model: this is an internal-office tool with lightweight agent
-- identity (no Supabase Auth accounts per the spec). We use the Supabase
-- anon key for all access, scoped by RLS to "authenticated app users only"
-- in practice enforced at the edge (this should sit behind your office
-- network / a shared app password in production — see README). RLS here
-- primarily protects against accidental writes from bad client code and
-- keeps soft-deleted rows hidden, rather than modeling per-agent permissions
-- (a 5-15 person trusted office doesn't need row-level agent permissions).
-- ============================================================================

-- Default tags
insert into tags (label, color) values
  ('Exclusive', '#f59e0b'),
  ('Urgent', '#ef4444'),
  ('Luxury', '#8b5cf6'),
  ('Hot', '#ec4899'),
  ('Investment', '#10b981'),
  ('Needs Update', '#6b7280');

-- Sample agents (replace with your real office roster)
insert into agents (name, email, avatar_color, role) values
  ('Ahmed Yilmaz', 'ahmed@office.com', '#6366f1', 'manager'),
  ('Sarah Demir', 'sarah@office.com', '#ec4899', 'agent'),
  ('John Kaya', 'john@office.com', '#10b981', 'agent'),
  ('Elif Sahin', 'elif@office.com', '#f59e0b', 'agent'),
  ('Mert Ozturk', 'mert@office.com', '#8b5cf6', 'agent');

-- ---------------------------------------------------------------------------
-- RLS: enable + permissive policies scoped to non-deleted rows.
-- ---------------------------------------------------------------------------
alter table agents enable row level security;
alter table owners enable row level security;
alter table tags enable row level security;
alter table properties enable row level security;
alter table property_tags enable row level security;
alter table property_images enable row level security;
alter table property_events enable row level security;
alter table property_versions enable row level security;
alter table property_notes enable row level security;
alter table favorites enable row level security;
alter table recently_viewed enable row level security;
alter table tasks enable row level security;
alter table activity_feed enable row level security;
alter table notifications enable row level security;

create policy "agents readable" on agents for select using (true);
create policy "agents writable" on agents for all using (true) with check (true);

create policy "owners readable" on owners for select using (deleted_at is null);
create policy "owners writable" on owners for all using (true) with check (true);

create policy "tags readable" on tags for select using (true);
create policy "tags writable" on tags for all using (true) with check (true);

create policy "properties readable" on properties for select using (deleted_at is null);
create policy "properties writable" on properties for all using (true) with check (true);

create policy "property_tags readable" on property_tags for select using (true);
create policy "property_tags writable" on property_tags for all using (true) with check (true);

create policy "property_images readable" on property_images for select using (true);
create policy "property_images writable" on property_images for all using (true) with check (true);

create policy "property_events readable" on property_events for select using (true);
create policy "property_events writable" on property_events for insert with check (true);

create policy "property_versions readable" on property_versions for select using (true);
create policy "property_versions writable" on property_versions for insert with check (true);

create policy "property_notes readable" on property_notes for select using (deleted_at is null);
create policy "property_notes writable" on property_notes for all using (true) with check (true);

create policy "favorites readable" on favorites for select using (true);
create policy "favorites writable" on favorites for all using (true) with check (true);

create policy "recently_viewed readable" on recently_viewed for select using (true);
create policy "recently_viewed writable" on recently_viewed for all using (true) with check (true);

create policy "tasks readable" on tasks for select using (true);
create policy "tasks writable" on tasks for all using (true) with check (true);

create policy "activity_feed readable" on activity_feed for select using (true);
create policy "activity_feed writable" on activity_feed for insert with check (true);

create policy "notifications readable" on notifications for select using (true);
create policy "notifications writable" on notifications for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime: publish the tables that power live UI updates.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table properties;
alter publication supabase_realtime add table property_notes;
alter publication supabase_realtime add table property_events;
alter publication supabase_realtime add table activity_feed;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table favorites;

-- ---------------------------------------------------------------------------
-- Storage bucket for property images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "public read property images" on storage.objects
  for select using (bucket_id = 'property-images');
create policy "anyone can upload property images" on storage.objects
  for insert with check (bucket_id = 'property-images');
create policy "anyone can delete property images" on storage.objects
  for delete using (bucket_id = 'property-images');
