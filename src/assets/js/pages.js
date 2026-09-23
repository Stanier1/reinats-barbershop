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

  const barbers = document.querySelector('[data-render="barbers"]');
  if (barbers) {
    barbers.innerHTML = RB.barbers.map((b) => `
      <article class="barber" id="${b.id}">
        <div class="barber__media">
          <img src="assets/img/${b.img}" alt="Portrait of ${esc(b.name)}" width="800" height="1000" loading="lazy">
          <span class="sticker sticker--ghost">${b.years} yrs behind the chair</span>
        </div>
        <div class="barber__body">
          <h3>${esc(b.name)}</h3>
          <div class="barber__role">${esc(b.role)} · ${esc(b.ig)}</div>
          <p>${esc(b.bio)}</p>
          <div class="tags">${b.spec.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
          <div class="barber__days">In the studio: ${b.days.map((d) => DAYS[d]).join(', ')}</div>
          <a class="btn btn--lime btn--block" href="book.html?barber=${b.id}">Book with ${esc(b.first)} →</a>
        </div>
      </article>`).join('');
    // Anchors like about.html#kuda exist only after render, so scroll to them now.
    if (location.hash) {
      const t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 60);
    }
  }
})();
