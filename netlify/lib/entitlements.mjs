import { createHash } from 'node:crypto';

// El servidor define producto, precio y moneda. Nada de esto viene del navegador.
export const PLANS = {
  catalogo: { id: 'catalogo', name: 'Catálogo Premium', price: 4900, currency: 'ARS', rank: 1 },
  combo: { id: 'combo', name: 'Combo Premium', price: 9900, currency: 'ARS', rank: 2 }
};
export const ALLOWED_STATUS = 'active';

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function emailKey(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('invalid_email');
  return 'entitlement/' + createHash('sha256').update(normalized).digest('hex');
}

// Valida lo que envía el checkout. Precio/moneda/estado enviados se rechazan si no coinciden.
export function validatePurchase(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'invalid_body' };
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: 'invalid_email' };
  if (typeof input.plan !== 'string' || !Object.hasOwn(PLANS, input.plan)) return { ok: false, error: 'invalid_plan' };
  const plan = PLANS[input.plan];
  if (input.price !== undefined && Number(input.price) !== plan.price) return { ok: false, error: 'invalid_price' };
  if (input.currency !== undefined && input.currency !== plan.currency) return { ok: false, error: 'invalid_currency' };
  if (input.status !== undefined && input.status !== ALLOWED_STATUS) return { ok: false, error: 'invalid_status' };
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
  if (!name) return { ok: false, error: 'invalid_name' };
  return { ok: true, value: { email, name, plan: plan.id } };
}

export function buildEntitlement({ email, name, plan }, now = new Date()) {
  const iso = now.toISOString();
  return {
    status: ALLOWED_STATUS,
    product: plan,
    email,
    name,
    source: 'demo-checkout',
    requestedAt: iso,
    grantedAt: iso
  };
}

// Idempotente: reintentar no duplica; una compra menor nunca baja el nivel ya concedido.
export function mergeEntitlement(existing, incoming) {
  if (!existing || existing.status !== ALLOWED_STATUS) return incoming;
  const keepExisting = (PLANS[existing.product]?.rank ?? 0) >= (PLANS[incoming.product]?.rank ?? 0);
  return {
    ...(keepExisting ? existing : incoming),
    email: incoming.email,
    name: incoming.name || existing.name,
    requestedAt: incoming.requestedAt,
    grantedAt: existing.grantedAt || incoming.grantedAt
  };
}

async function defaultStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'entitlements', consistency: 'strong' });
}

export async function getEntitlement(email, store) {
  const s = store || (await defaultStore());
  const ent = await s.get(emailKey(email), { type: 'json', consistency: 'strong' });
  return ent && ent.status === ALLOWED_STATUS && PLANS[ent.product] ? ent : null;
}

export async function saveEntitlement(entitlement, store) {
  const s = store || (await defaultStore());
  const key = emailKey(entitlement.email);
  const existing = await s.get(key, { type: 'json', consistency: 'strong' });
  const merged = mergeEntitlement(existing, entitlement);
  await s.setJSON(key, merged);
  return merged;
}
