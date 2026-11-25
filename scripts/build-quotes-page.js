#!/usr/bin/env node
/**
 * Builds public/buffett-munger-quotes.html from content/quotes/buffett-munger.json.
 *
 *   node scripts/build-quotes-page.js
 *
 * LAYOUT. Read like a short book, not a dump: three "Start here" quotes, then
 * nine themed chapters, each with a one-line introduction. Every quote carries
 * an "In plain words" line — Dhan-X's explanation, labelled as ours — and a
 * single quiet source line. The Warren / Charlie / Both toggle and search hide
 * what does not match; a chapter with nothing left disappears.
 *
 * Every quote is rendered into the HTML itself, not injected by script, so a
 * crawler (or an AI assistant fetching the page) reads the full text and its
 * source.
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
  buffett: { name: 'Warren Buffett', wiki: 'https://en.wikipedia.org/wiki/Warren_Buffett' },
  munger: { name: 'Charlie Munger', wiki: 'https://en.wikipedia.org/wiki/Charlie_Munger' }
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

/** The one short line under a quote. The full citation stays in the link's title. */
function shortSource(q) {
  const u = q.url || '';
  if (q.letter && !q.source) return `Shareholder letter, ${q.letter}`;
  if (/Testimony/i.test(q.source || '')) return 'Testimony to Congress, 1991';
  if (q.letter) return `Quoted in Buffett’s ${q.letter} letter`;
  if (/talk-ten$/.test(u)) return 'USC Law School commencement, 2007';
  if (/talk-one$/.test(u)) return 'Harvard School commencement, 1986';
  if (/talk-eleven$/.test(u)) return '“The Psychology of Human Misjudgment”';
  if (/talk-two$/.test(u)) return /Interview/i.test(q.source || '') ? 'Interview, Poor Charlie’s Almanack' : 'USC Business School talk, 1994';
  return 'Poor Charlie’s Almanack';
}

const quotes = data.quotes.map((q, i) => {
  const year = q.letter || Number((String(q.source || '').match(/\b(19|20)\d{2}\b/) || [])[0]) || 2005;
  const url = q.url || letterUrl(q.letter);
  const source = q.source || `Berkshire Hathaway shareholder letter, ${q.letter}`;
  return Object.assign({}, q, { i, year, url, source, short: shortSource(q) });
});
const count = { buffett: 0, munger: 0 };
quotes.forEach((q) => { count[q.who]++; });
const chapters = data.chapters.map((c, n) => Object.assign({}, c, {
  n: n + 1,
  items: quotes.filter((q) => q.chapter === c.key).sort((a, b) => a.year - b.year || a.i - b.i)
}));
const unplaced = quotes.filter((q) => !data.chapters.some((c) => c.key === q.chapter));
if (unplaced.length) throw new Error('quotes with no chapter: ' + unplaced.map((q) => q.i).join(', '));
const featured = quotes.filter((q) => q.featured);

function quoteHtml(q, big) {
  const p = PEOPLE[q.who];
  return `<figure class="q${big ? ' q-big' : ''}" data-who="${q.who}" id="q${q.i + 1}">
          <blockquote cite="${esc(q.url)}"><p>${esc(typo(q.text))}</p></blockquote>
          <p class="q-plain"><span>In plain words</span>${esc(typo(q.plain))}</p>
          <figcaption><span class="q-name">${esc(p.name)}</span><span class="q-dot" aria-hidden="true">&middot;</span><a href="${esc(q.url)}" title="${esc(typo(q.source))}" target="_blank" rel="noopener">${esc(q.short)}<span aria-hidden="true"> &#8599;</span></a></figcaption>
        </figure>`;
}

const toc = chapters.map((c) =>
  `<a href="#${c.key}" data-ch="${c.key}"><span class="toc-n">${String(c.n).padStart(2, '0')}</span>${esc(c.title)}<span class="toc-c">${c.items.length}</span></a>`).join('\n          ');

const chapterHtml = chapters.map((c) => `
      <section class="ch" id="${c.key}" aria-labelledby="h-${c.key}">
        <header class="ch-head">
          <span class="ch-n">${String(c.n).padStart(2, '0')}</span>
          <h2 id="h-${c.key}">${esc(c.title)}</h2>
          <p>${esc(typo(c.intro))}</p>
        </header>
        <div class="ch-list">
        ${c.items.map((q) => quoteHtml(q, false)).join('\n        ')}
        </div>
      </section>`).join('\n');

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: 'Warren Buffett & Charlie Munger quotes, explained and sourced',
      description: `${quotes.length} quotes from Warren Buffett and Charlie Munger in nine themes, each explained in plain words and checked word for word against the Berkshire Hathaway shareholder letter or Munger talk it comes from.`,
      isPartOf: { '@id': `${SITE}/#website` },
      publisher: { '@id': `${SITE}/#org` },
      about: Object.values(PEOPLE).map((p) => ({ '@type': 'Person', name: p.name, sameAs: p.wiki })),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: quotes.length,
        itemListElement: chapters.flatMap((c) => c.items).map((q, n) => ({
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

const title = 'Warren Buffett & Charlie Munger Quotes, Explained and Sourced | Dhan-X';
const desc = `${quotes.length} Warren Buffett and Charlie Munger quotes on investing, patience and life, in nine themes — each explained in plain words and linked to the shareholder letter or talk it comes from.`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="canonical" href="${PAGE_URL}"/>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="Warren Buffett &amp; Charlie Munger, in their own words">
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
  html { scroll-padding-top: 190px; }
  .qp { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .qp-hero { text-align: center; padding: 56px 0 28px; }
  .qp-hero h1 { font-family: var(--font-head); font-size: 40px; line-height: 1.12; letter-spacing: -0.5px; margin-bottom: 14px; }
  .qp-hero h1 .accent { color: var(--teal); }
  .qp-hero p { color: var(--text2); max-width: 640px; margin: 0 auto; font-size: 16px; line-height: 1.7; }

  /* Slim sticky bar: whose quotes, and search. */
  .qp-bar { position: sticky; top: 116px; z-index: 5; background: rgba(10,12,15,0.95); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
  .qp-bar-in { max-width: 1120px; margin: 0 auto; padding: 12px 24px; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; }
  .qp-toggle { display: inline-flex; border: 1px solid var(--border2); border-radius: 999px; padding: 3px; background: var(--bg2); }
  .qp-toggle button { border: 0; background: none; color: var(--text2); font-family: var(--font-body); font-size: 14px; font-weight: 500; padding: 7px 16px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
  .qp-toggle button[aria-pressed="true"] { background: var(--teal); color: var(--bg); }
  .qp-toggle button[data-who="munger"][aria-pressed="true"] { background: var(--orange); }
  .qp-search { background: var(--bg3); border: 1px solid var(--border2); color: var(--text); border-radius: 999px; padding: 8px 14px; font-size: 13.5px; width: 230px; font-family: var(--font-body); }
  .qp-toggle button:focus-visible, .qp-search:focus-visible, .qp-toc a:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }

  /* Start here */
  .qp-start { padding: 44px 0 8px; }
  .qp-kicker { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--teal); font-weight: 500; margin-bottom: 18px; }
  .qp-start-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

  /* Body: contents on the left, chapters on the right. */
  .qp-body { display: grid; grid-template-columns: 240px 1fr; gap: 56px; padding: 48px 0 24px; align-items: start; }
  .qp-toc { position: sticky; top: 196px; display: flex; flex-direction: column; gap: 2px; }
  .qp-toc .qp-kicker { margin-bottom: 10px; }
  .qp-toc a { display: flex; align-items: baseline; gap: 10px; padding: 7px 10px; border-radius: 8px; color: var(--text2); text-decoration: none; font-size: 14px; line-height: 1.35; }
  .qp-toc a:hover { background: var(--bg3); color: var(--text); }
  .qp-toc a.is-current { background: var(--bg3); color: var(--text); }
  .qp-toc a[hidden] { display: none; }
  .toc-n { font-family: var(--font-head); font-size: 12px; color: var(--text3); min-width: 18px; }
  .toc-c { margin-left: auto; font-size: 12px; color: var(--text3); font-variant-numeric: tabular-nums; }

  .ch { padding-bottom: 56px; }
  .ch[hidden] { display: none; }
  .ch-head { margin-bottom: 26px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
  .ch-n { font-family: var(--font-head); font-size: 13px; color: var(--teal); letter-spacing: 1px; }
  .ch-head h2 { font-family: var(--font-head); font-size: 28px; line-height: 1.2; margin: 4px 0 8px; letter-spacing: -0.3px; }
  .ch-head p { color: var(--text2); font-size: 15.5px; line-height: 1.6; max-width: 620px; }
  .ch-list { display: flex; flex-direction: column; gap: 34px; }

  /* A quote: the words, a plain-English line, one source line. No box. */
  .q { margin: 0; padding-left: 20px; border-left: 3px solid var(--teal); max-width: 720px; }
  .q[data-who="munger"] { border-left-color: var(--orange); }
  .q[hidden] { display: none; }
  .q blockquote { margin: 0; }
  .q blockquote p { font-size: 19px; line-height: 1.6; color: var(--text); font-weight: 400; }
  .q-plain { margin-top: 10px; font-size: 14.5px; line-height: 1.6; color: var(--text2); }
  .q-plain span { display: inline-block; font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text3); margin-right: 8px; }
  .q figcaption { margin-top: 10px; font-size: 13px; color: var(--text3); display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; }
  .q-name { color: var(--teal); font-weight: 500; }
  .q[data-who="munger"] .q-name { color: var(--orange); }
  .q figcaption a { color: var(--text3); text-decoration: none; border-bottom: 1px dotted var(--border2); }
  .q figcaption a:hover { color: var(--text); border-color: var(--text2); }

  /* The three big ones at the top get a card, and a bigger voice. */
  .q-big { background: var(--bg3); border: 1px solid var(--border); border-left-width: 3px; border-radius: var(--radius-lg); padding: 24px 24px 20px; max-width: none; }
  .q-big blockquote p { font-family: var(--font-head); font-size: 21px; line-height: 1.45; }

  .qp-empty { color: var(--text2); padding: 40px 0; text-align: center; }
  .qp-note { max-width: 760px; margin: 8px auto 64px; padding-top: 32px; border-top: 1px solid var(--border); }
  .qp-note h2 { font-family: var(--font-head); font-size: 20px; margin-bottom: 10px; }
  .qp-note p, .qp-note li { color: var(--text2); font-size: 14.5px; line-height: 1.7; }
  .qp-note p + p, .qp-note ul + p { margin-top: 10px; }
  .qp-note ul { margin: 8px 0 0 20px; }
  .qp-note a { color: var(--teal); }

  @media (max-width: 960px) {
    .qp-body { grid-template-columns: 1fr; gap: 8px; }
    /* Contents become a horizontal strip under the bar. */
    .qp-toc { position: static; flex-direction: row; overflow-x: auto; gap: 6px; padding-bottom: 6px; scrollbar-width: none; }
    .qp-toc .qp-kicker { display: none; }
    .qp-toc a { flex: none; border: 1px solid var(--border2); border-radius: 999px; padding: 6px 12px; font-size: 13px; }
    .toc-n { display: none; }
    .qp-start-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 720px) {
    html { scroll-padding-top: 120px; }
    .qp-bar { top: 0; position: relative; }
    .qp-hero { padding-top: 36px; }
    .qp-hero h1 { font-size: 30px; }
    .qp-toggle { width: 100%; }
    .qp-toggle button { flex: 1; padding: 8px 6px; font-size: 13.5px; }
    .qp-search { width: 100%; }
    .q blockquote p { font-size: 17.5px; }
    .q-big blockquote p { font-size: 19px; }
    .ch-head h2 { font-size: 24px; }
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
  <a href="/" class="nav-logo">
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
    <a class="nav-link" href="/calculators/">Free calculators</a>
    <a class="nav-link" href="/#pricing">Pricing</a>
    <a class="nav-link" href="/blog">Blogs &amp; Media</a>
    <a class="nav-link active" href="/buffett-munger-quotes">Inspiring quotes</a>
    <a class="nav-link" href="/about">About</a>
    <a class="nav-cta" href="early-access.html">Get early access</a>
  </div>
</nav>

<main>
  <div class="qp">
    <header class="qp-hero">
      <div class="badge">Motivation from two great investors</div>
      <h1>Warren Buffett &amp; Charlie Munger,<br><span class="accent">in their own words</span></h1>
      <p>${quotes.length} of their best lines on investing and life, grouped into nine short themes and explained in plain words. Every quote is checked against the shareholder letter or talk it comes from &mdash; tap the source to read the original.</p>
    </header>
  </div>

  <div class="qp-bar">
    <div class="qp-bar-in">
      <div class="qp-toggle" role="group" aria-label="Whose quotes to show">
        <button type="button" data-who="all" aria-pressed="true">Both</button>
        <button type="button" data-who="buffett" aria-pressed="false">Warren Buffett</button>
        <button type="button" data-who="munger" aria-pressed="false">Charlie Munger</button>
      </div>
      <input type="search" class="qp-search" placeholder="Search, e.g. patience" aria-label="Search the quotes">
    </div>
  </div>

  <div class="qp">
    <section class="qp-start" aria-labelledby="h-start">
      <div class="qp-kicker" id="h-start">Start here</div>
      <div class="qp-start-grid">
        ${featured.map((q) => quoteHtml(q, true)).join('\n        ')}
      </div>
    </section>

    <div class="qp-body">
      <aside class="qp-toc" role="navigation" aria-label="Themes">
        <div class="qp-kicker">Nine themes</div>
          ${toc}
      </aside>
      <div>
${chapterHtml}
        <p class="qp-empty" hidden>No quotes match that search.</p>
      </div>
    </div>

    <section class="qp-note">
      <h2>How these quotes were chosen</h2>
      <p>Investing quotes are badly polluted online, and Buffett and Munger are misquoted more than almost anyone. So a line appears here only if it can be traced, word for word, to a primary source:</p>
      <ul>
        <li><strong>Warren Buffett</strong> &mdash; the <a href="https://www.berkshirehathaway.com/letters/letters.html" target="_blank" rel="noopener">Berkshire Hathaway shareholder letters</a>, 1977 onward.</li>
        <li><strong>Charlie Munger</strong> &mdash; his talks and interviews as published in <a href="https://stripe.press/poor-charlies-almanack" target="_blank" rel="noopener"><em>Poor Charlie&#8217;s Almanack</em></a>, and lines Buffett quotes from him in the letters.</li>
      </ul>
      <p>The &#8220;In plain words&#8221; lines are Dhan-X&#8217;s own short explanations, not part of the quotes. Square brackets mark a word added for sense.</p>
      <p>Some widely shared lines are absent &mdash; &#8220;Rule No. 1: never lose money&#8221;, &#8220;the stock market is a device for transferring money from the impatient to the patient&#8221;, &#8220;the big money is not in the buying and selling, but in the waiting&#8221; &mdash; not because they are necessarily false, but because we could not find them in these sources. If you know where one was said or written, we would like to add it.</p>
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
      <a href="/${SLUG}">Buffett &amp; Munger quotes</a>
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
  var quotes = Array.prototype.slice.call(document.querySelectorAll('.q'));
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.ch'));
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.qp-toc a'));
  var whoBtns = Array.prototype.slice.call(document.querySelectorAll('.qp-toggle button'));
  var search = document.querySelector('.qp-search');
  var empty = document.querySelector('.qp-empty');
  var state = { who: 'all', q: '' };

  // ?who=buffett|munger opens on that person, so a shared link keeps the view.
  try {
    var w = new URLSearchParams(location.search).get('who');
    if (w === 'buffett' || w === 'munger') state.who = w;
  } catch (e) {}

  function apply() {
    var needle = state.q.trim().toLowerCase();
    quotes.forEach(function (el) {
      el.hidden = !((state.who === 'all' || el.getAttribute('data-who') === state.who) &&
                    (!needle || el.textContent.toLowerCase().indexOf(needle) >= 0));
    });
    var anyShown = false;
    chapters.forEach(function (ch) {
      var n = ch.querySelectorAll('.q:not([hidden])').length;
      ch.hidden = n === 0;
      if (n) anyShown = true;
      var link = document.querySelector('.qp-toc a[data-ch="' + ch.id + '"]');
      if (link) { link.hidden = n === 0; link.querySelector('.toc-c').textContent = n; }
    });
    empty.hidden = anyShown;
    whoBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-who') === state.who)); });
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
  search.addEventListener('input', function () { state.q = search.value; apply(); });

  // Highlight the theme being read.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('data-ch') === en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    chapters.forEach(function (ch) { io.observe(ch); });
  }
  apply();
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'public', `${SLUG}.html`), html);
console.log(`wrote public/${SLUG}.html — ${count.buffett} Buffett, ${count.munger} Munger, ${chapters.length} chapters, ${featured.length} featured`);
