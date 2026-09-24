/* Shop-local time helpers (Harare is a fixed UTC+2). Pure functions, shared by the browser and the calendar API. */
(function (root) {
  const RB = root.RB;
  const pad = (n) => String(n).padStart(2, '0');
  const time = {
    now() {
      const d = new Date(Date.now() + RB.shop.utcOffsetMinutes * 60000);
      const key = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
      return { key, dow: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
    },
    parse(key) { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); },
    addDays(key, n) { const d = time.parse(key); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); },
    dow(key) { return time.parse(key).getUTCDay(); },
    fmtDate(key, opts) { return time.parse(key).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, opts)); },
    long(key) { return time.fmtDate(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
    short(key) { return time.fmtDate(key, { weekday: 'short', day: 'numeric', month: 'short' }); },
    fmt(min) {
      const h = Math.floor(min / 60), m = min % 60;
      return ((h + 11) % 12 + 1) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
    },
    fmtShort(min) {
      const h = Math.floor(min / 60), m = min % 60;
      return ((h + 11) % 12 + 1) + (m ? ':' + pad(m) : '') + (h < 12 ? 'am' : 'pm');
    },
    // Shop-local date + minutes -> real UTC Date.
    toUTC(key, min) { const d = time.parse(key); return new Date(d.getTime() + (min - RB.shop.utcOffsetMinutes) * 60000); }
  };
  RB.time = time;
})(typeof window !== 'undefined' ? window : globalThis);
