(function () {
  var $ = function (id) { return document.getElementById(id); };

  function toast(text) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  // Links que todavía son placeholders (PEGA-AQUI-...): avisan en vez de llevar a una página rota.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a && /PEGA-AQUI/.test(a.getAttribute('href'))) {
      e.preventDefault();
      toast('Este link todavía no está configurado.');
    }
  });

  $('logout').addEventListener('click', async function () {
    try { await window.MaruAuth.logout(); } catch (_) {}
    location.href = '/login.html';
  });

  // Carga el contenido del Combo. Netlify lo entrega solo con rol "combo"; sin rol responde el login,
  // que no trae la marca data-maru-combo, así que queda el bloqueo.
  async function loadCombo() {
    try {
      var res = await fetch('/portal-combo/contenido.html', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return false;
      var html = await res.text();
      if (html.indexOf('data-maru-combo="1"') === -1) return false;
      $('combo-root').innerHTML = html;
      return true;
    } catch (_) { return false; }
  }

  (async function init() {
    var user = null;
    try { user = await window.MaruAuth.currentUser(); } catch (_) {}
    if (!user) { location.replace('/login.html'); return; }

    var first = (user.name || '').trim().split(/\s+/)[0];
    if (first) $('name').textContent = ', ' + first;
    $('who').textContent = user.email || '';
    $('who').classList.remove('hidden');

    var isCombo = await loadCombo();
    $('plan-tag').textContent = isCombo ? 'Combo Premium' : 'Catálogo Premium';

    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  })();
})();
