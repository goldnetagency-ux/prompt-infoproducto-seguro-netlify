import { getEntitlement, normalizeEmail } from './entitlements.mjs';

// Roles: `buyer` abre el portal (ambos niveles). `combo` abre además tutorial y soporte.
export function rolesForEntitlement(entitlement) {
  const roles = ['buyer'];
  if (entitlement.product === 'combo') roles.push('combo');
  return roles;
}

export function buildHookResponse(user, entitlement) {
  const appMetadata = { ...(user.app_metadata || {}) };
  const previous = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];
  appMetadata.roles = [...new Set([...previous, ...rolesForEntitlement(entitlement)])];
  return { app_metadata: appMetadata };
}

const json = (body, status = 200) => Response.json(body, { status });

// Atiende identity-login e identity-signup. `lookup` se inyecta para poder testear.
export async function handleIdentityHook(request, hookName, lookup = getEntitlement) {
  let body;
  try {
    body = await request.json();
  } catch {
    console.error(`[${hookName}] payload_malformed`);
    return json({ error: 'payload_malformed' }, 400);
  }
  const user = body?.user || body?.payload?.user;
  if (!user || typeof user !== 'object') {
    console.error(`[${hookName}] user_missing`);
    return json({ error: 'user_missing' }, 400);
  }
  const email = normalizeEmail(user.email);
  if (!email) {
    console.log(`[${hookName}] sin correo válido, sin cambios`);
    return json({});
  }
  let entitlement;
  try {
    entitlement = await lookup(email);
  } catch {
    console.error(`[${hookName}] entitlement_lookup_failed`);
    return json({ error: 'entitlement_lookup_failed' }, 500);
  }
  if (!entitlement) {
    console.log(`[${hookName}] sin derecho activo, sin roles`);
    return json({});
  }
  console.log(`[${hookName}] derecho activo (${entitlement.product}), roles asignados`);
  return json(buildHookResponse(user, entitlement));
}
