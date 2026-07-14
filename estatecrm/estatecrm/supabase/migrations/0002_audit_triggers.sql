-- ============================================================================
-- Audit triggers: property_events (human-readable timeline) +
-- property_versions (full snapshot for restore).
--
-- Rationale: rather than writing bespoke "record price change" application
-- code scattered across every mutation path (which WILL drift and miss
-- cases), we do it once, correctly, in the database. The app just updates
-- the row; the trigger guarantees the timeline is complete and consistent
-- no matter which code path (UI, script, admin tool) makes the change.
-- ============================================================================

create or replace function log_property_change() returns trigger as $$
declare
  v_agent uuid;
  v_summary text;
begin
  if (tg_op = 'INSERT') then
    v_agent := new.created_by;
    insert into property_events (property_id, agent_id, event_type, summary, diff)
    values (new.id, v_agent, 'created', 'Listing created', null);

    insert into property_versions (property_id, agent_id, snapshot)
    values (new.id, v_agent, to_jsonb(new));

    insert into activity_feed (agent_id, entity_type, entity_id, verb, summary, metadata)
    values (v_agent, 'property', new.id, 'created',
            coalesce((select name from agents where id = v_agent), 'Someone') || ' added ' || new.title,
            jsonb_build_object('property_code', new.code));

    return new;
  end if;

  if (tg_op = 'UPDATE') then
    v_agent := new.updated_by;

    -- price change
    if new.price is distinct from old.price then
      insert into property_events (property_id, agent_id, event_type, summary, diff)
      values (new.id, v_agent, 'price_changed',
        format('Price changed from %s %s to %s %s', old.currency, old.price, new.currency, new.price),
        jsonb_build_object('field','price','old_value',old.price,'new_value',new.price));

      insert into activity_feed (agent_id, entity_type, entity_id, verb, summary, metadata)
      values (v_agent, 'property', new.id, 'price_changed',
        coalesce((select name from agents where id = v_agent), 'Someone') || ' updated the price of ' || new.title,
        jsonb_build_object('old_price', old.price, 'new_price', new.price));
    end if;

    -- status change
    if new.status is distinct from old.status then
      insert into property_events (property_id, agent_id, event_type, summary, diff)
      values (new.id, v_agent, 'status_changed',
        format('Status changed from %s to %s', old.status, new.status),
        jsonb_build_object('field','status','old_value',old.status,'new_value',new.status));

      insert into activity_feed (agent_id, entity_type, entity_id, verb, summary, metadata)
      values (v_agent, 'property', new.id, 'status_changed',
        coalesce((select name from agents where id = v_agent), 'Someone') ||
          case when new.status = 'sold' then ' marked ' else ' updated ' end ||
          new.title || ' as ' || new.status,
        jsonb_build_object('old_status', old.status, 'new_status', new.status));

      if new.status = 'sold' then
        insert into notifications (recipient_agent_id, actor_agent_id, type, title, body, entity_type, entity_id)
        select id, v_agent, 'property_sold', new.title || ' was sold', null, 'property', new.id
        from agents where is_active = true and id is distinct from v_agent;
      end if;
    end if;

    -- agent reassignment
    if new.assigned_agent_id is distinct from old.assigned_agent_id then
      insert into property_events (property_id, agent_id, event_type, summary, diff)
      values (new.id, v_agent, 'agent_changed',
        format('Reassigned from %s to %s',
          coalesce((select name from agents where id = old.assigned_agent_id), 'Unassigned'),
          coalesce((select name from agents where id = new.assigned_agent_id), 'Unassigned')),
        jsonb_build_object('field','assigned_agent_id','old_value',old.assigned_agent_id,'new_value',new.assigned_agent_id));
    end if;

    -- description edited
    if new.description is distinct from old.description then
      insert into property_events (property_id, agent_id, event_type, summary, diff)
      values (new.id, v_agent, 'field_updated', 'Description edited',
        jsonb_build_object('field','description'));
    end if;

    -- generic other field changes (title, bedrooms, bathrooms, area, address etc.)
    if (new.title is distinct from old.title or new.bedrooms is distinct from old.bedrooms or
        new.bathrooms is distinct from old.bathrooms or new.area_sqm is distinct from old.area_sqm or
        new.address is distinct from old.address or new.city is distinct from old.city or
        new.district is distinct from old.district or new.floor is distinct from old.floor) then
      insert into property_events (property_id, agent_id, event_type, summary, diff)
      values (new.id, v_agent, 'field_updated', 'Property details updated', null);
    end if;

    -- snapshot version on any change
    insert into property_versions (property_id, agent_id, snapshot)
    values (new.id, v_agent, to_jsonb(new));

    return new;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger properties_audit_trigger
  after insert or update on properties
  for each row execute function log_property_change();

-- ---------------------------------------------------------------------------
-- Photos added/removed events
-- ---------------------------------------------------------------------------
create or replace function log_property_images_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into property_events (property_id, agent_id, event_type, summary)
    values (new.property_id, new.created_by, 'photos_added', 'Added a photo');
    return new;
  end if;
  if (tg_op = 'DELETE') then
    insert into property_events (property_id, agent_id, event_type, summary)
    values (old.property_id, null, 'photos_removed', 'Removed a photo');
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger property_images_audit_trigger
  after insert or delete on property_images
  for each row execute function log_property_images_change();

-- ---------------------------------------------------------------------------
-- Notes: timeline event + activity feed + mention notifications
-- ---------------------------------------------------------------------------
create or replace function log_property_note() returns trigger as $$
declare
  v_property_title text;
  v_author_name text;
  m uuid;
begin
  select title into v_property_title from properties where id = new.property_id;
  select name into v_author_name from agents where id = new.agent_id;

  insert into property_events (property_id, agent_id, event_type, summary)
  values (new.property_id, new.agent_id, 'note_added', 'Note added');

  insert into activity_feed (agent_id, entity_type, entity_id, verb, summary)
  values (new.agent_id, 'property', new.property_id, 'note_added',
    coalesce(v_author_name, 'Someone') || ' commented on ' || coalesce(v_property_title, 'a listing'));

  if new.mentioned_agent_ids is not null then
    foreach m in array new.mentioned_agent_ids loop
      insert into notifications (recipient_agent_id, actor_agent_id, type, title, body, entity_type, entity_id)
      values (m, new.agent_id, 'mention',
        coalesce(v_author_name, 'Someone') || ' mentioned you',
        left(new.body, 140), 'property', new.property_id);
    end loop;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger property_notes_audit_trigger
  after insert on property_notes
  for each row execute function log_property_note();

-- ---------------------------------------------------------------------------
-- Task assignment notification
-- ---------------------------------------------------------------------------
create or replace function notify_task_assigned() returns trigger as $$
begin
  if new.assigned_agent_id is not null and
     (tg_op = 'INSERT' or new.assigned_agent_id is distinct from old.assigned_agent_id) then
    insert into notifications (recipient_agent_id, actor_agent_id, type, title, body, entity_type, entity_id)
    values (new.assigned_agent_id, new.created_by, 'task_assigned', 'New task: ' || new.title, new.description, 'task', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tasks_notify_trigger
  after insert or update on tasks
  for each row execute function notify_task_assigned();

-- ---------------------------------------------------------------------------
-- Duplicate detection helper: fuzzy phone/address search functions
-- ---------------------------------------------------------------------------
create or replace function find_similar_owners(p_phone text, p_name text default null)
returns table(id uuid, name text, phone text, similarity real) as $$
  select o.id, o.name, o.phone,
    greatest(
      similarity(coalesce(o.phone,''), coalesce(p_phone,'')),
      case when p_name is not null then similarity(o.name, p_name) else 0 end
    ) as similarity
  from owners o
  where o.deleted_at is null
    and (
      (p_phone is not null and o.phone is not null and similarity(o.phone, p_phone) > 0.4)
      or (p_name is not null and similarity(o.name, p_name) > 0.5)
    )
  order by similarity desc
  limit 5;
$$ language sql stable;

create or replace function find_similar_properties(p_address text, p_city text default null)
returns table(id uuid, title text, address text, code int, similarity real) as $$
  select p.id, p.title, p.address, p.code,
    similarity(coalesce(p.address,''), coalesce(p_address,'')) as similarity
  from properties p
  where p.deleted_at is null
    and p_address is not null and p.address is not null
    and similarity(p.address, p_address) > 0.45
    and (p_city is null or p.city = p_city)
  order by similarity desc
  limit 5;
$$ language sql stable;
