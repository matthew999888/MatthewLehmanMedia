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
