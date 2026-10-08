# Soy Maru · Guía de configuración en Netlify

Estado: **checkout DEMO** (no cobra). Producto: Catálogo Premium (ARS 4.900) y Combo Premium (ARS 9.900).

## Cómo funcionan los permisos

- Google confirma quién es la persona.
- El servidor guarda la compra (Netlify Blobs) y, al iniciar sesión, un hook de Identity asigna roles:
  - `buyer`: cualquier compradora (abre `/portal` y `/portal-assets/*`).
  - `combo`: solo Combo (abre `/portal-combo/*`: tutorial, soporte y bonos).
- Netlify bloquea cada archivo por rol antes de entregarlo (`public/_redirects`). Las secciones del Combo
  que ve el nivel Catálogo son solo un cartel de «bloqueado»: el contenido real no viaja en esa página.

## Contenido pago fuera de GitHub (importante)

Este repo es **público**. Por eso `.gitignore` excluye `public/portal-combo/`, `public/portal-assets/`,
`public/img/` y los PDF. Esos archivos existen solo en tu compu y se publican con `netlify deploy`
desde esta carpeta. Si usás deploy automático desde GitHub, el portal saldría sin ese contenido.
Para deploy automático, el repo tendría que ser privado (un fork de repo público no se puede pasar a privado
directamente; habría que crear un repo nuevo privado).

## Links a completar

| Placeholder | Dónde | Qué poner |
|---|---|---|
| `PEGA-AQUI-LINK-WHATSAPP-SOPORTE` | `public/portal-combo/contenido.html` | Link de WhatsApp de soporte |
| `PEGA-AQUI-LINK-UPGRADE` | `public/portal.html` | Link para pasarse al Combo |

Mientras sean placeholders, el botón muestra «Este link todavía no está configurado».

## Pasos manuales en Netlify (los hacés vos en la interfaz)

1. Iniciar sesión en Netlify y crear el sitio (o vincular uno existente).
2. **Project configuration → General → Visitor access**: Producción = **Public** (previews pueden quedar Private).
3. Habilitar **Identity**, con registro abierto.
4. Identity → External providers → habilitar **Google**.
5. Publicar: `npx netlify-cli deploy --prod` desde esta carpeta.

## Probar

- `npm test` y `npm run build`.
- Prueba publicada: sin sesión, `/portal`, `/portal/` y `/portal.html` deben quedar denegadas; comprar en DEMO,
  entrar con Google con el mismo correo y abrir el portal; una cuenta de Google sin compra no debe entrar;
  una compra Catálogo no debe abrir `/portal-combo/contenido.html`.

## Límites

- DEMO ≠ pago real: cualquiera puede «comprar» sin pagar hasta que se conecte Mercado Pago (con webhook verificado).
- Esto evita que alguien sin permiso reciba los archivos; no impide que una compradora legítima comparta lo que ya recibió.
- Las vistas previas son miniaturas de las plantillas de Canva; si cambiás una plantilla, reemplazá la imagen en `public/img/`.
