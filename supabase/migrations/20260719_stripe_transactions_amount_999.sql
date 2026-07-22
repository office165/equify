-- האילוץ על סכום מדויק (999) הוסר כי הוא מתנגש עם תשלומי פרומו וקופון חינם (amount=0).
-- תיקוף הסכום העסקי מבוצע ב-webhook / promo validate (app/api/v1/...).

alter table public.stripe_transactions drop constraint if exists stripe_transactions_amount_positive;
alter table public.stripe_transactions drop constraint if exists stripe_transactions_on_demand_99_ils;
alter table public.stripe_transactions add constraint stripe_transactions_on_demand_99_ils
  check (currency = 'ILS' and amount >= 0);

drop index if exists stripe_transactions_unused_99_ils_tokens;
create index stripe_transactions_unused_99_ils_tokens on public.stripe_transactions (token_jti, expires_at)
  where is_used = false and currency = 'ILS';

-- Atomic single-use claim for deliver path (UPDATE … WHERE is_used = false RETURNING).
create or replace function public.consume_unused_payment_token(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    return null;
  end if;

  update public.stripe_transactions as st
  set
    is_used = true,
    used_at = now(),
    updated_at = now()
  where st.id = (
    select t.id
    from public.stripe_transactions t
    left join public.users u
      on u.id = t.purchaser_user_id
     and u.deleted_at is null
    where t.is_used = false
      and t.gateway_provider in ('paypal', 'promo_free')
      and t.expires_at > now()
      and (
        t.stripe_customer_id = v_email
        or u.email = v_email
      )
    order by t.created_at desc
    limit 1
    for update skip locked
  )
  returning st.id into v_id;

  return v_id;
end;
$$;

revoke all on function public.consume_unused_payment_token(text) from public;
grant execute on function public.consume_unused_payment_token(text) to service_role;
