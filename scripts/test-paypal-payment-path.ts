/**
 * PayPal payment-path reliability regressions.
 * Real jwt.sign via PaymentDispatchTokenService (not mocked).
 * Run: npx tsx --tsconfig tsconfig.json scripts/test-paypal-payment-path.ts
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { PaymentDispatchTokenService } from '../lib/auth/payment_dispatch_token_service';
import {
  claimPaypalCaptureAndMint,
  mapPaypalClaimRpcError,
  ON_DEMAND_AMOUNT_ILS,
  type PaypalClaimDeps,
} from '../lib/payments/paypal_claim_mint';

function realSignDeps(
  rpc: PaypalClaimDeps['rpc'],
): PaypalClaimDeps {
  const svc = new PaymentDispatchTokenService();
  return {
    isConfigured: () => true,
    rpc,
    signDispatch: (payload) => svc.signDispatch(payload),
  };
}

async function main() {
  let passed = 0;

  {
    const sql = fs.readFileSync(
      'supabase/migrations/20260723_paypal_payment_path_reliability.sql',
      'utf8',
    );
    assert.match(sql, /create or replace function public\.ensure_wizard_user/);
    assert.match(
      sql,
      /create or replace function public\.claim_paypal_capture_and_mint/,
    );
    assert.match(sql, /on conflict \(email\) do update/i);
    assert.match(sql, /gateway_provider',\s*'paypal'/);
    assert.match(sql, /reason',\s*'user_not_found'/);
    passed += 1;
    console.log('✅ PASS [migration: ensure_wizard_user + claim_paypal RPC]');
  }

  {
    const jti = crypto.randomUUID();
    const svc = new PaymentDispatchTokenService();
    const { token, jti: out } = svc.signDispatch({
      sub: crypto.randomUUID(),
      valuationId: crypto.randomUUID(),
      email: 'payer@example.com',
      jti,
    });
    assert.equal(out, jti);
    const decoded = jwt.decode(token) as { jti?: string } | null;
    assert.equal(decoded?.jti, jti);
    passed += 1;
    console.log('✅ PASS [real signDispatch jti via options.jwtid only]');
  }

  {
    let capturedJti: string | null = null;
    let capturedJwt: string | null = null;
    const captureId = `CAP-${crypto.randomUUID()}`;
    const result = await claimPaypalCaptureAndMint(
      {
        captureId,
        saleId: 'ORDER-1',
        payerEmail: 'Payer@Example.com',
        gatewayAmountIls: 999,
      },
      realSignDeps(async (fn, args) => {
        assert.equal(fn, 'claim_paypal_capture_and_mint');
        assert.equal(args.p_payer_email, 'payer@example.com');
        assert.equal(args.p_capture_id, captureId);
        assert.equal(args.p_amount, ON_DEMAND_AMOUNT_ILS);
        capturedJti = String(args.p_token_jti);
        capturedJwt = String(args.p_token_jwt);
        assert.match(capturedJwt, /^eyJ/);
        const decoded = jwt.decode(capturedJwt) as { jti?: string } | null;
        assert.equal(decoded?.jti, capturedJti);
        return {
          data: {
            ok: true,
            duplicate: false,
            transaction_id: args.p_transaction_id,
            valuation_id: null,
            user_id: '11111111-1111-1111-1111-111111111111',
          },
          error: null,
        };
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.duplicate, false);
      assert.ok(result.dispatchToken);
      const verified = new PaymentDispatchTokenService().verifyDispatch(
        result.dispatchToken!,
      );
      assert.equal(verified.jti, capturedJti);
      assert.equal(verified.email, 'payer@example.com');
    }
    passed += 1;
    console.log(
      '✅ PASS [happy path: real sign + RPC args jti === decoded jti]',
    );
  }

  {
    const result = await claimPaypalCaptureAndMint(
      {
        captureId: `CAP-${crypto.randomUUID()}`,
        payerEmail: 'ghost@example.com',
      },
      realSignDeps(async () => ({
        data: { ok: false, reason: 'user_not_found' },
        error: null,
      })),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'user_not_found');
    passed += 1;
    console.log('✅ PASS [negative: user_not_found from RPC]');
  }

  {
    const mapped = mapPaypalClaimRpcError({
      code: 'XX000',
      message: 'connection refused to database',
    });
    assert.equal(mapped.ok, false);
    assert.equal(mapped.reason, 'db_error');
    passed += 1;
    console.log('✅ PASS [negative: DB failure maps to db_error → route 5xx]');
  }

  {
    const result = await claimPaypalCaptureAndMint(
      {
        captureId: `CAP-${crypto.randomUUID()}`,
        payerEmail: 'payer@example.com',
      },
      realSignDeps(async () => ({
        data: null,
        error: {
          code: '57014',
          message: 'canceling statement due to statement timeout',
        },
      })),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'db_error');
    passed += 1;
    console.log('✅ PASS [negative: RPC transport error → db_error]');
  }

  {
    const webhookSrc = fs.readFileSync(
      'app/api/v1/payments/paypal-webhook/route.ts',
      'utf8',
    );
    assert.match(webhookSrc, /UNMATCHED_PAYMENT/);
    assert.match(webhookSrc, /status: 500/);
    assert.match(webhookSrc, /status: 503/);
    assert.match(webhookSrc, /claimPaypalCaptureAndMint/);
    assert.match(webhookSrc, /user_not_found/);
    assert.doesNotMatch(webhookSrc, /valubot_leads/);
    passed += 1;
    console.log('✅ PASS [webhook: unmatched error log + 5xx + no leads match]');
  }

  {
    const step4 = fs.readFileSync(
      'components/wizard/equify/steps/Step4Goal.tsx',
      'utf8',
    );
    assert.match(step4, /emailConfirmed/);
    assert.match(step4, /PayPalHostedButton/);
    assert.match(step4, /postEnsureWizardUser/);
    assert.match(step4, /אותה כתובת מייל|same email/);
    passed += 1;
    console.log('✅ PASS [UI: email confirm gate before PayPal button]');
  }

  console.log(`\nALL ${passed} / ${passed} PAYPAL PAYMENT PATH CHECKS PASSED`);
}

main().catch((err) => {
  console.error('❌ FAIL', err);
  process.exit(1);
});
