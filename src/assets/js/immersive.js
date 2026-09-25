/* Immersive layer: smooth scroll, scroll-driven reveals, page wipes, cursor trail and magnetic buttons.
   Everything here is optional polish: if motion is reduced, WebGL
   is missing or a library fails to load, the site keeps working exactly as before. */
(function () {
  const docEl = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const page = document.body.dataset.page;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const small = window.innerWidth < 768;
  const calm = page === 'book';          // booking stays calm: no smooth scroll or scroll theatre

  const load = (src) => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  const libs = calm ? ['assets/vendor/gsap.min.js'] : ['assets/vendor/gsap.min.js', 'assets/vendor/ScrollTrigger.min.js', 'assets/vendor/lenis.min.js'];
  docEl.classList.add('fx-loading');
  setTimeout(() => docEl.classList.remove('fx-loading'), 1800); // never leave headlines hidden on a slow connection
  libs.reduce((p, src) => p.then(() => load(src)), Promise.resolve())
    .then(() => { docEl.classList.remove('fx-loading'); docEl.classList.add('fx'); start(); })
    .catch(() => { docEl.classList.remove('fx-loading'); });

  function start() {
    const gsap = window.gsap;
    if (fine) { cursor(gsap); magnetic(gsap); }
    wipe(gsap);
    if (calm) return;
    gsap.registerPlugin(window.ScrollTrigger);
    const ST = window.ScrollTrigger;
    smoothScroll(gsap, ST);
    headlines(gsap);
    reveals(gsap, ST);
    counters(gsap, ST);
    parallax(gsap, ST);
    marquee(ST);
    window.addEventListener('load', () => ST.refresh());
  }

  /* ---------- Smooth scroll (Lenis) that pauses while a dialog or the menu is open ---------- */
  function smoothScroll(gsap, ST) {
    const lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    new MutationObserver(() => { docEl.classList.contains('no-scroll') ? lenis.stop() : lenis.start(); }).observe(docEl, { attributes: true, attributeFilter: ['class'] });
    // In-page anchors glide instead of jumping.
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2) return;
      const t = document.querySelector(a.getAttribute('href')); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -90 });
    });
    window.RBLenis = lenis;
  }

  /* ---------- Big headlines rise line by line ---------- */
  function headlines(gsap) {
    document.querySelectorAll('h1.display-xl, h1.display-l').forEach((h) => {
      const parts = h.innerHTML.split(/<br\s*\/?>/i);
      h.innerHTML = parts.map((p) => `<span class="fx-line"><span class="fx-line__in">${p}</span></span>`).join('');
      gsap.from(h.querySelectorAll('.fx-line__in'), { yPercent: 110, rotate: 2, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.1 });
    });
    const heroImg = document.querySelector('.hero__media');
    if (heroImg) gsap.from(heroImg, { clipPath: 'inset(12% 12% 12% 12% round 30px)', scale: 0.96, duration: 1.4, ease: 'expo.out', delay: 0.15 });
    gsap.from('.hero__tags > *, .hero__actions > *, .hero .lead, .hero__stats > div, .page-hero .lead, .page-hero .eyebrow', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.05, delay: 0.35 });
  }

  /* ---------- Sections and cards slide up as they enter ---------- */
  function reveals(gsap, ST) {
    // Take over from the basic IntersectionObserver reveal so the two don't fight.
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    document.querySelectorAll('.section-head h2, .cta-band h2, .story-grid__copy h2').forEach((h) => {
      gsap.from(h, { y: 70, skewY: 3, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
    });
    const groups = ['.card-grid', '.steps', '.reels', '.reviews', '.values', '.info-cards', '.gallery', '.stories', '.perks', '.menu-group', '.faq', '.contact-cards'];
    groups.forEach((g) => document.querySelectorAll(g).forEach((wrap) => {
      const kids = wrap.children; if (!kids.length) return;
      gsap.from(kids, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: wrap, start: 'top 85%' } });
    }));
    const band = document.querySelector('.cta-band');
    if (band) gsap.fromTo(band, { scale: 0.92, borderRadius: '60px' }, { scale: 1, borderRadius: '30px', ease: 'none', scrollTrigger: { trigger: band, start: 'top 95%', end: 'top 45%', scrub: true } });
  }

  /* ---------- Numbers count up (12k+, 4.9★, 2018, $15 …) ---------- */
  function counters(gsap, ST) {
    document.querySelectorAll('.hero__stats strong, .stat-row strong').forEach((el) => {
      const m = el.textContent.match(/^(\D*)([\d.]+)(.*)$/); if (!m) return;
      const [, pre, num, post] = m; const end = parseFloat(num); const dec = (num.split('.')[1] || '').length;
      const from = end >= 1000 ? end - 40 : 0; const obj = { v: from };
      el.textContent = pre + from.toFixed(dec) + post;
      gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => { el.textContent = pre + obj.v.toFixed(dec) + post; } });
    });
  }

  /* ---------- Depth: hero image drifts, reels counter-scroll, service photos ease ---------- */
  function parallax(gsap, ST) {
    const heroPic = document.querySelector('.hero__media img');
    if (heroPic) gsap.to(heroPic, { yPercent: 10, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    if (!small) document.querySelectorAll('.reel').forEach((r, i) => {
      gsap.fromTo(r, { y: i % 2 ? 60 : -20 }, { y: i % 2 ? -40 : 30, ease: 'none', scrollTrigger: { trigger: '.reels', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    document.querySelectorAll('.svc-card__media img, .story-grid__media img, .gallery img').forEach((img) => {
      gsap.fromTo(img, { scale: 1.15, yPercent: -4 }, { scale: 1.02, yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Marquee speeds up and reverses with scroll velocity ---------- */
  function marquee(ST) {
    const track = document.querySelector('.marquee__track'); if (!track) return;
    const anim = track.getAnimations ? track.getAnimations()[0] : null; if (!anim) return;
    let target = 1, rate = 1;
    ST.create({ trigger: document.body, start: 0, end: 'max', onUpdate: (self) => { const v = self.getVelocity(); target = Math.max(-6, Math.min(6, 1 + v / 450)); if (Math.abs(target) < 1) target = target < 0 ? -1 : 1; } });
    (function tick() { rate += (target - rate) * 0.08; target += (Math.sign(target) - target) * 0.04; anim.playbackRate = rate; requestAnimationFrame(tick); })();
  }

  /* ---------- Page transition: three barber-pole panels wipe between pages ---------- */
  function wipe(gsap) {
    const w = document.createElement('div'); w.className = 'fx-wipe'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<i></i><i></i><i></i>';
    document.body.appendChild(w);
    const bars = w.children;
    let arrived = false; try { arrived = sessionStorage.getItem('rb_wipe') === '1'; sessionStorage.removeItem('rb_wipe'); } catch (e) {}
    if (arrived) gsap.fromTo(bars, { scaleY: 1, transformOrigin: '50% 0%' }, { scaleY: 0, duration: 0.6, ease: 'expo.inOut', stagger: 0.06, delay: 0.05 });
    window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(bars, { scaleY: 0 }); });
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname)) return;
      if (u.pathname === location.pathname && u.search === location.search) return; // same page, maybe a hash jump
      e.preventDefault();
      try { sessionStorage.setItem('rb_wipe', '1'); } catch (err) {}
      gsap.fromTo(bars, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.45, ease: 'expo.in', stagger: 0.05,
        onComplete: () => { location.href = u.href; } });
      setTimeout(() => { location.href = u.href; }, 900); // never strand the visitor if the tween stalls
    });
  }

  /* ---------- Cursor trail (mouse only; native cursor stays for usability) ---------- */
  function cursor(gsap) {
    const ring = document.createElement('div'); ring.className = 'fx-cursor'; ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<span class="fx-cursor__label"></span>';
    document.body.appendChild(ring);
    const label = ring.firstChild;
    const xTo = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' }), yTo = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); ring.classList.add('is-on'); }, { passive: true });
    document.addEventListener('mouseleave', () => ring.classList.remove('is-on'));
    // The home film reports what the pointer is over in the 3D scene (Drag, Meet, Spin...).
    window.addEventListener('xp:cursor', (e) => { const txt = e.detail || ''; label.textContent = txt; ring.classList.toggle('has-label', !!txt); ring.classList.toggle('is-hover', !!txt); });
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('.reel, .barber-mini, .story, .svc-card, a, button, [role="button"], input, textarea, summary');
      ring.classList.toggle('is-hover', !!t);
      const txt = t && (t.matches('.reel') ? 'View' : t.matches('.barber-mini, .story') ? 'Meet' : t.matches('.svc-card') ? 'Book' : '');
      label.textContent = txt || ''; ring.classList.toggle('has-label', !!txt);
      ring.classList.toggle('is-text', !!(t && t.matches('input, textarea')));
    });
  }

  /* ---------- Primary buttons lean towards the pointer ---------- */
  function magnetic(gsap) {
    document.querySelectorAll('.btn--lime, .btn--ink, .btn--xl').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
      b.addEventListener('mousemove', (e) => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.22); yTo((e.clientY - r.top - r.height / 2) * 0.3); });
      b.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }
})();
