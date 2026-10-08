import { handleIdentityHook } from '../lib/legacy-identity-hook.mjs';

export default async (request: Request) => handleIdentityHook(request, 'identity-login');
