/* Booking flow: service → barber → date & time → details → confirmation with calendar export. */
(function () {
  const RB = window.RB, T = RB.time, A = RB.avail, S = RB.store;
  const app = document.getElementById('booking-app');
  if (!app) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n)));
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const DAYS_AHEAD = 21;
  const STEPS = ['Service', 'Barber', 'Date & time', 'Your details'];
  const svcById = (id) => RB.services.find((s) => s.id === id);
  const barberById = (id) => RB.barbers.find((b) => b.id === id);
  // Codes match case-insensitively; a valid one is always shown in its canonical spelling.
  const normCode = (c) => { const t = String(c || '').trim(); return t.toUpperCase() === RB.promo.code.toUpperCase() ? RB.promo.code : t.toUpperCase(); };

  /* ---------- State ---------- */
  const params = new URLSearchParams(location.search);
  let code = normCode(params.get('code'));
  try { if (!code) code = normCode(sessionStorage.getItem('rb_code')); } catch (e) { /* ignore */ }
  const saved = S.get('rb_client', {});
  const state = {
    step: 1,
    svc: svcById(params.get('service')) ? params.get('service') : null,
    barber: barberById(params.get('barber')) ? params.get('barber') : 'any',
    date: null,
    time: null,
    form: { name: saved.name || '', phone: saved.phone || '', email: saved.email || '', notes: '', code, agree: false },
    appliedCode: '',
    codeMsg: '',
    errors: {},
    conf: null
  };
  if (state.svc) state.step = barberById(params.get('barber')) ? 3 : 2;

  /* ---------- Derived ---------- */
  const svc = () => svcById(state.svc);
  function discountFor(s, c) {
    if (!s || !c) return { amount: 0, msg: '' };
    if (c !== RB.promo.code) return { amount: 0, msg: 'That code isn’t valid.', bad: true };
    if (RB.promo.excludes.includes(s.cat)) return { amount: 0, msg: RB.promo.code + ' can’t be used on packages.', bad: true };
    if (A.bookings().some((b) => b.code === RB.promo.code)) return { amount: 0, msg: 'This code has already been used on this device.', bad: true };
    return { amount: Math.round(s.price * RB.promo.percent) / 100, msg: RB.promo.percent + '% off applied.' };
  }
  const discount = () => discountFor(svc(), state.appliedCode);
  const canReach = (n) => n === 1 || (n <= 3 && !!state.svc) || (n === 4 && !!(state.svc && state.date && state.time != null));
  const slots = () => (svc() && state.date ? A.slots(state.date, svc().min, state.barber) : []);
  function dayInfo(key) {
    const hrs = RB.hours[T.dow(key)];
    if (!hrs) return { ok: false, sub: 'Closed' };
    if (state.barber !== 'any' && !A.works(barberById(state.barber), key)) return { ok: false, sub: 'Day off' };
    if (svc() && !A.slots(key, svc().min, state.barber).some((x) => x.free.length)) return { ok: false, sub: 'Full' };
    return { ok: true, sub: T.fmtDate(key, { month: 'short' }) };
  }
  function firstOpenDay() {
    const today = T.now().key;
    for (let i = 0; i < DAYS_AHEAD; i++) { const k = T.addDays(today, i); if (dayInfo(k).ok) return k; }
    return null;
  }
  // Drop a chosen time if it's no longer valid for the current service/barber/date.
  function revalidateTime() {
    if (state.time == null) return;
    const s = slots().find((x) => x.t === state.time);
    if (!s || !s.free.length) state.time = null;
  }

  /* ---------- Icons ---------- */
  const ic = {
    check: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
    google: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.8 10.2H12v3.9h5.6c-.5 2.5-2.7 4-5.6 4a6.1 6.1 0 1 1 3.9-10.8l2.9-2.8A10 10 0 1 0 12 22c5.8 0 9.9-4 9.9-9.8 0-.7 0-1.3-.1-2Z"/></svg>',
    apple: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.2-1.3 3.1-2.5a10 10 0 0 0 1.4-2.9 4.5 4.5 0 0 1-2.6-4.1ZM13.9 4.9a4.4 4.4 0 0 0 1-3.2 4.6 4.6 0 0 0-3 1.5 4.2 4.2 0 0 0-1 3.1 3.8 3.8 0 0 0 3-1.4Z"/></svg>',
    outlook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2.5"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
    download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16"/></svg>',
    globe: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
  };

  /* ---------- Step views ---------- */
  function viewService() {
    return `
      <h2 class="panel-title" tabindex="-1">Choose a service</h2>
      <p class="panel-sub">All prices in USD. Every service includes a consult and a hot towel finish.</p>
      ${RB.categories.map((c) => `
        <div class="opt-group">
          <div class="opt-group__label">${esc(c.name)}</div>
          <div class="opt-list">
            ${RB.services.filter((s) => s.cat === c.id).map((s) => `
              <button type="button" class="opt" data-pick-svc="${s.id}" aria-pressed="${state.svc === s.id}">
                <span class="opt__radio" aria-hidden="true"></span>
                <span class="opt__main"><span class="opt__name">${esc(s.name)}</span><span class="opt__meta">${s.min} min</span></span>
                <span class="opt__price">$${s.price}</span>
              </button>`).join('')}
          </div>
        </div>`).join('')}`;
  }

  function nextLabel(n) {
    if (!n) return 'No openings in 3 weeks';
    const d = n.offset === 0 ? 'Today' : n.offset === 1 ? 'Tomorrow' : T.short(n.key);
    return 'Next: ' + d + ', ' + T.fmt(n.t);
  }
  function viewBarber() {
    const s = svc();
    const anyNext = A.next(s.min, 'any', DAYS_AHEAD);
    return `
      <h2 class="panel-title" tabindex="-1">Choose your barber</h2>
      <p class="panel-sub">Everyone does every service. Pick a favourite, or take the first free chair for the most choice of times.</p>
      <div class="barber-opts">
        <button type="button" class="opt barber-opt" data-pick-barber="any" aria-pressed="${state.barber === 'any'}">
          <span class="barber-opt__img"><span class="barber-opt__any">First<br>free<br>chair</span><span class="opt__radio" aria-hidden="true"></span></span>
          <span class="barber-opt__body"><span class="opt__name">Any barber</span><span class="opt__meta">${esc(nextLabel(anyNext))}</span></span>
        </button>
        ${RB.barbers.map((b) => {
          const n = A.next(s.min, b.id, DAYS_AHEAD);
          return `
          <button type="button" class="opt barber-opt" data-pick-barber="${b.id}" aria-pressed="${state.barber === b.id}" ${n ? '' : 'disabled'}>
            <span class="barber-opt__img"><img src="assets/img/${b.img}" alt="" width="800" height="1000" loading="lazy"><span class="opt__radio" aria-hidden="true"></span></span>
            <span class="barber-opt__body"><span class="opt__name">${esc(b.name)}</span><span class="opt__meta">${esc(b.role)}</span><span class="opt__meta" style="color:var(--lime)">${esc(nextLabel(n))}</span></span>
          </button>`;
        }).join('')}
      </div>`;
  }

  function viewTime() {
    const today = T.now().key;
    const days = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const k = T.addDays(today, i), info = dayInfo(k);
      days.push(`
        <button type="button" class="day" data-pick-day="${k}" aria-pressed="${state.date === k}" ${info.ok ? '' : 'disabled'} aria-label="${esc(T.long(k))}${info.ok ? '' : ', ' + info.sub}">
          <small>${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : T.fmtDate(k, { weekday: 'short' })}</small>
          <strong>${T.fmtDate(k, { day: 'numeric' })}</strong>
          <span>${esc(info.sub)}</span>
        </button>`);
    }
    let body;
    if (!state.date) {
      body = '<div class="notice">Choose a day above to see open times. We’re closed on Sundays.</div>';
    } else {
      const list = slots();
      if (!list.some((x) => x.free.length)) {
        body = '<div class="notice"><strong>No free times left on this day.</strong> Try another day' + (state.barber !== 'any' ? ' or choose “Any barber”.' : '.') + '</div>';
      } else {
        const groups = [['Morning', (t) => t < 720], ['Afternoon', (t) => t >= 720 && t < 1020], ['Evening', (t) => t >= 1020]];
        body = groups.map(([label, fn]) => {
          const g = list.filter((x) => fn(x.t));
          if (!g.length) return '';
          return `<div class="slot-group"><div class="opt-group__label">${label}</div><div class="slots">
            ${g.map((x) => `<button type="button" class="slot" data-pick-time="${x.t}" aria-pressed="${state.time === x.t}" ${x.free.length ? '' : 'disabled'} aria-label="${T.fmt(x.t)}${x.free.length ? '' : ', unavailable'}">${T.fmt(x.t)}</button>`).join('')}
          </div></div>`;
        }).join('');
      }
    }
    const localOff = -new Date().getTimezoneOffset();
    let tzExtra = '';
    if (localOff !== RB.shop.utcOffsetMinutes && state.date && state.time != null) {
      const d = T.toUTC(state.date, state.time);
      tzExtra = ' · that’s ' + d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' your time';
    }
    return `
      <h2 class="panel-title" tabindex="-1">Pick a day &amp; time</h2>
      <p class="panel-sub">${esc(svc().name)} · ${svc().min} min · ${state.barber === 'any' ? 'any barber' : 'with ' + esc(barberById(state.barber).first)}</p>
      <div class="day-strip" role="group" aria-label="Available days">${days.join('')}</div>
      ${state.date ? `<p class="tz-note">${ic.globe}<span>${esc(T.long(state.date))} · times in ${esc(RB.shop.tzLabel)}${esc(tzExtra)}</span></p>` : ''}
      ${body}`;
  }

  function field(id, label, type, value, opts = {}) {
    const err = state.errors[id];
    return `
      <div class="field ${opts.span ? 'span-2' : ''}">
        <label for="bk-${id}">${label}${opts.optional ? ' <span class="field__opt">(optional)</span>' : ''}</label>
        ${type === 'textarea'
          ? `<textarea id="bk-${id}" name="${id}" class="input" placeholder="${esc(opts.ph || '')}" maxlength="400">${esc(value)}</textarea>`
          : `<input id="bk-${id}" name="${id}" class="input" type="${type}" value="${esc(value)}" ${opts.ac ? `autocomplete="${opts.ac}"` : ''} ${opts.im ? `inputmode="${opts.im}"` : ''} placeholder="${esc(opts.ph || '')}" ${opts.optional ? '' : 'required'} aria-invalid="${!!err}" aria-describedby="bk-${id}-err">`}
        <div class="field__err" id="bk-${id}-err">${esc(err || '')}</div>
      </div>`;
  }
  function viewDetails() {
    const f = state.form, d = discount();
    return `
      <h2 class="panel-title" tabindex="-1">Your details</h2>
      <p class="panel-sub">So we can hold your chair and reach you if anything changes.</p>
      <form class="form-grid" data-form novalidate>
        ${field('name', 'Full name', 'text', f.name, { ac: 'name', ph: 'e.g. Tatenda Moyo' })}
        ${field('phone', 'Mobile number', 'tel', f.phone, { ac: 'tel', im: 'tel', ph: '+263 77 123 4567' })}
        ${field('email', 'Email', 'email', f.email, { ac: 'email', im: 'email', ph: 'you@example.com', span: true })}
        ${field('notes', 'Anything we should know?', 'textarea', f.notes, { optional: true, span: true, ph: 'Style reference, sensitive skin, first visit…' })}
        <div class="field span-2">
          <label for="bk-code">Promo code <span class="field__opt">(optional)</span></label>
          <div class="promo-row">
            <input id="bk-code" name="code" class="input" value="${esc(f.code)}" placeholder="e.g. ${esc(RB.promo.code)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="bk-code-msg">
            <button type="button" class="btn btn--ghost" data-apply-code>Apply</button>
          </div>
          <div class="${d.amount ? 'field__ok' : 'field__err'}" id="bk-code-msg" role="status">${esc(state.codeMsg)}</div>
        </div>
        <div class="span-2">
          <label class="check"><input type="checkbox" name="agree" ${f.agree ? 'checked' : ''} aria-describedby="bk-agree-err"><span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a>, including the 12-hour <a href="terms.html#cancellations" target="_blank" rel="noopener">cancellation policy</a>.</span></label>
          <div class="field__err" id="bk-agree-err">${esc(state.errors.agree || '')}</div>
        </div>
        <div class="span-2 nav-row" style="margin-top:4px">
          <button type="submit" class="btn btn--lime btn--lg">Confirm booking <span aria-hidden="true">→</span></button>
          <button type="button" class="btn btn--ghost btn--lg" data-back>Back</button>
        </div>
      </form>`;
  }

  function summaryHtml() {
    const s = svc(), d = discount();
    const barber = state.barber === 'any' ? 'Any barber' : barberById(state.barber).name;
    const row = (k, v, cls = '') => `<div><dt>${k}</dt><dd class="${v ? cls : 'is-empty'}">${v ? esc(v) : 'Not chosen'}</dd></div>`;
    return `
      <div class="summary">
        <div class="summary__head"><h2>Your appointment</h2><span class="sticker sticker--lime" style="padding:6px 10px;font-size:12px">Pay in shop</span></div>
        <dl>
          ${row('Service', s ? s.name : '')}
          ${row('Duration', s ? s.min + ' min' : '')}
          ${row('Barber', s ? barber : '')}
          ${row('Date', state.date ? T.short(state.date) : '')}
          ${row('Time', s && state.time != null ? T.fmt(state.time) + ' – ' + T.fmt(state.time + s.min) : '')}
          ${d.amount ? row('Discount', '−' + money(d.amount) + ' (' + state.appliedCode + ')', 'is-discount') : ''}
        </dl>
        <div class="summary__total"><span>Total</span><strong>${s ? money(s.price - d.amount) : '$0'}</strong></div>
        ${summaryNav()}
        <div class="summary__foot">${esc(RB.shop.address)} · <a href="${RB.shop.phoneHref}">${esc(RB.shop.phone)}</a><br>Free changes up to 12 hours before.</div>
      </div>`;
  }

  // Primary action sits right under the total so nobody has to scroll to continue.
  function canNext() { return state.step === 1 ? !!state.svc : state.step === 2 ? true : state.step === 3 ? !!(state.date && state.time != null) : true; }
  function summaryNav() {
    const label = ['Continue', 'Continue', 'Continue to details', 'Confirm booking'][state.step - 1];
    return `<div class="summary__nav">
      <button type="button" class="btn btn--lime btn--lg" data-sum-next ${canNext() ? '' : 'disabled'}>${label} <span aria-hidden="true">→</span></button>
      ${state.step > 1 ? '<button type="button" class="btn btn--ghost" data-back>Back</button>' : ''}
    </div>`;
  }

  function progressHtml() {
    return `<ol class="progress" aria-label="Booking steps">${STEPS.map((l, i) => {
      const n = i + 1, st = n === state.step ? 'current' : n < state.step ? 'done' : 'todo';
      return `<li><button type="button" data-goto="${n}" data-state="${st}" ${canReach(n) ? '' : 'disabled'} ${st === 'current' ? 'aria-current="step"' : ''}><span><b>0${n}</b>${l}</span></button></li>`;
    }).join('')}</ol>`;
  }

  function navHtml() {
    if (state.step === 4) return '';
    const ok = state.step === 1 ? !!state.svc : state.step === 2 ? true : !!(state.date && state.time != null);
    const label = state.step === 3 ? 'Continue to details' : 'Continue';
    return `<div class="nav-row">
      <button type="button" class="btn btn--lime btn--lg" data-next ${ok ? '' : 'disabled'}>${label} <span aria-hidden="true">→</span></button>
      ${state.step > 1 ? '<button type="button" class="btn btn--ghost btn--lg" data-back>Back</button>' : ''}
    </div>`;
  }

  /* ---------- Confirmation ---------- */
  function viewConfirm() {
    const b = state.conf, s = svcById(b.svc), br = barberById(b.barber);
    const ev = RB.calendar.event(b), apple = RB.calendar.appleUrl(b);
    return `
      <div class="confirm">
        <div class="confirm__main">
          <div class="confirm__badge">${ic.check}</div>
          <h2 class="panel-title" tabindex="-1" style="font-size:clamp(34px,4.4vw,56px)">See you soon, ${esc(b.name.split(' ')[0])}</h2>
          <p class="confirm__lead">Your <strong>${esc(s.name)}</strong> with <strong>${esc(br.name)}</strong> is booked for <strong>${esc(T.long(b.date))} at ${T.fmt(b.start)}</strong>. Show reference <strong>${esc(b.ref)}</strong> at reception.</p>
          <div class="cal-box">
            <h2>Add it to your calendar</h2>
            <div class="cal-btns">
              <a class="cal-btn cal-btn--primary" href="${esc(RB.calendar.google(ev))}" target="_blank" rel="noopener noreferrer"><span class="cal-btn__ic">${ic.google}</span><span>Google Calendar<small>Opens in a new tab</small></span></a>
              ${apple
                ? `<a class="cal-btn" href="${esc(apple)}"><span class="cal-btn__ic">${ic.apple}</span><span>Apple Calendar<small>iPhone, iPad &amp; Mac</small></span></a>`
                : `<button type="button" class="cal-btn" data-ics="${esc(b.ref)}"><span class="cal-btn__ic">${ic.apple}</span><span>Apple Calendar<small>iPhone, iPad &amp; Mac (.ics)</small></span></button>`}
              <a class="cal-btn" href="${esc(RB.calendar.outlook(ev))}" target="_blank" rel="noopener noreferrer"><span class="cal-btn__ic">${ic.outlook}</span><span>Outlook.com<small>Opens in a new tab</small></span></a>
              <button type="button" class="cal-btn" data-ics="${esc(b.ref)}"><span class="cal-btn__ic">${ic.download}</span><span>Download .ics<small>Any other calendar app</small></span></button>
            </div>
            <p class="cal-box__note">The event runs ${T.fmt(b.start)} – ${T.fmt(b.end)} ${esc(RB.shop.tzLabel)} at ${esc(RB.shop.street)}, ${esc(RB.shop.area)}, with a reminder 1 hour before. Your calendar shows it in your own time zone automatically.</p>
          </div>
          <div class="nav-row" style="margin-top:0">
            <button type="button" class="btn btn--ghost" data-restart>Book another appointment</button>
            <a class="btn btn--ghost" href="index.html">Back to home</a>
          </div>
        </div>
        <aside class="ticket" aria-label="Booking summary">
          <div class="ticket__top"><div><small>Booking ref</small><div class="ticket__ref">${esc(b.ref)}</div></div><span class="sticker" style="background:var(--ink);color:var(--lime)">Confirmed</span></div>
          <dl>
            <div><dt>Service</dt><dd>${esc(s.name)}</dd></div>
            <div><dt>Barber</dt><dd>${esc(br.name)}</dd></div>
            <div><dt>Date</dt><dd>${esc(T.fmtDate(b.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))}</dd></div>
            <div><dt>Time</dt><dd>${T.fmt(b.start)} – ${T.fmt(b.end)}</dd></div>
            <div><dt>Name</dt><dd>${esc(b.name)}</dd></div>
            <div><dt>Mobile</dt><dd>${esc(b.phone)}</dd></div>
            ${b.discount ? `<div><dt>Discount</dt><dd>−${esc(b.discountLabel)}</dd></div>` : ''}
          </dl>
          <div class="ticket__total"><span>Pay in shop</span><strong>${esc(b.totalLabel)}</strong></div>
        </aside>
      </div>`;
  }

  /* ---------- Render ---------- */
  const heroTitle = $('[data-book-title]'), heroLead = $('[data-book-lead]'), heroEyebrow = $('[data-book-eyebrow]');
  const ms = $('[data-mobile-sum]');
  function render(focus) {
    const strip = $('.day-strip', app), keep = strip ? strip.scrollLeft : 0;
    if (state.step === 5) {
      heroEyebrow.textContent = 'Booking confirmed';
      heroTitle.innerHTML = 'You’re <em>booked</em>';
      heroLead.textContent = 'We’ve saved your appointment. Add it to your calendar so you don’t forget.';
      app.innerHTML = viewConfirm();
      ms.hidden = true; document.body.classList.remove('has-mobile-sum');
    } else {
      heroEyebrow.textContent = 'Online booking';
      heroTitle.innerHTML = 'Book your <em>chair</em>';
      heroLead.textContent = 'Four quick steps. Live availability for the next three weeks, and a calendar invite at the end.';
      const view = [viewService, viewBarber, viewTime, viewDetails][state.step - 1]();
      app.innerHTML = `
        <div class="booking">
          <div class="booking__main">${progressHtml()}<div data-panel>${view}</div>${navHtml()}</div>
          <div class="booking__aside" data-summary>${summaryHtml()}</div>
        </div>`;
      renderMobileSum();
      document.body.classList.add('has-mobile-sum');
    }
    const ns = $('.day-strip', app);
    if (ns) {
      ns.scrollLeft = keep;
      if (focus) { const sel = $('.day[aria-pressed="true"]', ns); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    }
    if (focus) {
      const h = $('.panel-title', app);
      const top = app.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      if (h) h.focus({ preventScroll: true });
    }
    renderMine();
  }
  function renderSummary() { const el = $('[data-summary]', app); if (el) el.innerHTML = summaryHtml(); renderMobileSum(); }
  function renderMobileSum() {
    const s = svc();
    ms.hidden = state.step === 5;
    $('[data-ms-title]', ms).textContent = s ? s.name + ' · ' + money(s.price - discount().amount) : 'Choose a service';
    $('[data-ms-sub]', ms).textContent = state.date && state.time != null ? T.short(state.date) + ' · ' + T.fmt(state.time) : 'Step ' + state.step + ' of 4 · ' + STEPS[state.step - 1];
    const btn = $('[data-ms-next]', ms);
    const ok = state.step === 1 ? !!state.svc : state.step === 2 ? true : state.step === 3 ? !!(state.date && state.time != null) : true;
    btn.textContent = state.step === 4 ? 'Confirm →' : 'Continue →';
    btn.disabled = !ok;
  }

  function go(n) {
    if (!canReach(n)) return;
    state.step = n;
    if (n === 3) {
      revalidateTime();
      if (!state.date || !dayInfo(state.date).ok) { state.date = firstOpenDay(); state.time = null; }
    }
    render(true);
  }

  /* ---------- Confirm ---------- */
  function readForm() {
    const f = $('[data-form]', app);
    if (!f) return;
    state.form.name = f.name.value; state.form.phone = f.phone.value; state.form.email = f.email.value;
    state.form.notes = f.notes.value; state.form.code = f.code.value; state.form.agree = f.agree.checked;
  }
  function makeRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = 'RB-';
    const rnd = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(5)) : Array.from({ length: 5 }, () => Math.random() * 1e9);
    for (let i = 0; i < 5; i++) r += chars[rnd[i] % chars.length];
    return r;
  }
  function confirm() {
    readForm();
    const f = state.form, e = {};
    if (f.name.trim().length < 2 || !/[a-z]/i.test(f.name)) e.name = 'Please enter your full name.';
    const digits = f.phone.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15 || /[^\d\s+()-]/.test(f.phone)) e.phone = 'Please enter a valid mobile number, e.g. +263 77 123 4567.';
    if (!EMAIL.test(f.email.trim())) e.email = 'Please enter a valid email address.';
    if (!f.agree) e.agree = 'Please accept the Terms & Conditions to continue.';
    // A typed-but-unapplied code is applied automatically so nobody loses their discount.
    const typed = normCode(f.code);
    if (typed && typed !== state.appliedCode) {
      const d = discountFor(svc(), typed);
      state.appliedCode = typed === RB.promo.code ? typed : ''; state.codeMsg = d.msg;
      if (d.bad) e.code = d.msg;
    } else if (!typed) {
      state.appliedCode = ''; state.codeMsg = '';
    }
    state.errors = e;
    if (Object.keys(e).length) {
      render(false);
      const first = $('[aria-invalid="true"], #bk-code-msg.field__err:not(:empty), input[name="agree"]', app);
      const target = e.name ? '#bk-name' : e.phone ? '#bk-phone' : e.email ? '#bk-email' : e.code ? '#bk-code' : 'input[name="agree"]';
      const el = $(target, app) || first;
      if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    const s = svc();
    const slot = slots().find((x) => x.t === state.time);
    if (!slot || !slot.free.length) {
      state.time = null; state.step = 3; render(true);
      const p = $('[data-panel]', app);
      p.insertAdjacentHTML('afterbegin', '<div class="notice notice--warn" style="margin-bottom:18px" role="alert">Sorry, that time was just taken. Please pick another.</div>');
      return;
    }
    const barberId = state.barber === 'any' ? slot.free[(state.time / 30) % slot.free.length | 0] : state.barber;
    const d = discount();
    const booking = {
      ref: makeRef(), svc: s.id, barber: barberId, date: state.date, start: state.time, end: state.time + s.min,
      name: f.name.trim().replace(/\s+/g, ' '), phone: f.phone.trim(), email: f.email.trim(), notes: f.notes.trim(),
      code: d.amount ? state.appliedCode : '', discount: d.amount, discountLabel: money(d.amount), total: s.price - d.amount, totalLabel: money(s.price - d.amount),
      status: 'confirmed', created: new Date().toISOString()
    };
    const all = S.get('rb_bookings', []); all.push(booking); S.set('rb_bookings', all);
    if (booking.code) { S.set('rb_promo_used', true); document.documentElement.classList.add('promo-used'); }
    S.set('rb_client', { name: booking.name, phone: booking.phone, email: booking.email });
    try { sessionStorage.removeItem('rb_code'); } catch (err) { /* ignore */ }
    state.conf = booking; state.step = 5; state.errors = {};
    render(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
    const h = $('.panel-title', app); if (h) h.focus({ preventScroll: true });
  }

  /* ---------- Your bookings (this device) ---------- */
  const mine = $('[data-my-bookings]');
  function renderMine() {
    const now = T.now();
    const list = S.get('rb_bookings', [])
      .filter((b) => b.date > now.key || (b.date === now.key && b.end > now.minutes))
      .filter((b) => !(state.conf && b.ref === state.conf.ref))
      .sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')));
    if (!list.length) { mine.hidden = true; mine.innerHTML = ''; return; }
    mine.hidden = false;
    mine.innerHTML = `<h2>Your upcoming bookings</h2>${list.map((b) => {
      const s = svcById(b.svc), br = barberById(b.barber), cancelled = b.status === 'cancelled';
      return `<div class="mb-item ${cancelled ? 'is-cancelled' : ''}">
        <div class="mb-item__main"><strong>${esc(s.name)} with ${esc(br.first)}${cancelled ? ' (cancelled)' : ''}</strong><span>${esc(T.long(b.date))} · ${T.fmt(b.start)} · Ref ${esc(b.ref)}</span></div>
        ${cancelled ? '' : `<div class="mb-item__acts">
          <a class="btn btn--ghost btn--sm" href="${esc(RB.calendar.google(RB.calendar.event(b)))}" target="_blank" rel="noopener noreferrer">Google Calendar</a>
          ${RB.calendar.appleUrl(b) ? `<a class="btn btn--ghost btn--sm" href="${esc(RB.calendar.appleUrl(b))}">Apple Calendar</a>` : `<button type="button" class="btn btn--ghost btn--sm" data-ics="${esc(b.ref)}">Apple / .ics</button>`}
          <button type="button" class="btn btn--ghost btn--sm" data-cancel="${esc(b.ref)}">Cancel</button>
        </div>`}
      </div>`;
    }).join('')}<p class="muted" style="font-size:13px;margin-top:12px">Saved on this device only. To change a booking made elsewhere, call ${esc(RB.shop.phone)}.</p>`;
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.pickSvc) {
      state.svc = t.dataset.pickSvc;
      if (state.appliedCode) state.codeMsg = discountFor(svc(), state.appliedCode).msg;
      revalidateTime(); render(false); return;
    }
    if (t.dataset.pickBarber) { state.barber = t.dataset.pickBarber; revalidateTime(); if (state.date && !dayInfo(state.date).ok) { state.date = null; state.time = null; } render(false); return; }
    if (t.dataset.pickDay) { state.date = t.dataset.pickDay; state.time = null; render(false); return; }
    if (t.dataset.pickTime) { state.time = Number(t.dataset.pickTime); render(false); const n = $('[data-next]', app); if (n && window.innerWidth > 1000) n.focus({ preventScroll: true }); return; }
    if (t.dataset.goto) { if (state.step === 4) readForm(); go(Number(t.dataset.goto)); return; }
    if (t.hasAttribute('data-next')) { go(state.step + 1); return; }
    if (t.hasAttribute('data-back')) { if (state.step === 4) readForm(); go(state.step - 1); return; }
    if (t.hasAttribute('data-ms-next') || t.hasAttribute('data-sum-next')) {
      if (state.step === 4) { confirm(); } else go(state.step + 1);
      return;
    }
    if (t.hasAttribute('data-apply-code')) {
      readForm();
      const c = normCode(state.form.code);
      if (!c) { state.appliedCode = ''; state.codeMsg = 'Enter a code first.'; }
      else { state.appliedCode = c === RB.promo.code ? c : ''; state.codeMsg = discountFor(svc(), c).msg; delete state.errors.code; }
      state.form.code = c;
      const inp = $('#bk-code', app); if (inp) inp.value = c;
      const msg = $('#bk-code-msg', app);
      if (msg) { msg.textContent = state.codeMsg; msg.className = discount().amount ? 'field__ok' : 'field__err'; }
      if (discount().amount) { S.set('rb_promo_used', true); document.documentElement.classList.add('promo-used'); }
      renderSummary(); return;
    }
    if (t.dataset.ics) {
      const b = S.get('rb_bookings', []).find((x) => x.ref === t.dataset.ics);
      if (b) { RB.calendar.downloadIcs(RB.calendar.event(b), 'reinats-' + b.ref + '.ics'); RB.toast('Calendar file ready. Open it to add the event'); }
      return;
    }
    if (t.dataset.cancel) {
      if (t.dataset.armed !== '1') { t.dataset.armed = '1'; t.textContent = 'Tap again to cancel'; setTimeout(() => { if (t.isConnected) { t.dataset.armed = ''; t.textContent = 'Cancel'; } }, 4000); return; }
      const all = S.get('rb_bookings', []); const b = all.find((x) => x.ref === t.dataset.cancel);
      if (b) { b.status = 'cancelled'; S.set('rb_bookings', all); RB.toast('Booking ' + b.ref + ' cancelled'); }
      if (state.step < 5) render(false); else renderMine();
      return;
    }
    if (t.hasAttribute('data-restart')) {
      Object.assign(state, { step: 1, svc: null, barber: 'any', date: null, time: null, conf: null, errors: {}, appliedCode: '', codeMsg: '' });
      state.form = Object.assign({}, state.form, { notes: '', code: '', agree: false });
      history.replaceState(null, '', 'book.html');
      render(true); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  app.addEventListener('submit', (e) => { if (e.target.matches('[data-form]')) { e.preventDefault(); confirm(); } });
  app.addEventListener('input', (e) => {
    const n = e.target.name;
    if (n && state.errors[n]) { delete state.errors[n]; e.target.setAttribute('aria-invalid', 'false'); const m = $('#bk-' + n + '-err', app); if (m) m.textContent = ''; }
    if (n === 'agree' && state.errors.agree) { delete state.errors.agree; $('#bk-agree-err', app).textContent = ''; }
  });
  app.addEventListener('change', (e) => { if (e.target.name === 'agree') { state.form.agree = e.target.checked; if (e.target.checked) { delete state.errors.agree; $('#bk-agree-err', app).textContent = ''; } } });

  // Pre-apply a code that arrived via the offer popup or a link.
  if (code === RB.promo.code) { state.appliedCode = code; state.codeMsg = svc() ? discountFor(svc(), code).msg : RB.promo.code + ' will be applied at checkout.'; }
  else if (code) state.codeMsg = 'That code isn’t valid.';
  if (state.step === 3) { state.date = firstOpenDay(); }
  render(false);
  if (params.get('service') || params.get('barber')) setTimeout(() => { const h = $('.panel-title', app); if (h) h.focus({ preventScroll: true }); }, 50);
})();
