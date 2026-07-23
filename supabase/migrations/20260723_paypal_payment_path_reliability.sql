-- PayPal payment path reliability:
-- 1) ensure_wizard_user — upsert public.users by email (wizard Step1 / pre-PayPal)
-- 2) claim_paypal_capture_and_mint — atomic stripe_transactions insert + optional
--    draft valuation → completed (same transaction; no partial write window)

create or replace function public.ensure_wizard_user(
  p_email text,
  p_full_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_user public.users%rowtype;
begin
  if v_email is null or v_email = '' then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  insert into public.users (email, full_name, email_verified_at)
  values (v_email, v_name, now())
  on conflict (email) do update
    set
      full_name = case
        when public.users.full_name is null or btrim(public.users.full_name) = ''
          then excluded.full_name
        else public.users.full_name
      end,
      deleted_at = null,
      updated_at = now()
  returning * into v_user;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user.id,
    'email', v_user.email::text
  );
exception
  when check_violation then
    raise exception 'invalid_email:%', sqlerrm using errcode = 'P0001';
end;
$$;

revoke all on function public.ensure_wizard_user(text, text) from public;
grant execute on function public.ensure_wizard_user(text, text) to service_role;

create or replace function public.claim_paypal_capture_and_mint(
  p_transaction_id uuid,
  p_capture_id text,
  p_sale_id text,
  p_payer_email text,
  p_token_jti text,
  p_token_jwt text,
  p_expires_at timestamptz,
  p_amount numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_payer_email));
  v_user public.users%rowtype;
  v_draft public.valuations%rowtype;
  v_existing_id uuid;
  v_valuation_id uuid;
  v_amount numeric := coalesce(p_amount, 999);
begin
  if v_email is null or v_email = ''
     or p_transaction_id is null
     or p_capture_id is null or trim(p_capture_id) = ''
     or p_token_jti is null or trim(p_token_jti) = ''
     or p_token_jwt is null or trim(p_token_jwt) = ''
     or p_expires_at is null then
    raise exception 'invalid_mint_params' using errcode = 'P0001';
  end if;

  -- Idempotency: capture already minted
  select id into v_existing_id
  from public.stripe_transactions
  where stripe_payment_intent_id = trim(p_capture_id)
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'transaction_id', v_existing_id
    );
  end if;

  select * into v_user
  from public.users
  where email = v_email
    and deleted_at is null
  limit 1
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'user_not_found'
    );
  end if;

  select * into v_draft
  from public.valuations
  where status = 'draft'
    and created_by_user_id = v_user.id
  order by created_at desc
  limit 1
  for update;

  if found then
    v_valuation_id := v_draft.id;
  else
    v_valuation_id := null;
  end if;

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
    trim(p_capture_id),
    nullif(trim(coalesce(p_sale_id, '')), ''),
    v_email,
    v_user.id,
    v_amount,
    'ILS',
    false,
    p_token_jwt,
    p_token_jti,
    p_expires_at,
    'paypal',
    v_valuation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'provider', 'paypal',
      'gateway_provider', 'paypal'
    )
  );

  if v_valuation_id is not null then
    update public.valuations
    set
      status = 'completed',
      stripe_transaction_id = p_transaction_id,
      subscription_id = null,
      enterprise_valuation = coalesce(enterprise_valuation, 0),
      equity_value = coalesce(equity_value, 0),
      completed_at = now(),
      updated_at = now()
    where id = v_valuation_id
      and status = 'draft';
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'transaction_id', p_transaction_id,
    'user_id', v_user.id,
    'valuation_id', v_valuation_id
  );
exception
  when unique_violation then
    -- Concurrent duplicate capture insert
    select id into v_existing_id
    from public.stripe_transactions
    where stripe_payment_intent_id = trim(p_capture_id)
    limit 1;
    if v_existing_id is not null then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'transaction_id', v_existing_id
      );
    end if;
    raise exception 'unique_violation:%', sqlerrm using errcode = '23505';
  when check_violation then
    raise exception 'constraint_violation:%', sqlerrm using errcode = '23514';
end;
$$;

revoke all on function public.claim_paypal_capture_and_mint(
  uuid, text, text, text, text, text, timestamptz, numeric, jsonb
) from public;
grant execute on function public.claim_paypal_capture_and_mint(
  uuid, text, text, text, text, text, timestamptz, numeric, jsonb
) to service_role;
