import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');

test('Functions: exactamente los nombres reservados esperados', () => {
  const files = readdirSync('netlify/functions').sort();
  assert.deepEqual(files, ['identity-login.mts', 'identity-signup.mts', 'register-demo-purchase.mts']);
});

test('hooks legacy: export default + Request, sin handler Lambda ni eventSubscriptions ni connectLambda', () => {
  for (const f of ['identity-login.mts', 'identity-signup.mts']) {
    const src = read(`netlify/functions/${f}`);
    assert.match(src, /export default async \(request: Request\)/);
    assert.doesNotMatch(src, /export const handler/);
    assert.doesNotMatch(src, /eventSubscriptions/);
    assert.doesNotMatch(src, /connectLambda/);
  }
  const lib = read('netlify/lib/legacy-identity-hook.mjs');
  assert.match(lib, /Response\.json/);
  assert.match(lib, /request\.json\(\)/);
  assert.doesNotMatch(lib, /connectLambda/);
});

test('_redirects: cada ruta protegida tiene regla Role y fallback al login', () => {
  const lines = read('public/_redirects').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const routes = [
    ['/portal.html', 'buyer'],
    ['/portal', 'buyer'],
    ['/portal/', 'buyer'],
    ['/portal-assets/*', 'buyer'],
    ['/portal-combo/*', 'combo']
  ];
  for (const [route, role] of routes) {
    const rules = lines.filter((l) => l.trim().split(/\s+/)[0] === route);
    assert.ok(rules.some((l) => l.includes(`Role=${role}`) && /\s200!/.test(l)), `falta Role=${role} para ${route}`);
    assert.ok(rules.some((l) => /\/login\.html\s+302!(\s|$)/.test(l)), `falta fallback para ${route}`);
  }
});

test('el contenido del Combo no está en páginas accesibles al nivel Catálogo', () => {
  const portal = read('public/portal.html');
  for (const secret of ['youtu', 'drive.google.com', 'canva.link/1051', 'canva.link/px79', 'canva.link/t3y4', 'wa.me', 'iIVKdkE09TI']) {
    assert.ok(!portal.includes(secret), `portal.html filtra ${secret}`);
  }
  if (existsSync('public/portal-combo/contenido.html')) assert.ok(read('public/portal-combo/contenido.html').includes('data-maru-combo="1"'));
});

test('placeholders pedidos presentes', () => {
  assert.ok(read('public/portal.html').includes('PEGA-AQUI-LINK-UPGRADE'));
  if (existsSync('public/portal-combo/contenido.html')) assert.ok(read('public/portal-combo/contenido.html').includes('PEGA-AQUI-LINK-WHATSAPP-SOPORTE'));
});

test('dist (si existe) contiene HTML, auth.js y _redirects en la raíz', () => {
  if (!existsSync('dist')) return;
  for (const f of ['index.html', 'checkout.html', 'login.html', 'portal.html', 'auth.js', '_redirects']) {
    assert.ok(existsSync(`dist/${f}`), `falta dist/${f}`);
  }
});
