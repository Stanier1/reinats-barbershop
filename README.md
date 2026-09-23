# Reinat's Barber Studio

Marketing site and online booking for a fictional barber studio in Borrowdale, Harare.

- `src/` — pages, shared partials (`src/partials`) and assets
- `node build.mjs` — stitches partials into every page and writes the deployable site to `docs/`
- GitHub Pages serves `docs/` from `main`

Booking runs fully client-side: availability, confirmation, Google / Outlook calendar links and an RFC 5545 `.ics` file for Apple Calendar.
