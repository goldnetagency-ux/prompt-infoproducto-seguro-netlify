import { buildEntitlement, saveEntitlement, validatePurchase, PLANS } from '../lib/entitlements.mjs';

// DEMO: registra una compra simulada. No cobra nada y no es un pago real.
export default async (request: Request) => {
  if (request.method !== 'POST') return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const result = validatePurchase(input);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
  try {
    const saved = await saveEntitlement(buildEntitlement(result.value));
    return Response.json({ ok: true, demo: true, plan: saved.product, planName: PLANS[saved.product].name });
  } catch {
    console.error('[register-demo-purchase] persist_failed');
    return Response.json({ ok: false, error: 'persist_failed' }, { status: 500 });
  }
};
