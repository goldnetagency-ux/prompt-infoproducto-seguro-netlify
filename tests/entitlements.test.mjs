import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, emailKey, validatePurchase, buildEntitlement, mergeEntitlement } from '../netlify/lib/entitlements.mjs';
import { handleIdentityHook, buildHookResponse } from '../netlify/lib/legacy-identity-hook.mjs';

const req = (body, raw) => new Request('https://x.test/hook', { method: 'POST', body: raw ?? JSON.stringify(body) });

test('normaliza y hashea el correo', () => {
  assert.equal(normalizeEmail('  Maru@Mail.COM '), 'maru@mail.com');
  assert.equal(normalizeEmail('nope'), null);
  assert.equal(emailKey('A@b.com'), emailKey(' a@B.com '));
  assert.match(emailKey('a@b.com'), /^entitlement\/[0-9a-f]{64}$/);
  assert.ok(!emailKey('a@b.com').includes('a@b.com'));
});

test('rechaza plan, precio, moneda, estado incorrectos', () => {
  const ok = { name: 'Ana', email: 'a@b.com', plan: 'combo' };
  assert.equal(validatePurchase(ok).ok, true);
  assert.equal(validatePurchase({ ...ok, plan: 'gratis' }).error, 'invalid_plan');
  assert.equal(validatePurchase({ ...ok, plan: '__proto__' }).error, 'invalid_plan');
  assert.equal(validatePurchase({ ...ok, price: 1 }).error, 'invalid_price');
  assert.equal(validatePurchase({ ...ok, currency: 'USD' }).error, 'invalid_currency');
  assert.equal(validatePurchase({ ...ok, status: 'refunded' }).error, 'invalid_status');
  assert.equal(validatePurchase({ ...ok, email: 'x' }).error, 'invalid_email');
});

test('mergeEntitlement es idempotente y no baja de nivel', () => {
  const combo = buildEntitlement({ email: 'a@b.com', name: 'Ana', plan: 'combo' });
  const cat = buildEntitlement({ email: 'a@b.com', name: 'Ana', plan: 'catalogo' });
  assert.equal(mergeEntitlement(combo, cat).product, 'combo');
  assert.equal(mergeEntitlement(cat, combo).product, 'combo');
  assert.equal(mergeEntitlement(combo, combo).grantedAt, combo.grantedAt);
});

test('preserva roles previos y agrega buyer una sola vez; combo suma rol combo', () => {
  const user = { email: 'a@b.com', app_metadata: { provider: 'google', roles: ['buyer', 'x'] } };
  const r = buildHookResponse(user, { product: 'catalogo' });
  assert.deepEqual(Object.keys(r), ['app_metadata']);
  assert.deepEqual(r.app_metadata.roles, ['buyer', 'x']);
  assert.equal(r.app_metadata.provider, 'google');
  assert.deepEqual(buildHookResponse({ email: 'a@b.com' }, { product: 'combo' }).app_metadata.roles, ['buyer', 'combo']);
});

test('hook acepta body.user y body.payload.user', async () => {
  const lookup = async () => ({ product: 'combo' });
  for (const body of [{ user: { email: 'a@b.com' } }, { payload: { user: { email: 'a@b.com' } } }]) {
    const res = await handleIdentityHook(req(body), 'identity-login', lookup);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(Object.keys(json), ['app_metadata']);
    assert.ok(json.app_metadata.roles.includes('buyer'));
  }
});

test('sin derecho activo no asigna roles', async () => {
  const res = await handleIdentityHook(req({ user: { email: 'a@b.com' } }), 'identity-login', async () => null);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {});
});

test('clasifica payload malformado, usuario ausente y falla de Blobs', async () => {
  const bad = await handleIdentityHook(req(null, '{no-json'), 'identity-login', async () => null);
  assert.equal((await bad.json()).error, 'payload_malformed');
  const nouser = await handleIdentityHook(req({ foo: 1 }), 'identity-login', async () => null);
  assert.equal((await nouser.json()).error, 'user_missing');
  const fail = await handleIdentityHook(req({ user: { email: 'a@b.com' } }), 'identity-login', async () => { throw new Error('blobs'); });
  assert.equal((await fail.json()).error, 'entitlement_lookup_failed');
  assert.equal(fail.status, 500);
});
