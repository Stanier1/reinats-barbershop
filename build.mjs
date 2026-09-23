// Tiny static-site build: stitches shared partials into each page and writes docs/ for GitHub Pages.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const OUT = 'docs';
const SITE_URL = process.env.SITE_URL || 'https://stanier1.github.io/reinats-barbershop/';

const partial = (name) => readFileSync(join(SRC, 'partials', name + '.html'), 'utf8');
const head = partial('head');
const header = partial('header');
const footer = partial('footer');
const modal = partial('modal');

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });
writeFileSync(join(OUT, '.nojekyll'), '');

const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
for (const file of pages) {
  let html = readFileSync(join(SRC, 'pages', file), 'utf8');
  const m = html.match(/<!--meta\s+([\s\S]*?)-->/);
  if (!m) throw new Error('Missing meta block in ' + file);
  const meta = JSON.parse(m[1]);
  html = html.replace(m[0], '');

  // Mark the current page in the header navigation.
  const nav = header.replace(/data-nav="([a-z]+)"/g, (_, key) =>
    key === meta.key ? `data-nav="${key}" aria-current="page"` : `data-nav="${key}"`);

  const canonical = SITE_URL + (file === 'index.html' ? '' : file);
  const headHtml = head
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{description}}', meta.description)
    .replaceAll('{{canonical}}', canonical)
    .replaceAll('{{og}}', SITE_URL + 'assets/img/og.jpg')
    .replaceAll('{{page}}', meta.key);

  html = html
    .replace('<!--@head-->', headHtml)
    .replace('<!--@header-->', nav)
    .replace('<!--@footer-->', footer)
    .replace('<!--@modal-->', meta.noOffer ? '' : modal);

  writeFileSync(join(OUT, file), html);
  console.log('built', file);
}
