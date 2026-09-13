/* ── Smooth scroll helper (NOT named scrollTo — that shadows window.scrollTo) ── */
function navScrollTo(targetId) {
  const target = document.getElementById(targetId);
  if (!target) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const navH = document.querySelector('.nav').offsetHeight || 72;
  const top  = target.getBoundingClientRect().top + window.scrollY - navH;
  window.scrollTo({ top: top, behavior: 'smooth' });
}

/* ── Wire ALL data-target elements ── */
document.querySelectorAll('[data-target]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    navScrollTo(el.getAttribute('data-target'));
  });
});

/* ── Nav logo → top ── */
document.getElementById('navLogoBtn').addEventListener('click', function(e) {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ── Reveal on scroll ── */
const obs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.about-vis,.about-txt,.svc-graphic').forEach(el => obs.observe(el));

/* ── Mobile hamburger nav ── */
const burger = document.getElementById('navBurger');
const drawer = document.getElementById('navDrawer');
burger.addEventListener('click', function() {
  const isOpen = drawer.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});
document.querySelectorAll('.drawer-link').forEach(function(link) {
  link.addEventListener('click', function() {
    drawer.classList.remove('open');
    burger.classList.remove('open');
    document.body.style.overflow = '';
    /* scroll is handled by the data-target listener above */
  });
});

/* ── Contact form ── */
document.querySelectorAll('.field input, .field textarea').forEach(input => {
  const check = () => input.closest('.field').classList.toggle('has-val', input.value.trim() !== '');
  input.addEventListener('input', check); input.addEventListener('change', check); check();
});
/* ── Turnstile + contact form ──────────────────────────────────────────────
   The widget only appears once a site key is configured; until then the
   server skips the check and the form keeps working.
─────────────────────────────────────────────────────────────────────────── */
let turnstileSiteKey = null;
let turnstileWidgetId = null;

(async function loadSiteConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const cfg = await res.json();
    turnstileSiteKey = cfg.turnstileSiteKey || null;
    if (!turnstileSiteKey) return;

    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.defer = true;
    s.onload = () => {
      turnstileWidgetId = window.turnstile.render('#contactTurnstile', {
        sitekey: turnstileSiteKey,
        theme: 'dark',
      });
    };
    document.head.appendChild(s);
  } catch {
    /* no /api available — leave the form as-is */
  }
})();

/* ── Nav: reflect whether they're signed in ──────────────────────────────── */
(function reflectSession() {
  const link = document.getElementById('navAuthLink');
  if (!link) return;
  try {
    // Supabase stores its session under a project-scoped localStorage key.
    const signedIn = Object.keys(localStorage)
      .some(k => k.startsWith('sb-') && k.endsWith('-auth-token') && localStorage.getItem(k));
    if (signedIn) link.textContent = 'My Account';
  } catch {
    /* storage blocked — leave the default label */
  }
})();

const form  = document.getElementById('contactForm');
const sBtn  = document.getElementById('submitBtn');
const okEl  = document.getElementById('statusSuccess');
const errEl = document.getElementById('statusError');
const errText = document.getElementById('statusErrorText');

form.addEventListener('submit', async e => {
  e.preventDefault();
  okEl.classList.remove('show'); errEl.classList.remove('show');

  if (turnstileSiteKey && turnstileWidgetId !== null && !window.turnstile.getResponse(turnstileWidgetId)) {
    errText.textContent = 'Please complete the human check above.';
    errEl.classList.add('show');
    return;
  }

  sBtn.disabled = true; sBtn.textContent = 'Sending…';

  try {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    document.getElementById('name').value.trim(),
        email:   document.getElementById('email').value.trim(),
        subject: document.getElementById('sport').value.trim(),
        message: document.getElementById('message').value.trim(),
        company: document.getElementById('company').value,   // honeypot
        turnstileToken: (turnstileSiteKey && turnstileWidgetId !== null)
          ? window.turnstile.getResponse(turnstileWidgetId) : '',
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.ok === false) throw new Error(body.error || 'Send failed');

    okEl.classList.add('show');
    form.reset();
    document.querySelectorAll('.field').forEach(f => f.classList.remove('has-val'));
    sBtn.textContent = 'Sent ✓';
  } catch (err) {
    errText.textContent = err.message || 'Something went wrong. Please email me directly.';
    errEl.classList.add('show');
    sBtn.disabled = false;
    sBtn.textContent = 'Send Message';
  } finally {
    if (turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
  }
});

/* ── Recent frames: a live contact sheet ──────────────────────────────────────
   The homepage showed two photographs total, one of them a hero darkened nearly
   to black. This pulls real gallery covers from the same database the gallery
   page reads, so the strip is never stock and never goes stale.

   Two Drive rules, both from api/_lib/drive.js and both load-bearing:
     - referrerpolicy="no-referrer", or Google answers 429 for every tile at once
     - the -rj-l suffix forces JPEG; without it these PNGs are megabytes each
─────────────────────────────────────────────────────────────────────────────── */
(async function recentFrames() {
  const section = document.getElementById('reel');
  const track   = document.getElementById('reelTrack');
  const countEl = document.getElementById('reelCount');
  if (!section || !track) return;

  const driveId = (url) => {
    if (!url) return null;
    const s = String(url);
    return (
      (s.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) || [])[1] ||
      (s.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || [])[1] ||
      (s.match(/\/d\/([A-Za-z0-9_-]{10,})/) || [])[1] ||
      null
    );
  };
  const thumb = (id) =>
    'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w600-rj-l75';

  try {
    const cfg = await fetch('/api/config').then((r) => r.json());
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
    const headers = { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey };

    const res = await fetch(
      cfg.supabaseUrl + '/rest/v1/galleries' +
        '?select=slug,title,cover_url&visibility=eq.public&order=sort_order&limit=24',
      { headers }
    );
    if (!res.ok) return;

    const frames = (await res.json())
      .map((g) => ({ slug: g.slug, title: g.title, id: driveId(g.cover_url) }))
      .filter((g) => g.id);
    if (frames.length < 4) return;

    // Built twice so the marquee wraps without a seam. The clone is hidden from
    // assistive tech and from the tab order.
    const build = (g, clone) => {
      const a = document.createElement('a');
      a.className = 'reel-frame';
      a.href = '/gallery#gallery-' + g.slug;
      if (clone) {
        a.setAttribute('aria-hidden', 'true');
        a.tabIndex = -1;
      } else {
        a.setAttribute('aria-label', g.title + ' - open gallery');
      }

      const img = document.createElement('img');
      img.src = thumb(g.id);
      img.alt = clone ? '' : g.title + ' - Matthew Lehman Media';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.width = 600;
      img.height = 400;

      const cap = document.createElement('figcaption');
      cap.textContent = g.title;

      a.append(img, cap);
      return a;
    };

    const frag = document.createDocumentFragment();
    frames.forEach((g) => frag.append(build(g, false)));
    frames.forEach((g) => frag.append(build(g, true)));
    track.append(frag);
    section.hidden = false;

    // Real numbers for the About section, from the same source.
    const count = async (path) => {
      const r = await fetch(cfg.supabaseUrl + '/rest/v1/' + path, {
        headers: Object.assign({}, headers, { Prefer: 'count=exact', Range: '0-0' }),
      });
      const m = /\/(\d+)\s*$/.exec(r.headers.get('content-range') || '');
      return m ? Number(m[1]) : null;
    };
    const [galleries, photos] = await Promise.all([
      count('galleries?select=id&visibility=eq.public'),
      count('media?select=id'),
    ]);
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el && v != null) el.textContent = v;
    };
    set('statGalleries', galleries);
    set('statPhotos', photos);
    if (countEl) countEl.textContent = (galleries || frames.length) + ' galleries published';
  } catch (err) {
    /* Leave the section hidden - the page is exactly as it was without it. */
  }
})();
