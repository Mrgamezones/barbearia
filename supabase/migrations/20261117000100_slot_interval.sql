-- Intervalo da agenda por barbearia: os horários oferecidos andam de N em N minutos a partir da abertura
-- (padrão 15, como antes). Ex.: 40 → 8h, 8h40, 9h20...
alter table public.shops
  add column slot_interval_minutes smallint not null default 15
    check (slot_interval_minutes between 5 and 120 and slot_interval_minutes % 5 = 0);

create or replace function public._available_slots(
  p_shop_id uuid,
  p_date date,
  p_total_minutes integer,
  p_min_start timestamptz
)
returns table (slot timestamptz)
language sql stable security definer set search_path = '' as $$
  with h as (
    select bh.*, public.shop_tz(p_shop_id) as tz,
           (select sh.slot_interval_minutes from public.shops sh where sh.id = p_shop_id) as step
    from public.business_hours bh
    where bh.shop_id = p_shop_id and bh.weekday = extract(dow from p_date)::smallint and bh.is_open
  ),
  candidates as (
    select s as slot_start, s + make_interval(mins => p_total_minutes) as slot_end, h.*
    from h,
    lateral generate_series(
      (p_date + h.open_time) at time zone h.tz,
      ((p_date + h.close_time) at time zone h.tz) - make_interval(mins => p_total_minutes),
      make_interval(mins => h.step)
    ) as s
  )
  select c.slot_start
  from candidates c
  where p_total_minutes > 0
    and c.slot_start >= p_min_start
    and (
      c.break_start is null
      or not tstzrange(c.slot_start, c.slot_end, '[)')
             && tstzrange((p_date + c.break_start) at time zone c.tz, (p_date + c.break_end) at time zone c.tz, '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks b
      where b.shop_id = p_shop_id
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
    and not exists (
      select 1 from public.appointments a
      where a.shop_id = p_shop_id
        and a.status <> 'cancelled'
        and a.during && tstzrange(c.slot_start, c.slot_end, '[)')
    )
  order by c.slot_start;
$$;
revoke all on function public._available_slots(uuid, date, integer, timestamptz) from public, anon, authenticated;
