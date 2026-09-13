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
document.querySelectorAll('.about-vis,.about-txt').forEach(el => obs.observe(el));

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
    const galleries = await count('galleries?select=id&visibility=eq.public');
    if (countEl) countEl.textContent = (galleries || frames.length) + ' galleries published';
  } catch (err) {
    /* Leave the section hidden - the page is exactly as it was without it. */
  }
})();

/* ── The season: 3D planes on a scroll-velocity axis ──────────────────────────
   Twelve frames on one diagonal in perspective. Each plane sits at t steps
   along (+240, -84, -288), so the row recedes up and away. Scroll moves the row
   along that axis; t wraps, so the row never runs out.

   Scroll *speed* is the second input. A low-pass of the per-frame scroll delta
   drives a sine displacement phased by t, which bends the row into a travelling
   wave — fast scrolling ripples it, stopping lets it settle. That needs a rAF
   loop rather than a scroll handler, because the settle happens after the last
   scroll event, so the loop runs only while the section is on screen.

   Images carry data-src: twelve simultaneous requests to Google come back 429
   with no picture, so they are walked three at a time.
─────────────────────────────────────────────────────────────────────────────── */
(function theSeason() {
  const section = document.getElementById('planes');
  const rail    = section && section.querySelector('.pl-rail');
  const stage   = section && section.querySelector('.pl-stage');
  const track   = document.getElementById('plTrack');
  const nowEl   = document.getElementById('plNow');
  if (!section || !rail || !stage || !track) return;

  const planes = [...track.querySelectorAll('.pl-plane')];
  if (planes.length < 3) return;
  const N = planes.length;

  // ── load, a few at a time ─────────────────────────────────────────────────
  const thumb = (id) =>
    'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w640-rj-l78';
  const imgs = planes.map((p) => p.querySelector('img'));
  let next = 0;
  const pump = () => {
    if (next >= imgs.length) return;
    const el = imgs[next++];
    el.addEventListener('load', () => { el.classList.add('is-in'); pump(); }, { once: true });
    el.addEventListener('error', pump, { once: true });
    el.src = thumb(el.dataset.src);
  };
  for (let k = 0; k < 3; k++) pump();

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── geometry ──────────────────────────────────────────────────────────────
  const STEP = { x: 240, y: -84, z: -288 };   // one plane's offset along the axis
  const TILT = -50;                            // rotateY, as in the reference
  const SPAN = 2.4;                            // how many steps the scroll travels per plane
  const ARC = 3.4;                             // sag of the path, so it curves rather than rules
  const FACE = 1.5;                            // how near a plane must be before it turns to camera

  let scale = 1;
  const measure = () => { scale = (planes[0].offsetWidth || 300) / 300; };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrap = (v, min, max) => {
    const r = max - min;
    return ((((v - min) % r) + r) % r) + min;
  };

  let vel = 0;
  let lastY = window.scrollY;
  let lastCap = '';

  const render = () => {
    const runway = rail.offsetHeight - stage.offsetHeight;
    if (runway <= 0) return;
    const p = clamp(-rail.getBoundingClientRect().top / runway, 0, 1);

    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    // Low-pass: spikes while scrolling, decays to nothing when it stops.
    vel = vel * 0.86 + dy * 0.14;
    const v = clamp(vel, -90, 90);

    const offset = p * N * SPAN;
    let frontT = Infinity;
    let frontCap = '';

    for (let i = 0; i < N; i++) {
      const t = wrap(i - offset, -N / 2, N / 2);

      // the wave: a sine along the axis, amplitude from scroll speed
      const wave = Math.sin(t * 0.55) * v * 1.9;
      // a static sag, so the row curves through space instead of ruling a line
      const arc = -(t * t) * ARC * scale;

      const x = t * STEP.x * scale;
      const yy = t * STEP.y * scale + wave + arc;
      const z = t * STEP.z * scale;

      // As a plane reaches the front it turns toward the camera and grows. At a
      // flat -50deg every photograph is foreshortened to the point of being
      // unreadable, which is a poor trade on a photographer's site: this gives
      // each frame one moment where you can actually see it.
      const face = clamp(1 - Math.abs(t) / FACE, 0, 1);
      const turn = face * face * (3 - 2 * face);          // smoothstep
      const rotY = TILT * (1 - turn * 0.84);
      const pop = 1 + turn * 0.24;
      // Banking into the wave, a quarter phase off it, so the row leans as it surfs.
      const bank = Math.cos(t * 0.55) * v * 0.09;

      const el = planes[i];
      el.style.transform =
        'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,' + z.toFixed(1) + 'px)' +
        ' rotateY(' + rotY.toFixed(2) + 'deg)' +
        ' rotateZ(' + bank.toFixed(2) + 'deg)' +
        ' scale(' + pop.toFixed(3) + ')';
      // Nearer planes read brighter and sit above the ones behind them.
      const near = clamp(1 - Math.abs(t) / (N / 2), 0, 1);
      el.style.filter = 'brightness(' + (0.34 + near * 0.66 + turn * 0.12).toFixed(3) + ')';
      el.style.zIndex = String(Math.round(near * 100));
      el.style.opacity = near < 0.06 ? '0' : '1';

      if (Math.abs(t) < frontT) { frontT = Math.abs(t); frontCap = el.dataset.cap || ''; }
    }

    if (nowEl && frontCap && frontCap !== lastCap) {
      lastCap = frontCap;
      nowEl.style.opacity = '0';
      setTimeout(() => { nowEl.textContent = frontCap; nowEl.style.opacity = '1'; }, 140);
    }
  };

  // Scroll starts the loop; the loop keeps itself alive only while the wave is
  // still settling, then stops. Gating this on an IntersectionObserver instead
  // left the whole row frozen at its load-time position — render ran exactly
  // once and every plane stayed at t = its own index.
  let raf = 0;
  const tick = () => {
    render();
    raf = Math.abs(vel) > 0.05 ? requestAnimationFrame(tick) : 0;
  };
  const ensure = () => { if (!raf) raf = requestAnimationFrame(tick); };

  measure();
  addEventListener('scroll', ensure, { passive: true });
  addEventListener('resize', () => { measure(); ensure(); }, { passive: true });
  addEventListener('load', ensure);
  ensure();
})();
