// Vitrina HN: contador propio de visitas y clics. Anónimo: no usa cookies ni guarda IP ni datos personales.
// Registra: visita (al cargar), producto (ficha abierta), tienda (clic a "Ver en tienda"), busqueda y compartir.
// No cuenta: fuera de vitrinahn.shop, navegadores automatizados ni los navegadores marcados como del dueño.
// Marcar este navegador como tuyo: abre vitrinahn.shop/?yo=1 (para volver a contarlo: ?yo=0).
(() => {
  const URL_SB = 'https://yvisjbafsgwmfbemwttl.supabase.co/rest/v1/eventos';
  const KEY = 'sb_publishable_qHM-P5XXJsSAqmy2sDqu-A_P-SNG-_E';
  const ls = (fn) => { try { return fn(); } catch { return null; } };
  const qs = new URLSearchParams(location.search);
  if (qs.has('yo')) {
    const on = qs.get('yo') !== '0';
    ls(() => on ? localStorage.setItem('vh:yo', '1') : localStorage.removeItem('vh:yo'));
    const n = document.createElement('div');
    n.textContent = on ? 'Listo: este navegador ya no cuenta en las estadísticas de Vitrina HN.' : 'Este navegador vuelve a contar en las estadísticas.';
    n.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;background:#0B1F17;color:#fff;padding:12px 18px;border-radius:12px;font:600 14px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center';
    addEventListener('DOMContentLoaded', () => { document.body.appendChild(n); setTimeout(() => n.remove(), 5000); });
    qs.delete('yo');
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
  }
  const off = location.hostname !== 'vitrinahn.shop' || navigator.webdriver || ls(() => localStorage.getItem('vh:yo')) === '1';
  const ses = ls(() => sessionStorage.getItem('vh:ses') || (sessionStorage.setItem('vh:ses', Math.random().toString(36).slice(2, 10)), sessionStorage.getItem('vh:ses'))) || '';
  const disp = matchMedia('(max-width: 760px)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'movil' : 'pc';
  const cut = (s, n) => (s == null ? null : String(s).slice(0, n));

  function vt(tipo, d = {}) {
    if (off) return;
    const body = {
      tipo, ses, disp, ruta: cut(location.pathname + location.hash, 200),
      tienda: cut(d.tienda, 30), producto: cut(d.producto, 160), cat: cut(d.cat, 40),
      precio: typeof d.precio === 'number' && isFinite(d.precio) ? d.precio : null, q: cut(d.q, 80), ref: cut(d.ref, 120), nombre: cut(d.nombre, 120),
    };
    try {
      fetch(URL_SB, { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body) }).catch(() => {});
    } catch {}
  }
  window.vt = vt;

  // Visita: de dónde llegó (otro sitio o campaña ?utm_source=), sin la dirección completa.
  let ref = qs.get('utm_source') || '';
  if (!ref && document.referrer) { try { const h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h.replace(/^www\./, ''); } catch {} }
  vt('visita', { ref });

  // Clics a tiendas: cualquier enlace con data-s (tienda); data-k producto, data-p precio, data-c categoría.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-s]');
    if (a) vt('tienda', { tienda: a.dataset.s, producto: a.dataset.k, precio: Number(a.dataset.p), cat: a.dataset.c, nombre: a.dataset.n });
  }, true);
})();
