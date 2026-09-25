// Bundles the film (three.js + addons + our modules) into one minified file the static site loads.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
await build({
  entryPoints: [here('./main.js')], outfile: here('../src/assets/js/xp.js'),
  bundle: true, minify: true, format: 'iife', target: ['es2020'], legalComments: 'none',
  banner: { js: '/* Reinat’s “The Cut” home film. Includes three.js (MIT License, © 2010-2026 three.js authors, https://threejs.org). */' },
});
console.log('built src/assets/js/xp.js');
