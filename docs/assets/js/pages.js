/* Page-specific rendering from the shared data, so prices and barbers stay identical to the booking flow. */
(function () {
  const RB = window.RB;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const GROUP_IMG = { cuts: ['svc-fade.jpg', 'Fresh skin fade'], beard: ['svc-beard.jpg', 'Beard shaping with scissors'], packages: ['shop-chair.jpg', 'Leather barber chair in the studio'], extras: ['svc-lineup.jpg', 'Razor line-up detail'] };

  const menu = document.querySelector('[data-render="menu"]');
  if (menu) {
    menu.innerHTML = RB.categories.map((c) => {
      const img = GROUP_IMG[c.id];
      const items = RB.services.filter((s) => s.cat === c.id).map((s) => `
        <div class="menu-item">
          <div>
            <h3>${esc(s.name)}${s.popular ? ' <span class="sticker sticker--coral">Popular</span>' : ''}</h3>
            <p>${esc(s.desc)}</p>
          </div>
          <div class="menu-item__side">
            <span class="menu-item__dur">${s.min} min</span>
            <span class="menu-item__price">$${s.price}</span>
            <a class="btn btn--ghost btn--sm" href="book.html?service=${s.id}" aria-label="Book ${esc(s.name)}">Book →</a>
          </div>
        </div>`).join('');
      return `
        <section class="menu-group" data-cat="${c.id}" aria-labelledby="cat-${c.id}">
          <div class="menu-group__head">
            <h2 id="cat-${c.id}">${esc(c.name)}</h2>
            <p>${esc(c.blurb)}</p>
            <div class="menu-group__img"><img src="assets/img/${img[0]}" alt="${esc(img[1])}" width="800" height="1000" loading="lazy"></div>
          </div>
          <div>${items}</div>
        </section>`;
    }).join('');
  }

  // About page crew: one featured barber (photo left, details right) with the rest as compact cards below.
  const barbers = document.querySelector('[data-render="barbers"]');
  if (barbers) {
    const ig = (b) => `<a href="https://www.instagram.com/${esc(b.ig.slice(1))}/" target="_blank" rel="noopener noreferrer" aria-label="${esc(b.first)} on Instagram (opens in a new tab)">${esc(b.ig)}</a>`;
    const nextFree = (b) => {
      if (!RB.avail || !RB.time) return '';
      const n = RB.avail.next(45, b.id, 21);
      if (!n) return '';
      const day = n.offset === 0 ? 'Today' : n.offset === 1 ? 'Tomorrow' : RB.time.short(n.key);
      return `<p class="barber-feature__next"><span aria-hidden="true">●</span> Next free chair: <strong>${esc(day)}, ${esc(RB.time.fmt(n.t))}</strong></p>`;
    };
    const feature = (b) => `
      <article class="barber-feature" aria-labelledby="bf-name">
        <div class="barber-feature__media">
          <img src="assets/img/${b.img}" alt="Portrait of ${esc(b.name)}" width="800" height="1000">
          <span class="sticker sticker--ghost">${b.years} yrs behind the chair</span>
        </div>
        <div class="barber-feature__body">
          <span class="eyebrow">${esc(b.role)}</span>
          <h3 id="bf-name" class="barber-feature__name" tabindex="-1">${esc(b.name)}</h3>
          <div class="barber__role">${ig(b)}</div>
          <p class="barber-feature__bio">${esc(b.bio)}</p>
          <div class="tags">${b.spec.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
          <p class="barber__days">In the studio: ${b.days.map((d) => DAYS[d]).join(', ')}</p>
          ${nextFree(b)}
          <div><a class="btn btn--lime btn--lg" href="book.html?barber=${b.id}">Book with ${esc(b.first)} →</a></div>
        </div>
      </article>`;
    const mini = (b) => `
      <button type="button" class="barber-mini" data-barber="${b.id}" aria-controls="barber-featured">
        <span class="barber-mini__img"><img src="assets/img/${b.img}" alt="" width="800" height="1000" loading="lazy"></span>
        <span class="barber-mini__body"><strong>${esc(b.name)}</strong><span>${esc(b.role)}</span><em>View profile →</em></span>
      </button>`;
    const valid = (id) => RB.barbers.some((b) => b.id === id);
    let current = valid(location.hash.slice(1)) ? location.hash.slice(1) : RB.barbers[0].id;
    function show(id, focus) {
      current = id;
      const b = RB.barbers.find((x) => x.id === id);
      barbers.innerHTML = `
        <div id="barber-featured" aria-live="polite">${feature(b)}</div>
        <p class="barber-more">More barbers</p>
        <div class="barber-minis">${RB.barbers.filter((x) => x.id !== id).map(mini).join('')}</div>`;
      if (focus) {
        const top = barbers.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top, behavior: 'smooth' });
        const h = document.getElementById('bf-name'); if (h) h.focus({ preventScroll: true });
      }
    }
    barbers.addEventListener('click', (e) => {
      const t = e.target.closest('[data-barber]');
      if (!t) return;
      history.replaceState(null, '', '#' + t.dataset.barber);
      show(t.dataset.barber, true);
    });
    window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (valid(id) && id !== current) show(id, true); });
    show(current, false);
    // Arriving from a home-page story link (about.html#kuda): jump straight to that barber.
    if (valid(location.hash.slice(1))) setTimeout(() => show(current, true), 60);
  }
})();
