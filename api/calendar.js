// GET /api/calendar?ref=RB-XXXXX&svc=skin-fade&barber=farai&date=2026-09-30&start=900[&code=FIRSTFADE]
// Returns a real text/calendar file. iOS Safari only offers "Add to Calendar" for a genuine https .ics
// response, not for blob: or data: URLs, so this is what the Apple Calendar button links to.
// The event is rebuilt from the shared site data, so it matches the in-page confirmation exactly.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const JS = join(process.cwd(), 'src', 'assets', 'js');
let RB;
function load(siteUrl) {
  if (!RB) {
    const ctx = { TextEncoder, URLSearchParams, Date, Math, String, Number, Array, Object, JSON };
    ctx.window = ctx; ctx.globalThis = ctx;
    vm.createContext(ctx);
    for (const f of ['data.js', 'time.js', 'calendar.js']) vm.runInContext(readFileSync(join(JS, f), 'utf8'), ctx, { filename: f });
    RB = ctx.RB;
  }
  RB.shop.siteUrl = siteUrl;
  return RB;
}

const money = (n) => '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n)));

export default function handler(req, res) {
  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  const q = url.searchParams;
  const rb = load('https://' + (req.headers['x-forwarded-host'] || req.headers.host) + '/');
  const fail = (msg) => { res.statusCode = 400; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Invalid calendar request: ' + msg); };

  const ref = q.get('ref') || '', date = q.get('date') || '', start = Number(q.get('start'));
  const svc = rb.services.find((s) => s.id === q.get('svc'));
  const barber = rb.barbers.find((b) => b.id === q.get('barber'));
  if (!/^RB-[A-Z0-9]{5}$/.test(ref)) return fail('ref');
  if (!svc) return fail('service');
  if (!barber) return fail('barber');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(rb.time.parse(date))) return fail('date');
  const hrs = rb.hours[rb.time.dow(date)];
  if (!Number.isInteger(start) || !hrs || start < hrs[0] || start + svc.min > hrs[1] || start % 30) return fail('time');

  const discount = q.get('code') === rb.promo.code && !rb.promo.excludes.includes(svc.cat) ? Math.round(svc.price * rb.promo.percent) / 100 : 0;
  const booking = {
    ref, svc: svc.id, barber: barber.id, date, start, end: start + svc.min,
    discount, discountLabel: money(discount), totalLabel: money(svc.price - discount)
  };
  const body = rb.calendar.ics(rb.calendar.event(booking));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="reinats-${ref}.ics"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}
