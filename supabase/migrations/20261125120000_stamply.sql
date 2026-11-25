-- Shared Stamply schema for the web app and this mobile client.
-- The mobile app uses the anon key only. Row Level Security is the boundary.
-- Never ship the service-role key in Expo.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null default '',
  brand_color text not null default '#C4452D',
  timezone text not null default 'UTC',
  plan text not null default 'trial' check (plan in ('trial', 'counter', 'house')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  user_token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff', 'customer')),
  display_name text not null default '',
  pin_hash text,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text not null default '',
  stamps_required integer not null check (stamps_required > 0),
  reward_name text not null,
  reward_description text not null default '',
  cooldown_minutes integer not null default 30 check (cooldown_minutes >= 0),
  max_stamps_per_day integer not null default 4 check (max_stamps_per_day > 0),
  active boolean not null default true,
  accent text not null default '#C4452D'
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  stamps integer not null default 0 check (stamps >= 0),
  lifetime_stamps integer not null default 0 check (lifetime_stamps >= 0),
  rewards_available integer not null default 0 check (rewards_available >= 0),
  rewards_redeemed integer not null default 0 check (rewards_redeemed >= 0),
  qr_token text not null unique,
  updated_at timestamptz not null default now(),
  unique (program_id, customer_id)
);

create table if not exists public.stamp_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  staff_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unlocked_reward boolean not null default false
);

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  staff_id uuid not null references public.profiles (id),
  reward_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  href text
);

create table if not exists public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  status text not null default 'mocked' check (status in ('mocked')),
  serial text not null,
  created_at timestamptz not null default now(),
  unique (card_id, platform)
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null,
  mocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, platform)
);

create index if not exists cards_customer_idx on public.cards (customer_id);
create index if not exists cards_org_idx on public.cards (organization_id);
create index if not exists stamp_events_card_idx on public.stamp_events (card_id, created_at desc);
create index if not exists members_user_idx on public.members (user_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.programs enable row level security;
alter table public.locations enable row level security;
alter table public.cards enable row level security;
alter table public.stamp_events enable row level security;
alter table public.redemptions enable row level security;
alter table public.notifications enable row level security;
alter table public.wallet_passes enable row level security;
alter table public.push_tokens enable row level security;

create or replace function public.is_org_staff(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where organization_id = org
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'staff')
  );
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, user_token)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'guest'), '@', 1)),
    'stmp_user_' || replace(new.id::text, '-', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.members mine
      join public.members theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and mine.role in ('owner', 'admin', 'staff')
        and theirs.user_id = profiles.id
    )
  );

create policy orgs_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy members_select on public.members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_staff(organization_id));

create policy programs_select on public.programs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy locations_select on public.locations
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy cards_select on public.cards
  for select to authenticated
  using (customer_id = auth.uid() or public.is_org_staff(organization_id));

create policy stamps_select on public.stamp_events
  for select to authenticated
  using (customer_id = auth.uid() or public.is_org_staff(organization_id));

create policy redemptions_select on public.redemptions
  for select to authenticated
  using (customer_id = auth.uid() or public.is_org_staff(organization_id));

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy passes_select on public.wallet_passes
  for select to authenticated
  using (user_id = auth.uid());

create policy passes_insert on public.wallet_passes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.cards c where c.id = card_id and c.customer_id = auth.uid())
  );

create policy push_select on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy push_write on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_update on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.members from anon, authenticated;
grant select (id, organization_id, user_id, role, display_name, created_at) on public.members to authenticated;

create or replace function public.add_stamp(p_token text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_program public.programs%rowtype;
  v_org public.organizations%rowtype;
  v_member public.members%rowtype;
  v_last timestamptz;
  v_today integer;
  v_day date;
begin
  select * into v_card from public.cards where qr_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'UNKNOWN_CARD', 'message', 'No card matches that code.');
  end if;
  select * into v_program from public.programs where id = v_card.program_id;
  select * into v_org from public.organizations where id = v_card.organization_id;
  select * into v_member from public.members
    where organization_id = v_card.organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'staff');
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_STAFF', 'message', 'Only staff at this merchant can stamp or redeem.');
  end if;
  if v_member.pin_hash is null or v_member.pin_hash <> crypt(p_pin, v_member.pin_hash) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PIN', 'message', 'That PIN does not match.');
  end if;
  if not v_program.active then
    return jsonb_build_object('ok', false, 'code', 'INACTIVE_PROGRAM', 'message', 'This card is paused by the merchant.');
  end if;
  select max(created_at) into v_last from public.stamp_events where card_id = v_card.id;
  if v_last is not null and v_last > now() - make_interval(mins => v_program.cooldown_minutes) then
    return jsonb_build_object(
      'ok', false,
      'code', 'COOLDOWN',
      'message', 'This card is still in its cooldown window.',
      'retry_at', v_last + make_interval(mins => v_program.cooldown_minutes)
    );
  end if;
  v_day := (now() at time zone v_org.timezone)::date;
  select count(*) into v_today from public.stamp_events
    where card_id = v_card.id
      and (created_at at time zone v_org.timezone)::date = v_day;
  if v_today >= v_program.max_stamps_per_day then
    return jsonb_build_object('ok', false, 'code', 'DAILY_CAP', 'message', 'This card has reached its daily stamp limit.');
  end if;

  if v_card.stamps + 1 >= v_program.stamps_required then
    update public.cards
      set stamps = 0,
          lifetime_stamps = lifetime_stamps + 1,
          rewards_available = rewards_available + 1,
          updated_at = now()
      where id = v_card.id;
    insert into public.stamp_events (organization_id, card_id, program_id, customer_id, staff_id, unlocked_reward)
      values (v_card.organization_id, v_card.id, v_card.program_id, v_card.customer_id, auth.uid(), true);
    insert into public.notifications (user_id, organization_id, title, body, href)
      values (v_card.customer_id, v_card.organization_id, v_program.reward_name || ' is ready', 'Your card is full.', '/card/' || v_card.id);
    return jsonb_build_object('ok', true, 'card_id', v_card.id, 'unlocked_reward', true, 'message', v_program.reward_name || ' is unlocked.');
  end if;

  update public.cards
    set stamps = stamps + 1,
        lifetime_stamps = lifetime_stamps + 1,
        updated_at = now()
    where id = v_card.id;
  insert into public.stamp_events (organization_id, card_id, program_id, customer_id, staff_id, unlocked_reward)
    values (v_card.organization_id, v_card.id, v_card.program_id, v_card.customer_id, auth.uid(), false);
  insert into public.notifications (user_id, organization_id, title, body, href)
    values (v_card.customer_id, v_card.organization_id, 'Stamp added at ' || v_org.name, v_program.name, '/card/' || v_card.id);
  return jsonb_build_object('ok', true, 'card_id', v_card.id, 'unlocked_reward', false, 'message', 'Stamp added.');
end;
$$;

create or replace function public.redeem_reward(p_token text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_program public.programs%rowtype;
  v_member public.members%rowtype;
begin
  select * into v_card from public.cards where qr_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'UNKNOWN_CARD', 'message', 'No card matches that code.');
  end if;
  select * into v_program from public.programs where id = v_card.program_id;
  select * into v_member from public.members
    where organization_id = v_card.organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'staff');
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_STAFF', 'message', 'Only staff at this merchant can stamp or redeem.');
  end if;
  if v_member.pin_hash is null or v_member.pin_hash <> crypt(p_pin, v_member.pin_hash) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PIN', 'message', 'That PIN does not match.');
  end if;
  if v_card.rewards_available < 1 then
    return jsonb_build_object('ok', false, 'code', 'NO_REWARD', 'message', 'There is no reward waiting on this card.');
  end if;
  update public.cards
    set rewards_available = rewards_available - 1,
        rewards_redeemed = rewards_redeemed + 1,
        updated_at = now()
    where id = v_card.id;
  insert into public.redemptions (organization_id, card_id, program_id, customer_id, staff_id, reward_name)
    values (v_card.organization_id, v_card.id, v_card.program_id, v_card.customer_id, auth.uid(), v_program.reward_name);
  insert into public.notifications (user_id, organization_id, title, body, href)
    values (v_card.customer_id, v_card.organization_id, v_program.reward_name || ' redeemed', 'A staff member marked your reward as used.', '/card/' || v_card.id);
  return jsonb_build_object('ok', true, 'card_id', v_card.id, 'unlocked_reward', false, 'message', v_program.reward_name || ' redeemed.');
end;
$$;

create or replace function public.enroll_customer(p_user_token text, p_program_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program public.programs%rowtype;
  v_member public.members%rowtype;
  v_profile public.profiles%rowtype;
  v_card_id uuid;
  v_token text;
begin
  select * into v_program from public.programs where id = p_program_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'UNKNOWN_CARD', 'message', 'That program is not available.');
  end if;
  select * into v_member from public.members
    where organization_id = v_program.organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'staff');
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_STAFF', 'message', 'Only staff at this merchant can enroll customers.');
  end if;
  if v_member.pin_hash is null or v_member.pin_hash <> crypt(p_pin, v_member.pin_hash) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PIN', 'message', 'That PIN does not match.');
  end if;
  if not v_program.active then
    return jsonb_build_object('ok', false, 'code', 'INACTIVE_PROGRAM', 'message', 'This card is paused by the merchant.');
  end if;
  select * into v_profile from public.profiles where user_token = p_user_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'UNKNOWN_CUSTOMER', 'message', 'No customer matches that code.');
  end if;
  if exists (select 1 from public.cards where customer_id = v_profile.id and program_id = v_program.id) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ENROLLED', 'message', 'This customer already has that card.');
  end if;
  insert into public.members (organization_id, user_id, role, display_name)
    values (v_program.organization_id, v_profile.id, 'customer', v_profile.full_name)
    on conflict (organization_id, user_id) do nothing;
  v_token := 'stmp_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.cards (organization_id, program_id, customer_id, qr_token)
    values (v_program.organization_id, v_program.id, v_profile.id, v_token)
    returning id into v_card_id;
  return jsonb_build_object('ok', true, 'card_id', v_card_id, 'unlocked_reward', false, 'message', v_profile.full_name || ' is on ' || v_program.name || '.');
end;
$$;

revoke all on function public.add_stamp(text, text) from public, anon;
revoke all on function public.redeem_reward(text, text) from public, anon;
revoke all on function public.enroll_customer(text, uuid, text) from public, anon;
grant execute on function public.add_stamp(text, text) to authenticated;
grant execute on function public.redeem_reward(text, text) to authenticated;
grant execute on function public.enroll_customer(text, uuid, text) to authenticated;
