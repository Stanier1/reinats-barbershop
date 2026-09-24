/* Shared behaviour: availability engine, header, menu, offer popup, lightbox, hours. */
(function () {
  const RB = window.RB;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: fail quietly */ } }
  };

  const time = RB.time;

  /* ---------- Availability ---------- */
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const avail = {
    LEAD: 30,
    STEP: 30,
    bookings() { return store.get('rb_bookings', []).filter((b) => b.status !== 'cancelled'); },
    works(barber, key) { return barber.days.includes(time.dow(key)); },
    // Simulated existing appointments from other clients, stable per barber/day/half-hour.
    preBooked(barberId, key, unit) { return hash(barberId + '|' + key + '|' + unit) % 100 < 22; },
    isFree(barber, key, start, dur, stored) {
      if (!avail.works(barber, key)) return false;
      for (let u = Math.floor(start / 30) * 30; u < start + dur; u += 30) if (avail.preBooked(barber.id, key, u)) return false;
      return !stored.some((b) => b.barber === barber.id && b.date === key && start < b.end && start + dur > b.start);
    },
    slots(key, dur, barberId) {
      const hrs = RB.hours[time.dow(key)];
      if (!hrs) return [];
      const now = time.now(), stored = avail.bookings();
      const pool = barberId && barberId !== 'any' ? RB.barbers.filter((b) => b.id === barberId) : RB.barbers;
      const out = [];
      for (let t = hrs[0]; t + dur <= hrs[1]; t += avail.STEP) {
        const past = key < now.key || (key === now.key && t < now.minutes + avail.LEAD);
        const free = past ? [] : pool.filter((b) => avail.isFree(b, key, t, dur, stored)).map((b) => b.id);
        out.push({ t, free, past });
      }
      return out;
    },
    next(dur, barberId, days = 10) {
      const today = time.now().key;
      for (let i = 0; i < days; i++) {
        const key = time.addDays(today, i);
        const s = avail.slots(key, dur, barberId).find((x) => x.free.length);
        if (s) return { key, t: s.t, offset: i };
      }
      return null;
    }
  };

  /* ---------- Hours + open status ---------- */
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function openStatus() {
    const now = time.now(), hrs = RB.hours[now.dow];
    if (hrs && now.minutes >= hrs[0] && now.minutes < hrs[1]) return { open: true, text: 'Open now · until ' + time.fmtShort(hrs[1]) };
    for (let i = 0; i < 8; i++) {
      const key = time.addDays(now.key, i), h = RB.hours[time.dow(key)];
      if (!h || (i === 0 && now.minutes >= h[0])) continue;
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[time.dow(key)].slice(0, 3);
      return { open: false, text: 'Closed · opens ' + when + ' ' + time.fmtShort(h[0]) };
    }
    return { open: false, text: 'Closed' };
  }
  function renderHours() {
    const st = openStatus();
    $$('[data-open-status]').forEach((el) => { el.textContent = st.text; el.classList.toggle('is-open', st.open); el.hidden = false; });
    const today = time.now().dow;
    $$('[data-hours-list]').forEach((ul) => {
      ul.innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
        const h = RB.hours[d];
        return '<li' + (d === today ? ' class="is-today" aria-current="date"' : '') + '><span>' + DAY_NAMES[d] + '</span><span>' +
          (h ? time.fmtShort(h[0]) + ' – ' + time.fmtShort(h[1]) : 'Closed') + '</span></li>';
      }).join('');
    });
  }

  /* ---------- Focus handling for dialogs ---------- */
  let lastFocus = null;
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function openLayer(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    document.documentElement.classList.add('no-scroll');
    const first = $$(FOCUSABLE, el).find((n) => n.offsetParent !== null);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }
  function closeLayer(el) {
    if (!el || el.hidden) return;
    el.classList.remove('is-open');
    setTimeout(() => { el.hidden = true; }, 220);
    if (!$$('.modal:not([hidden]).is-open, .mobile-menu.is-open').some((n) => n !== el)) document.documentElement.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function trap(e, el) {
    if (e.key !== 'Tab' || el.hidden) return;
    const f = $$(FOCUSABLE, el).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; } ta.remove(); return ok;
    }
  }

  function init() {
    const page = document.body.dataset.page;

    // Header shadow on scroll
    const header = $('.site-header');
    const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile menu
    const menu = $('#mobile-menu'), toggle = $('[data-menu-open]');
    if (menu && toggle) {
      toggle.addEventListener('click', () => { openLayer(menu); menu.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); });
      const close = () => { closeLayer(menu); toggle.setAttribute('aria-expanded', 'false'); };
      $$('[data-menu-close], .mobile-menu__nav a', menu).forEach((b) => b.addEventListener('click', close));
      menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); trap(e, menu); });
      window.addEventListener('resize', () => { if (window.innerWidth > 960 && !menu.hidden) close(); });
    }

    // Offer popup
    const offer = $('#offer-modal');
    if (offer) {
      const closeOffer = () => { closeLayer(offer); store.set('rb_offer_seen', true); };
      $$('[data-offer-close]', offer).forEach((b) => b.addEventListener('click', closeOffer));
      offer.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOffer(); trap(e, offer); });
      $('[data-offer-apply]', offer).addEventListener('click', () => { store.set('rb_offer_seen', true); try { sessionStorage.setItem('rb_code', RB.promo.code); } catch (e) { /* ignore */ } });
      $('[data-copy-code]', offer).addEventListener('click', async (e) => {
        const ok = await copy(RB.promo.code);
        e.currentTarget.textContent = ok ? 'Copied ✓' : 'Select & copy';
        toast(ok ? 'Code ' + RB.promo.code + ' copied' : 'Copy failed — the code is ' + RB.promo.code);
      });
      $$('[data-open-offer]').forEach((b) => b.addEventListener('click', () => { if (menu && !menu.hidden) closeLayer(menu); openLayer(offer); }));
      if (!store.get('rb_offer_seen', false) && !/[?&]nopopup/.test(location.search)) {
        setTimeout(() => { if (offer.hidden && !$('.modal:not([hidden])') && (!menu || menu.hidden)) openLayer(offer); }, 6000);
      }
    } else {
      $$('[data-open-offer]').forEach((b) => b.addEventListener('click', () => { location.href = 'book.html?code=' + RB.promo.code; }));
    }

    // Lightbox for reels
    const lb = $('#lightbox');
    if (lb) {
      const img = $('[data-lb-img]', lb), cap = $('[data-lb-cap]', lb), handle = $('[data-lb-handle]', lb), book = $('[data-lb-book]', lb);
      const closeLb = () => closeLayer(lb);
      $$('[data-reel]').forEach((r) => r.addEventListener('click', () => {
        img.src = r.dataset.img; img.alt = r.dataset.caption; cap.textContent = r.dataset.caption; handle.textContent = r.dataset.handle;
        book.href = 'book.html?service=' + r.dataset.service; book.textContent = 'Book this look →';
        openLayer(lb);
      }));
      $$('[data-lb-close]', lb).forEach((b) => b.addEventListener('click', closeLb));
      lb.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); trap(e, lb); });
    }

    // Next free chair chip
    $$('[data-next-free]').forEach((el) => {
      const n = avail.next(45, 'any');
      if (!n) return;
      const day = n.offset === 0 ? 'Today' : n.offset === 1 ? 'Tomorrow' : time.fmtDate(n.key, { weekday: 'short' });
      el.querySelector('[data-next-free-text]').textContent = day + ' · ' + time.fmt(n.t);
      el.href = 'book.html';
      el.hidden = false;
    });

    // Service category filter (services page)
    const chips = $$('[data-filter]');
    chips.forEach((c) => c.addEventListener('click', () => {
      const f = c.dataset.filter;
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      $$('[data-cat]').forEach((g) => { g.hidden = f !== 'all' && g.dataset.cat !== f; });
    }));

    // Reveal-on-scroll
    const rev = $$('.reveal');
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
      rev.forEach((el) => io.observe(el));
    } else rev.forEach((el) => el.classList.add('is-in'));

    $$('[data-back-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    renderHours();
    setInterval(renderHours, 60000);
    if (page) document.documentElement.dataset.page = page;
  }

  RB.avail = avail; RB.store = store; RB.toast = toast; RB.copy = copy; RB.openLayer = openLayer; RB.closeLayer = closeLayer; RB.trap = trap;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
