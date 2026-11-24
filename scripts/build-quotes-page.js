#!/usr/bin/env node
/**
 * Builds public/buffett-munger-quotes.html from content/quotes/buffett-munger.json.
 *
 *   node scripts/build-quotes-page.js
 *
 * Every quote is rendered into the HTML itself, not injected by script, so a
 * crawler (or an AI assistant fetching the page) reads the full text and its
 * source. The Warren / Charlie toggle, topic chips and search only show and
 * hide what is already there.
 *
 * The page's whole value is that each line is traceable. Read the _readme in the
 * JSON before adding anything.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content/quotes/buffett-munger.json'), 'utf8'));
const SITE = 'https://dhan-x.com';
const SLUG = 'buffett-munger-quotes';
const PAGE_URL = `${SITE}/${SLUG}`;

const PEOPLE = {
  buffett: { name: 'Warren Buffett', short: 'Warren', wiki: 'https://en.wikipedia.org/wiki/Warren_Buffett' },
  munger: { name: 'Charlie Munger', short: 'Charlie', wiki: 'https://en.wikipedia.org/wiki/Charlie_Munger' }
};

/** Berkshire publishes its letters under four different URL shapes. */
function letterUrl(y) {
  const base = 'https://www.berkshirehathaway.com/letters/';
  if (y <= 1997) return `${base}${y}.html`;
  if (y === 1998) return `${base}1998pdf.pdf`;
  if (y === 1999) return `${base}1999htm.html`;
  if (y <= 2002) return `${base}${y}pdf.pdf`;
  return `${base}${y}ltr.pdf`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** Straight quotes in the data, typographic quotes on the page. */
function typo(s) {
  return String(s)
    .replace(/(^|[\s(—\[])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s(—\[])'/g, '$1‘').replace(/'/g, '’');
}
function slugTopic(t) { return t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

const quotes = data.quotes.map((q, i) => {
  const year = q.letter || Number((String(q.source || '').match(/\b(19|20)\d{2}\b/) || [])[0]) || 2005;
  const url = q.url || letterUrl(q.letter);
  const source = q.source || `Berkshire Hathaway shareholder letter, ${q.letter}`;
  return Object.assign({}, q, { i, year, url, source });
}).sort((a, b) => a.year - b.year || a.i - b.i);

const count = { buffett: 0, munger: 0 };
quotes.forEach((q) => { count[q.who]++; });
const topics = Array.from(new Set(quotes.map((q) => q.topic))).sort();

const cards = quotes.map((q) => {
  const p = PEOPLE[q.who];
  return `      <figure class="q-card" data-who="${q.who}" data-topic="${slugTopic(q.topic)}" id="q${q.i + 1}">
        <blockquote cite="${esc(q.url)}"><p>${esc(typo(q.text))}</p></blockquote>
        <figcaption>
          <span class="q-who q-who-${q.who}">${esc(p.name)}</span>
          <span class="q-year">${q.year}</span>
          <span class="q-topic">${esc(q.topic)}</span>
          <a class="q-src" href="${esc(q.url)}" target="_blank" rel="noopener">${esc(typo(q.source))} &#8599;</a>
        </figcaption>
      </figure>`;
}).join('\n');

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: 'Warren Buffett & Charlie Munger quotes, with sources',
      description: `${quotes.length} quotes from Warren Buffett and Charlie Munger, each checked word for word against the Berkshire Hathaway shareholder letter or Munger talk it comes from, with a link to the source.`,
      isPartOf: { '@id': `${SITE}/#website` },
      publisher: { '@id': `${SITE}/#org` },
      about: Object.values(PEOPLE).map((p) => ({ '@type': 'Person', name: p.name, sameAs: p.wiki })),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: quotes.length,
        itemListElement: quotes.map((q, n) => ({
          '@type': 'ListItem',
          position: n + 1,
          item: {
            '@type': 'Quotation',
            text: q.text,
            creator: { '@type': 'Person', name: PEOPLE[q.who].name },
            citation: q.url,
            dateCreated: String(q.year)
          }
        }))
      }
    },
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Dhan-X', publisher: { '@id': `${SITE}/#org` }, inLanguage: 'en' },
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Dhan-X', url: `${SITE}/`, logo: `${SITE}/images/dhanx-logo-transparent.png` }
  ]
};

const title = 'Warren Buffett & Charlie Munger Quotes — Every One Sourced | Dhan-X';
const desc = `${count.buffett} Warren Buffett and ${count.munger} Charlie Munger quotes on investing, patience and life — each checked word for word against the shareholder letter or talk it comes from, with a link to the original.`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="canonical" href="${PAGE_URL}"/>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="Warren Buffett &amp; Charlie Munger quotes — every one sourced">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${PAGE_URL}">
<meta property="og:image" content="${SITE}/images/dhanx-logo-transparent.png">
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styles.css">
<style>
  /* Page-specific. Colours come from the site tokens in css/styles.css. */
  .q-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px 64px; }
  .q-intro { max-width: 760px; color: var(--text2); font-size: 15px; line-height: 1.7; margin: 0 auto 8px; text-align: center; }
  .q-controls { position: sticky; top: 116px; z-index: 5; background: rgba(10,12,15,0.94); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); padding: 16px 0 14px; margin-bottom: 8px; border-bottom: 1px solid var(--border); }
  .q-toggle { display: flex; justify-content: center; gap: 0; margin: 0 auto 14px; width: max-content; max-width: 100%; border: 1px solid var(--border2); border-radius: 999px; padding: 4px; background: var(--bg2); }
  .q-toggle button { border: 0; background: none; color: var(--text2); font-family: var(--font-head); font-size: 15px; font-weight: 600; padding: 10px 22px; border-radius: 999px; cursor: pointer; transition: all .2s; white-space: nowrap; }
  .q-toggle button .n { font-family: var(--font-body); font-weight: 400; font-size: 12px; opacity: .75; margin-left: 6px; }
  .q-toggle button[aria-pressed="true"] { background: var(--teal); color: var(--bg); }
  .q-toggle button:focus-visible, .q-chip:focus-visible, .q-search:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
  .q-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
  .q-chip { border: 1px solid var(--border2); background: none; color: var(--text2); font-size: 12.5px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-family: var(--font-body); }
  .q-chip[aria-pressed="true"] { border-color: var(--teal); color: var(--teal); background: var(--teal-dim); }
  .q-search { background: var(--bg3); border: 1px solid var(--border2); color: var(--text); border-radius: 999px; padding: 7px 14px; font-size: 13px; width: 220px; font-family: var(--font-body); }
  .q-status { text-align: center; color: var(--text3); font-size: 12.5px; margin-top: 10px; }
  /* One column, oldest first: it reads as a diary. Two CSS columns filled
     top-to-bottom, so the order ran down the left and then jumped back. */
  .q-grid { max-width: 780px; margin: 18px auto 0; }
  .q-card { break-inside: avoid; margin: 0 0 18px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 22px 22px 18px; position: relative; }
  .q-card[hidden] { display: none; }
  .q-card blockquote { margin: 0; }
  .q-card blockquote p { font-family: var(--font-head); font-size: 18px; line-height: 1.5; color: var(--text); }
  .q-card blockquote p::before { content: '\\201C'; color: var(--teal); font-size: 34px; line-height: 0; vertical-align: -12px; margin-right: 4px; }
  .q-card[data-who="munger"] blockquote p::before { color: var(--orange); }
  .q-card figcaption { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; font-size: 12.5px; color: var(--text3); }
  .q-who { font-weight: 600; color: var(--text); }
  .q-who-buffett { color: var(--teal); }
  .q-who-munger { color: var(--orange); }
  .q-year { font-variant-numeric: tabular-nums; }
  .q-topic { border: 1px solid var(--border2); border-radius: 999px; padding: 1px 8px; font-size: 11.5px; }
  .q-src { flex-basis: 100%; color: var(--text2); text-decoration: none; border-bottom: 1px dotted var(--border2); width: max-content; max-width: 100%; }
  .q-src:hover { color: var(--teal); border-color: var(--teal); }
  .q-note { max-width: 860px; margin: 40px auto 0; }
  .q-note h2 { font-family: var(--font-head); font-size: 22px; margin-bottom: 10px; }
  .q-note p, .q-note li { color: var(--text2); font-size: 14.5px; line-height: 1.7; }
  .q-note ul { margin: 8px 0 0 20px; }
  .q-note a { color: var(--teal); }
  @media (max-width: 720px) {
    .q-controls { top: 0; position: relative; }
    .q-toggle { width: 100%; }
    .q-toggle button { flex: 1; padding: 9px 6px; font-size: 13.5px; }
    .q-toggle button .n { display: none; }
    .q-card blockquote p { font-size: 16.5px; }
    .q-search { width: 100%; }
  }
</style>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8YS94SZRWD"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-8YS94SZRWD');
</script>
</head>
<body>

<!-- SHARED NAV -->
<nav>
  <a href="index.html" class="nav-logo">
    <img src="images/dhanx-logo-transparent.png" alt="Dhan-X" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="nav-logo-fallback" style="display:none">
      <div class="nav-logo-icon">X</div>
      <div class="nav-logo-text">Dhan<span>-X</span></div>
    </div>
  </a>
  <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav-links">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-links" id="nav-links">
    <a class="nav-link" href="index.html">Home</a>
    <a class="nav-link" href="/calculators/">Free calculators</a>
    <a class="nav-link" href="features.html">Features</a>
    <a class="nav-link" href="blog.html">Blogs &amp; Media</a>
    <a class="nav-link" href="pricing.html">Pricing</a>
    <a class="nav-link" href="about.html">About</a>
    <a class="nav-link" href="early-access.html">Early access</a>
    <a class="nav-cta" href="early-access.html">Get early access</a>
  </div>
</nav>

<main>
  <div class="section page-intro" style="text-align:center;padding-bottom:28px">
    <div class="badge">Motivation from two great investors</div>
    <h1 class="section-title" style="font-size:38px">Warren Buffett &amp; Charlie Munger,<br><span class="accent">in their own words</span></h1>
    <p class="q-intro">${quotes.length} quotes on investing, patience and how to live, from more than four decades of Berkshire Hathaway shareholder letters and Charlie Munger&#8217;s talks. Every line is checked word for word against the letter or talk it comes from, and links to the original.</p>
  </div>

  <div class="q-wrap">
    <div class="q-controls">
      <div class="q-toggle" role="group" aria-label="Whose quotes to show">
        <button type="button" data-who="buffett" aria-pressed="false">Warren Buffett<span class="n">${count.buffett}</span></button>
        <button type="button" data-who="munger" aria-pressed="false">Charlie Munger<span class="n">${count.munger}</span></button>
        <button type="button" data-who="all" aria-pressed="true">Both<span class="n">${quotes.length}</span></button>
      </div>
      <div class="q-row" role="group" aria-label="Filter by topic">
        <button type="button" class="q-chip" data-topic="" aria-pressed="true">All topics</button>
${topics.map((t) => `        <button type="button" class="q-chip" data-topic="${slugTopic(t)}" aria-pressed="false">${esc(t)}</button>`).join('\n')}
        <input type="search" class="q-search" placeholder="Search the quotes" aria-label="Search the quotes">
      </div>
      <p class="q-status" role="status" aria-live="polite"></p>
    </div>

    <div class="q-grid">
${cards}
    </div>

    <section class="q-note">
      <h2>How these quotes were chosen</h2>
      <p>Investing quotes are badly polluted online, and Buffett and Munger are misquoted more than almost anyone. So this page only includes a line if it can be traced, word for word, to a primary source:</p>
      <ul>
        <li><strong>Warren Buffett</strong> &mdash; the <a href="https://www.berkshirehathaway.com/letters/letters.html" target="_blank" rel="noopener">Berkshire Hathaway shareholder letters</a>, 1977 onward, linked to the year each quote appears.</li>
        <li><strong>Charlie Munger</strong> &mdash; his talks and interviews as published in <a href="https://stripe.press/poor-charlies-almanack" target="_blank" rel="noopener"><em>Poor Charlie&#8217;s Almanack</em></a>, and lines Buffett quotes from him in the letters.</li>
      </ul>
      <p>Square brackets mark a word added for sense. Several widely shared lines are absent &mdash; &#8220;Rule No. 1: never lose money&#8221;, &#8220;the stock market is a device for transferring money from the impatient to the patient&#8221;, &#8220;the big money is not in the buying and selling, but in the waiting&#8221; &mdash; not because they are necessarily false, but because we could not find them in these sources. If you know where one was said or written, we would like to add it.</p>
      <p>Dhan-X is not affiliated with Berkshire Hathaway, Warren Buffett or the Munger family. Quotes are reproduced in short extracts for education and commentary, with credit and a link to the original.</p>
    </section>
  </div>

  <div class="cta-banner">
    <h2>Put the advice to work</h2>
    <p>See your real return, the cost of your fund fees, and when you could stop working &mdash; with free calculators built for investors in India and the US.</p>
    <a class="btn-dark" href="/calculators/">Try the free calculators</a>
  </div>
</main>

<div class="disclaimer">Dhan-X is a financial planning and analysis tool for informational and educational purposes only. It does not constitute investment advice, tax advice, or a solicitation to buy or sell any security. Please consult a qualified financial adviser before making investment decisions.</div>

<!-- SHARED FOOTER -->
<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <img src="images/dhanx-logo-transparent.png" alt="Dhan-X" onerror="this.style.display='none'">
      <p>Your personal finance coach — for every account, every market, every decision.</p>
      <p class="footer-tagline">Your Wealth Deserves the X Factor</p>
    </div>
    <div class="footer-col">
      <h4>Product</h4>
      <a href="/calculators/">Free calculators</a>
      <a href="features.html">Features</a>
      <a href="pricing.html">Pricing</a>
      <a href="early-access.html">Early access</a>
    </div>
    <div class="footer-col">
      <h4>Company</h4>
      <a href="about.html">About</a>
      <a href="blog.html">Blog</a>
      <a href="${SLUG}">Buffett &amp; Munger quotes</a>
    </div>
    <div class="footer-col">
      <h4>Legal</h4>
      <a href="#">Privacy policy</a>
      <a href="#">Terms of use</a>
      <a href="#">Disclaimer</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&#169; 2026 Dhan-X. All rights reserved.</p>
    <p>dhan-x.com</p>
  </div>
</footer>

<script src="js/main.js"></script>
<script>
(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.q-card'));
  var whoBtns = Array.prototype.slice.call(document.querySelectorAll('.q-toggle button'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.q-chip'));
  var search = document.querySelector('.q-search');
  var status = document.querySelector('.q-status');
  var state = { who: 'all', topic: '', q: '' };

  // ?who=buffett|munger and #q12 deep links, so a shared link opens on the right view.
  try {
    var w = new URLSearchParams(location.search).get('who');
    if (w === 'buffett' || w === 'munger') state.who = w;
  } catch (e) {}

  function apply() {
    var shown = 0;
    var needle = state.q.trim().toLowerCase();
    cards.forEach(function (c) {
      var ok = (state.who === 'all' || c.getAttribute('data-who') === state.who) &&
               (!state.topic || c.getAttribute('data-topic') === state.topic) &&
               (!needle || c.textContent.toLowerCase().indexOf(needle) >= 0);
      c.hidden = !ok;
      if (ok) shown++;
    });
    whoBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-who') === state.who)); });
    chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-topic') === state.topic)); });
    var who = state.who === 'buffett' ? 'Warren Buffett' : state.who === 'munger' ? 'Charlie Munger' : 'Buffett and Munger';
    status.textContent = shown ? ('Showing ' + shown + ' quote' + (shown === 1 ? '' : 's') + ' from ' + who + ', oldest first.') : 'No quotes match that search.';
  }
  whoBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.who = b.getAttribute('data-who');
      try {
        var u = new URL(location.href);
        if (state.who === 'all') u.searchParams.delete('who'); else u.searchParams.set('who', state.who);
        history.replaceState(null, '', u);
      } catch (e) {}
      apply();
    });
  });
  chips.forEach(function (b) { b.addEventListener('click', function () { state.topic = b.getAttribute('data-topic'); apply(); }); });
  search.addEventListener('input', function () { state.q = search.value; apply(); });
  apply();
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'public', `${SLUG}.html`), html);
console.log(`wrote public/${SLUG}.html — ${count.buffett} Buffett, ${count.munger} Munger, ${topics.length} topics`);
