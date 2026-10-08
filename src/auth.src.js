// Adaptador mínimo de Netlify Identity. Se empaqueta en dist/auth.js y expone window.MaruAuth.
// Nada de lo que hace este archivo concede acceso: el permiso lo decide el servidor (rol en el JWT + _redirects).
import { oauthLogin, handleAuthCallback, getUser, logout } from '@netlify/identity';

const roles = (user) => (user && Array.isArray(user.roles) ? user.roles : []);

window.MaruAuth = {
  loginWithGoogle: () => oauthLogin('google'),
  // Debe llamarse al cargar login.html: procesa el hash que deja Google al volver.
  handleCallback: () => handleAuthCallback(),
  currentUser: () => getUser(),
  logout: () => logout(),
  roles,
  hasRole: (user, role) => roles(user).includes(role)
};
