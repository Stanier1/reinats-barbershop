/* Calendar export: Google Calendar link, Outlook link and an RFC 5545 .ics file (Apple Calendar, Outlook desktop, etc). */
(function (root) {
  const RB = root.RB;
  const pad = (n) => String(n).padStart(2, '0');
  const utcStamp = (d) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  const localStamp = (key, min) => key.replace(/-/g, '') + 'T' + pad(Math.floor(min / 60)) + pad(min % 60) + '00';
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

  // Lines longer than 75 octets must be folded (RFC 5545 §3.1).
  function fold(line) {
    const bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;
    const out = []; let cur = ''; let len = 0;
    for (const ch of line) {
      const l = new TextEncoder().encode(ch).length;
      if (len + l > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
      cur += ch; len += l;
    }
    out.push(cur);
    return out.join('\r\n ');
  }

  // Build a normalised event from a stored booking.
  function event(b) {
    const svc = RB.services.find((s) => s.id === b.svc);
    const barber = RB.barbers.find((x) => x.id === b.barber);
    const start = RB.time.toUTC(b.date, b.start);
    const end = RB.time.toUTC(b.date, b.end);
    const title = svc.name + ' with ' + barber.first + ' · ' + RB.shop.name;
    const lines = [
      'Booking ref: ' + b.ref,
      'Service: ' + svc.name + ' (' + svc.min + ' min)',
      'Barber: ' + barber.name,
      'When: ' + RB.time.long(b.date) + ', ' + RB.time.fmt(b.start) + ' – ' + RB.time.fmt(b.end) + ' (' + RB.shop.tzLabel + ')',
      'Price: ' + b.totalLabel + (b.discount ? ' (incl. ' + b.discountLabel + ' first-visit discount)' : '') + ', pay in the shop',
    ];
    if (b.name) lines.splice(4, 0, 'Client: ' + b.name);
    if (b.notes) lines.push('Notes: ' + b.notes);
    lines.push('', 'Please arrive 5 minutes early. Need to change or cancel? Call ' + RB.shop.phone + ' at least 12 hours before.', RB.shop.siteUrl + 'book.html');
    return {
      uid: b.ref + '@reinats.studio',
      title, start, end, date: b.date, startMin: b.start, endMin: b.end,
      location: RB.shop.name + ', ' + RB.shop.address,
      details: lines.join('\n'),
      reminder: svc.name + ' at ' + RB.shop.shortName + ' in 1 hour'
    };
  }

  function google(ev) {
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.title,
      dates: utcStamp(ev.start) + '/' + utcStamp(ev.end),
      details: ev.details,
      location: ev.location,
      ctz: RB.shop.tz
    });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }

  function outlook(ev) {
    const p = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: ev.title,
      startdt: ev.start.toISOString(),
      enddt: ev.end.toISOString(),
      location: ev.location,
      body: ev.details
    });
    return 'https://outlook.live.com/calendar/0/action/compose?' + p.toString();
  }

  function ics(ev) {
    const tz = RB.shop.tz;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reinats Barber Studio//Online Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:' + tz, 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0200', 'TZNAME:CAT', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + ev.uid,
      'DTSTAMP:' + utcStamp(new Date()),
      'DTSTART;TZID=' + tz + ':' + localStamp(ev.date, ev.startMin),
      'DTEND;TZID=' + tz + ':' + localStamp(ev.date, ev.endMin),
      'SUMMARY:' + esc(ev.title),
      'LOCATION:' + esc(ev.location),
      'DESCRIPTION:' + esc(ev.details),
      'URL:' + RB.shop.siteUrl + 'book.html',
      'STATUS:CONFIRMED', 'TRANSP:OPAQUE',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT1H', 'DESCRIPTION:' + esc(ev.reminder), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  // Real https .ics URL (no personal details in it): the only way iOS Safari offers "Add to Calendar".
  function appleUrl(b) {
    if (!RB.shop.icsApi) return null;
    const p = new URLSearchParams({ ref: b.ref, svc: b.svc, barber: b.barber, date: b.date, start: String(b.start) });
    if (b.discount) p.set('code', RB.promo.code);
    return RB.shop.siteUrl + 'api/calendar?' + p.toString();
  }

  function downloadIcs(ev, filename) {
    const text = ics(ev);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  RB.calendar = { event, google, outlook, ics, appleUrl, downloadIcs };
})(typeof window !== 'undefined' ? window : globalThis);
