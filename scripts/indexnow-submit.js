#!/usr/bin/env node
/**
 * indexnow-submit.js — tell IndexNow which URLs changed.
 *
 * WHY THIS EXISTS
 *
 * Publishing a page notifies nobody. A sitemap is a hint a crawler may read
 * whenever it next visits, not a notification, and Google retired its sitemap
 * ping endpoint in 2023 while Bing retired its own in favour of this protocol.
 * Without IndexNow, a new page waits to be discovered.
 *
 * IndexNow needs no account and no OAuth: a key file served at the site root
 * proves you control the domain, and one POST carries up to 10,000 URLs.
 * Submitting to any participating endpoint shares it with the rest — Bing,
 * Yandex, Seznam, Naver. Google does NOT participate, so Search Console
 * remains the only route there and still has to be set up by hand.
 *
 * Bing matters more than its search share suggests: ChatGPT's browsing and
 * search features are Bing-backed, so being in that index is how an assistant
 * finds you.
 *
 * Usage:
 *   node scripts/indexnow-submit.js                 # every URL in the sitemaps
 *   node scripts/indexnow-submit.js <url> [<url>…]  # just these
 *   DRY_RUN=1 node scripts/indexnow-submit.js       # show, don't send
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = (process.env.INDEXNOW_KEY || '').trim() || readKeyFile();
const HOST = process.env.INDEXNOW_HOST || 'dhan-x.com';
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const DRY = !!process.env.DRY_RUN;

function readKeyFile() {
  const dir = path.join(__dirname, '..', 'public');
  const f = fs.readdirSync(dir).find((x) => /^[0-9a-f]{8,128}\.txt$/.test(x));
  if (!f) throw new Error('no IndexNow key file found in public/');
  return fs.readFileSync(path.join(dir, f), 'utf8').trim();
}

/** Every <loc> in a sitemap file. */
function urlsFromSitemap(file) {
  if (!fs.existsSync(file)) return [];
  const s = fs.readFileSync(file, 'utf8');
  return [...s.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

function post(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 30000,
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: out.slice(0, 300) }));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  let urls = process.argv.slice(2);
  if (!urls.length) {
    urls = urlsFromSitemap(path.join(__dirname, '..', 'public', 'sitemap.xml'));
    // The 51 video posts under /blogs/ average 123-161 words of body text and
    // 27 of them share identical boilerplate. Submitting them would actively
    // push the weakest pages on the domain at an index we are trying to earn
    // standing in. They stay in the sitemap so a crawler that wants them can
    // find them; they are simply not advertised. Drop this filter once they
    // carry real articles. INCLUDE_BLOGS=1 overrides.
    if (!process.env.INCLUDE_BLOGS) {
      const before = urls.length;
      urls = urls.filter((u) => !/\/blogs\//.test(u));
      const skipped = before - urls.length;
      if (skipped) console.log(`(skipping ${skipped} thin /blogs/ pages — set INCLUDE_BLOGS=1 to send them)`);
    }
  }
  // IndexNow rejects the whole batch if any URL is on another host.
  urls = [...new Set(urls)].filter((u) => {
    try { return new URL(u).host === HOST; } catch (_e) { return false; }
  });

  if (!urls.length) { console.log('nothing to submit for ' + HOST); return; }
  console.log(`IndexNow: ${urls.length} URLs for ${HOST}`);
  if (DRY) { urls.slice(0, 10).forEach((u) => console.log('  ' + u)); if (urls.length > 10) console.log(`  … +${urls.length - 10} more`); console.log('(dry run — nothing sent)'); return; }

  // 10,000 per request is the documented ceiling; batch well under it.
  const BATCH = 1000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    const r = await post({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: slice });
    // 200 and 202 both mean accepted; 202 means "key validation pending".
    const ok = r.status === 200 || r.status === 202;
    console.log(`  batch ${i / BATCH + 1}: ${slice.length} URLs -> HTTP ${r.status} ${ok ? 'accepted' : 'REJECTED ' + r.body}`);
    if (!ok) process.exitCode = 1;
  }
})().catch((e) => { console.error('IndexNow failed:', e.message); process.exitCode = 1; });
