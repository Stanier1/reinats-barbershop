/* Shop data shared by every page. Harare runs on CAT (UTC+2) all year, no daylight saving. */
window.RB = {
  shop: {
    name: 'Reinat’s Barber Studio',
    shortName: 'Reinat’s',
    street: '27 Kingsmead Road',
    area: 'Borrowdale, Harare',
    country: 'Zimbabwe',
    address: '27 Kingsmead Road, Borrowdale, Harare, Zimbabwe',
    phone: '+263 77 255 5018',
    phoneHref: 'tel:+263772555018',
    email: 'admin@reinats.studio',
    tz: 'Africa/Harare',
    tzLabel: 'Harare time (CAT)',
    utcOffsetMinutes: 120,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kingsmead+Road+Borrowdale+Harare',
    // Site root, worked out from the current page so it's right on any host.
    siteUrl: typeof location !== 'undefined' && /^https?:$/.test(location.protocol)
      ? location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '')
      : 'https://reinats-barbershop.vercel.app/',
    // Hosts with the /api/calendar endpoint (anything but GitHub Pages) serve real .ics files, which iPhones need.
    icsApi: typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && !/github\.io$/.test(location.hostname)
  },

  // Opening hours per weekday (0 = Sunday). Minutes from midnight, null = closed.
  hours: {
    0: null,
    1: [600, 1080],
    2: [540, 1140],
    3: [540, 1140],
    4: [540, 1140],
    5: [540, 1140],
    6: [480, 1020]
  },

  categories: [
    { id: 'cuts', name: 'Cuts', blurb: 'Every cut starts with a consult and ends with a hot towel, style and a mirror check.' },
    { id: 'beard', name: 'Beard & Shave', blurb: 'Straight-razor work, hot towels, pre-shave oil and a cooling finish.' },
    { id: 'packages', name: 'Packages', blurb: 'Stack services and save. Promo codes don’t apply to packages.' },
    { id: 'extras', name: 'Extras', blurb: 'Add to any appointment, or book on their own.' }
  ],

  services: [
    { id: 'signature', cat: 'cuts', name: 'Signature Cut', min: 45, price: 15, img: 'svc-style.jpg', desc: 'Consultation, clipper and scissor cut, wash, style and hot towel finish.', popular: true },
    { id: 'skin-fade', cat: 'cuts', name: 'Skin Fade', min: 45, price: 18, img: 'svc-fade.jpg', desc: 'Bald to blended, as low or high as you like, finished with a razor line-up.', popular: true },
    { id: 'taper-twist', cat: 'cuts', name: 'Taper & Sponge Twist', min: 50, price: 20, img: 'hero.jpg', desc: 'Clean taper with defined sponge curls on top. Built for textured hair.' },
    { id: 'scissor', cat: 'cuts', name: 'Scissor Cut', min: 60, price: 20, desc: 'All-scissor work for longer, layered or curly styles.' },
    { id: 'buzz', cat: 'cuts', name: 'Buzz Cut', min: 20, price: 10, desc: 'One guard all over with a sharp neckline and edges.' },
    { id: 'kids', cat: 'cuts', name: 'Kids Cut (12 & under)', min: 30, price: 10, img: 'svc-kids.jpg', desc: 'Patient barbers, cartoon on the screen and a lollipop for the brave.' },
    { id: 'beard-trim', cat: 'beard', name: 'Beard Trim & Line', min: 30, price: 10, img: 'svc-beard.jpg', desc: 'Clipper and scissor shaping, razor-sharp cheek and neck lines, beard oil.', popular: true },
    { id: 'hot-towel-shave', cat: 'beard', name: 'Hot Towel Shave', min: 40, price: 15, img: 'svc-shave.jpg', desc: 'Traditional straight-razor shave with three hot towels and a cold finish.', popular: true },
    { id: 'beard-sculpt', cat: 'beard', name: 'Beard Sculpt & Hot Towel', min: 45, price: 18, desc: 'Full reshape for longer beards, with a hot towel and conditioning treatment.' },
    { id: 'full-reinat', cat: 'packages', name: 'The Full Reinat’s', min: 90, price: 35, desc: 'Signature Cut, Hot Towel Shave and a charcoal face mask. The whole ritual.' },
    { id: 'cut-beard', cat: 'packages', name: 'Cut & Beard', min: 75, price: 25, desc: 'Any cut plus Beard Trim & Line. Our most booked combo.' },
    { id: 'father-son', cat: 'packages', name: 'Father & Son', min: 60, price: 22, desc: 'Two cuts side by side: one adult, one kid 12 and under.' },
    { id: 'groom', cat: 'packages', name: 'Groom’s Day', min: 120, price: 60, desc: 'Cut, shave, facial and styling on your wedding morning. Groomsmen welcome.' },
    { id: 'line-up', cat: 'extras', name: 'Line-Up', min: 15, price: 7, img: 'svc-lineup.jpg', desc: 'Edges, hairline and neckline tidy between cuts.' },
    { id: 'hair-art', cat: 'extras', name: 'Hair Art & Designs', min: 20, price: 8, desc: 'Parts, lines and freehand designs. Bring a reference.' },
    { id: 'colour', cat: 'extras', name: 'Colour & Grey Blend', min: 30, price: 15, desc: 'Semi-permanent colour or a natural grey blend. Patch test required.' },
    { id: 'facial', cat: 'extras', name: 'Charcoal Face Mask', min: 25, price: 12, desc: 'Deep-clean peel-off mask and a hot towel to open the pores.' }
  ],

  // days = weekdays the barber works (0 = Sunday).
  barbers: [
    { id: 'tinashe', name: 'Tinashe Moyo', first: 'Tinashe', role: 'Founder · Master Barber', img: 'barber-tinashe.jpg', days: [1, 2, 3, 4, 5, 6], years: 12, spec: ['Skin fades', 'Beard design', 'Content'], ig: '@tinashe.cuts', bio: 'Named the studio after his grandmother Reinat, who cut hair on her veranda in Mbare. Twelve years in, still the first one through the door every morning — and the one behind the camera for most of our reels.' },
    { id: 'kuda', name: 'Kudakwashe Ncube', first: 'Kuda', role: 'Senior Barber', img: 'barber-kuda.jpg', days: [1, 2, 4, 5, 6], years: 8, spec: ['Tapers', 'Hair art', 'Sponge twists'], ig: '@kuda.fades', bio: 'Freehand designs, razor parts and the smoothest tapers in Borrowdale. Brings the playlist and the energy. Off on Wednesdays.' },
    { id: 'rudo', name: 'Rudo Chikomo', first: 'Rudo', role: 'Texture & Kids Specialist', img: 'barber-rudo.jpg', days: [2, 3, 4, 5, 6], years: 7, spec: ['Curly & coily', 'Kids cuts', 'Colour'], ig: '@rudo.texture', bio: 'Leads our monthly texture training. Calm hands, great chat and the go-to for first haircuts. Not in on Mondays.' },
    { id: 'farai', name: 'Farai Dube', first: 'Farai', role: 'Shave & Grooming Specialist', img: 'barber-farai.jpg', days: [1, 3, 4, 5, 6], years: 9, spec: ['Hot towel shaves', 'Beard sculpts', 'Facials'], ig: '@farai.shaves', bio: 'Trained in Johannesburg and obsessed with the straight razor. If you want a beard that looks drawn on, Farai is your guy. Off on Tuesdays.' }
  ],

  promo: { code: 'FirstFade26', percent: 20, excludes: ['packages'] }
};
