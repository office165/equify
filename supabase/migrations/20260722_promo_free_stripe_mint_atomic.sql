-- Production still enforces amount = 99.00 on stripe_transactions_on_demand_99_ils,
-- which rejects promo_free mint rows (amount = 0). Relax CHECK and add an atomic
-- redeem+mint RPC so redemption / times_used cannot advance without a successful mint.

alter table public.stripe_transactions drop constraint if exists stripe_transactions_amount_positive;
alter table public.stripe_transactions drop constraint if exists stripe_transactions_on_demand_99_ils;
alter table public.stripe_transactions add constraint stripe_transactions_on_demand_99_ils
  check (currency = 'ILS' and amount >= 0);

comment on constraint stripe_transactions_on_demand_99_ils on public.stripe_transactions is
  'ILS only; amount >= 0 allows paid rows and promo_free (amount = 0). Business min amount enforced in app/webhook.';

create or replace function public.redeem_promo_and_mint(
  p_code text,
  p_email text,
  p_transaction_id uuid,
  p_token_jti text,
  p_token_jwt text,
  p_expires_at timestamptz,
  p_stripe_payment_intent_id text,
  p_purchaser_user_id uuid,
  p_valuation_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_email text := lower(trim(p_email));
  v_promo public.promo_codes%rowtype;
  v_redemption_id uuid;
  v_now timestamptz := now();
begin
  if v_code is null or v_code = '' or v_email is null or v_email = '' then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if p_transaction_id is null
     or p_token_jti is null or trim(p_token_jti) = ''
     or p_token_jwt is null or trim(p_token_jwt) = ''
     or p_expires_at is null
     or p_stripe_payment_intent_id is null
     or trim(p_stripe_payment_intent_id) = '' then
    raise exception 'invalid_mint_params' using errcode = 'P0001';
  end if;

  select *
    into v_promo
  from public.promo_codes
  where code = v_code
  for update;

  if not found then
    raise exception 'code_not_found' using errcode = 'P0001';
  end if;

  if coalesce(v_promo.is_active, false) is not true then
    raise exception 'inactive' using errcode = 'P0001';
  end if;

  if v_promo.expires_at is not null and v_promo.expires_at <= v_now then
    raise exception 'expired' using errcode = 'P0001';
  end if;

  if v_promo.max_uses is not null
     and coalesce(v_promo.times_used, 0) >= v_promo.max_uses then
    raise exception 'max_uses_reached' using errcode = 'P0001';
  end if;

  insert into public.promo_redemptions (
    promo_code_id,
    user_email,
    payment_matched
  ) values (
    v_promo.id,
    v_email,
    true
  )
  returning id into v_redemption_id;

  update public.promo_codes
  set times_used = coalesce(times_used, 0) + 1
  where id = v_promo.id;

  insert into public.stripe_transactions (
    id,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    stripe_customer_id,
    purchaser_user_id,
    amount,
    currency,
    is_used,
    token_jwt,
    token_jti,
    expires_at,
    gateway_provider,
    valuation_id,
    metadata
  ) values (
    p_transaction_id,
    p_stripe_payment_intent_id,
    null,
    v_email,
    p_purchaser_user_id,
    0,
    'ILS',
    false,
    p_token_jwt,
    p_token_jti,
    p_expires_at,
    'promo_free',
    p_valuation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'promo_code', v_code,
      'promo_redemption_id', v_redemption_id,
      'provider', 'promo_free',
      'gateway_provider', 'promo_free'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'promo_id', v_promo.id,
    'redemption_id', v_redemption_id,
    'transaction_id', p_transaction_id
  );
exception
  when unique_violation then
    raise exception 'unique_violation:%', sqlerrm using errcode = '23505';
  when check_violation then
    raise exception 'constraint_violation:%', sqlerrm using errcode = '23514';
end;
$$;

revoke all on function public.redeem_promo_and_mint(
  text, text, uuid, text, text, timestamptz, text, uuid, uuid, jsonb
) from public;
grant execute on function public.redeem_promo_and_mint(
  text, text, uuid, text, text, timestamptz, text, uuid, uuid, jsonb
) to service_role;
