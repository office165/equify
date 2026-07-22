/**
 * Regression: promo redeem+mint happy path + constraint failure mapping.
 * Run: npx tsx --tsconfig tsconfig.json scripts/test-promo-validate-mint.ts
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildPromoPaymentIntentId,
  mapPromoRpcError,
  redeemPromoAndMint,
  type PromoRedeemMintDeps,
} from '../lib/payments/promo_redeem_mint';

function mockDeps(
  rpc: PromoRedeemMintDeps['rpc'],
): PromoRedeemMintDeps {
  return {
    isConfigured: () => true,
    rpc,
    signDispatch: ({ sub, jti }) => ({
      token: `header.payload.${sub}.${jti}`,
      jti,
    }),
  };
}

async function main() {
  let passed = 0;

  {
    const a = buildPromoPaymentIntentId('11111111-1111-1111-1111-111111111111');
    const b = buildPromoPaymentIntentId('22222222-2222-2222-2222-222222222222');
    assert.match(a, /^promo-free-[0-9a-f-]{36}$/i);
    assert.notEqual(a, b);
    passed += 1;
    console.log('✅ PASS [payment intent id unique per transaction]');
  }

  {
    let rpcCalls = 0;
    const result = await redeemPromoAndMint(
      { code: 'lz0707lz', email: 'User@Example.com' },
      mockDeps(async (fn, args) => {
        rpcCalls += 1;
        assert.equal(fn, 'redeem_promo_and_mint');
        assert.equal(args.p_code, 'LZ0707LZ');
        assert.equal(args.p_email, 'user@example.com');
        assert.match(String(args.p_stripe_payment_intent_id), /^promo-free-/);
        assert.equal(typeof args.p_token_jwt, 'string');
        assert.ok(String(args.p_token_jwt).length > 10);
        return {
          data: {
            ok: true,
            redemption_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            transaction_id: args.p_transaction_id,
            promo_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          },
          error: null,
        };
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.dispatchToken.includes(result.transactionId));
      assert.equal(result.redemptionId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    }
    assert.equal(rpcCalls, 1);
    passed += 1;
    console.log('✅ PASS [happy path: single atomic RPC → dispatchToken]');
  }

  {
    const mapped = mapPromoRpcError({
      code: '23514',
      message:
        'new row for relation "stripe_transactions" violates check constraint "stripe_transactions_on_demand_99_ils"',
    });
    assert.equal(mapped.ok, false);
    assert.equal(mapped.reason, 'constraint_violation');
    assert.equal(mapped.dbCode, '23514');
    passed += 1;
    console.log('✅ PASS [23514 → constraint_violation]');
  }

  {
    const mapped = mapPromoRpcError({
      code: 'P0001',
      message: 'constraint_violation:check constraint',
    });
    assert.equal(mapped.reason, 'constraint_violation');
    passed += 1;
    console.log('✅ PASS [RPC constraint_violation message mapped]');
  }

  {
    const result = await redeemPromoAndMint(
      { code: 'LZ0707LZ', email: 'user@example.com' },
      mockDeps(async () => ({
        data: null,
        error: {
          code: '23514',
          message:
            'constraint_violation:new row violates check constraint stripe_transactions_on_demand_99_ils',
        },
      })),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, 'constraint_violation');
      assert.equal(result.dbCode, '23514');
    }
    passed += 1;
    console.log('✅ PASS [mint failure surfaces constraint_violation, not generic]');
  }

  {
    const result = await redeemPromoAndMint(
      { code: 'NOPE', email: 'user@example.com' },
      mockDeps(async () => ({
        data: null,
        error: { code: 'P0001', message: 'code_not_found' },
      })),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'code_not_found');
    passed += 1;
    console.log('✅ PASS [code_not_found mapped]');
  }

  {
    const sql = fs.readFileSync(
      'supabase/migrations/20260722_promo_free_stripe_mint_atomic.sql',
      'utf8',
    );
    assert.match(sql, /amount >= 0/);
    assert.match(sql, /create or replace function public\.redeem_promo_and_mint/);
    assert.match(sql, /insert into public\.promo_redemptions/);
    assert.match(sql, /insert into public\.stripe_transactions/);
    assert.match(sql, /0,\s*\n\s*'ILS'/);
    assert.match(sql, /check_violation/);
    assert.match(sql, /for update/i);
    passed += 1;
    console.log('✅ PASS [migration: relaxed CHECK + atomic redeem+mint RPC]');
  }

  console.log(`\nALL ${passed} / ${passed} PROMO MINT REGRESSION CHECKS PASSED`);
}

main().catch((err) => {
  console.error('❌ FAIL', err);
  process.exit(1);
});
