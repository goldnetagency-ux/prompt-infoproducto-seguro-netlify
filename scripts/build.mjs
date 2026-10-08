import { cp, rm, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });

// Empaqueta @netlify/identity para el navegador -> dist/auth.js (expone window.MaruAuth)
await build({
  entryPoints: ['src/auth.src.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  outfile: 'dist/auth.js'
});

console.log('Build OK -> dist/');
