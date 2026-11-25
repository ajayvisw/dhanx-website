#!/usr/bin/env node
/**
 * build-calculator-guides.js — generates /calculators and the six tool guides.
 *
 * WHY THESE PAGES LIVE HERE AND THE TOOLS LIVE ON THE APP
 *
 * Google ranks a page, not a site. dhan-x.com/calculators was a 305-word menu —
 * seven topics at 25 words each — so it was not "about" anything and could not
 * win a search for any of them. The explanations, meanwhile, sat on
 * app.dhan-x.com, which meant the domain visitors are meant to land on was the
 * one with nothing to rank.
 *
 * So the guides MOVED here rather than being copied. Two pages carrying the
 * same thousand words compete; Google picks one and often suppresses the other,
 * and it could easily have picked the app. The guide ranks here, the tool runs
 * there, and each links to the other.
 *
 * EVERY FIGURE in the prose was computed by the app's own shipping code —
 * computeRvBScenario() in rent-vs-buy.js, calculate() in re-xirr.js, simulate()
 * in re-vs-equity.js, project() in fi-model.js. If a model changes, re-run the
 * numbers; do not edit them by hand here.
 *
 * URL SHAPE. The hub is calculators/index.html, not calculators.html. A file
 * named calculators.html and a directory named calculators/ would both claim
 * /calculators, and which one wins is up to the host's html_handling. Moving
 * the hub into the directory removes the ambiguity entirely.
 *
 * Links are root-relative (/features, /css/guide.css). The old pages use
 * document-relative links (features.html), which break one level down.
 *
 * Run: node scripts/build-calculator-guides.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'calculators');
const BLOCKS = process.env.BLOCKS_DIR || '/tmp';
const SITE = 'https://dhan-x.com';
const APP = 'https://app.dhan-x.com';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * The six guides. `block` is the explainer written for the app page and
 * verified there; it is reused verbatim so there is one source of wording.
 * `tool` is the calculator this guide hands off to.
 */
const GUIDES = [
  {
    slug: 'rent-vs-buy',
    block: 'rvb-block.html',
    tool: APP + '/rent-vs-buy.html',
    title: 'Rent vs Buy Calculator (India & US) — Free, No Sign-Up',
    h1: 'Rent vs Buy Calculator',
    eyebrow: 'Property',
    lede: 'Should you rent or buy? This counts what the argument usually leaves out — stamp duty, registration, maintenance, and what your down payment would have earned had it stayed invested. Free, for Indian and US property.',
    desc: 'Free rent vs buy calculator for India and the US. Counts stamp duty, registration, maintenance and the opportunity cost of your down payment — not just EMI against rent.',
    card: 'Counts stamp duty, maintenance and the opportunity cost of your down payment.',
  },
  {
    slug: 'financial-independence',
    block: 'fi-block.html',
    tool: APP + '/fi-calculator.html',
    title: 'FIRE Calculator for India & US — Free Financial Independence Calculator',
    h1: 'FIRE & Financial Independence Calculator',
    eyebrow: 'Retirement',
    lede: 'Work out the portfolio value at which work becomes optional, and the year you get there — modelled year by year with inflation, life events and a withdrawal rate you choose, rather than a flat 25× multiple.',
    desc: 'Free FIRE calculator for Indian and US investors. Projects your financial independence number year by year with inflation, life events and your own withdrawal rate.',
    card: 'The portfolio value at which work becomes optional, and the year you get there.',
  },
  {
    slug: 'property-xirr',
    block: 'rex-block.html',
    tool: APP + '/re-xirr.html',
    title: 'Property XIRR Calculator — What Your Real Estate Actually Returned',
    h1: 'Property XIRR Calculator',
    eyebrow: 'Property',
    lede: 'What a property has actually earned, once the down payment, every EMI, maintenance, taxes, rent received and today’s value are treated as dated cash flows. Usually a very different number from the price move.',
    desc: 'Free property XIRR calculator. Computes the real return on real estate from the down payment, EMIs, maintenance, taxes and rent — both unlevered and on your own equity.',
    card: 'The real return on a property you already own — not the headline price move.',
  },
  {
    slug: 'real-estate-vs-equities',
    block: 'rve-block.html',
    tool: APP + '/re-vs-equity.html',
    title: 'Real Estate vs Equities Calculator — The Same Money, Compared',
    h1: 'Real Estate vs Equities Calculator',
    eyebrow: 'Property',
    lede: 'The same money put into property or into an index, matched rupee for rupee: the equity path gets the same down payment and the same monthly outgo as a SIP, so both sides see identical cash leaving your pocket.',
    desc: 'Free calculator comparing real estate against equities with matched cash flows — same down payment, same monthly outgo, loan interest and rental income all counted.',
    card: 'Property or an index, with the cash flows matched rupee for rupee.',
  },
  {
    slug: 'budget-planner',
    block: 'bp-block.html',
    tool: APP + '/budget-planner.html',
    title: 'Budget Planner — Conscious Spending Plan Calculator, Free',
    h1: 'Budget Planner',
    eyebrow: 'Budgeting',
    lede: 'A budget that starts from what you want your money to buy, rather than from a list of categories to cut. Four buckets instead of forty, with guilt-free spending as a target to hit rather than a leak to plug.',
    desc: 'Free budget planner built on the conscious spending framework: fixed costs, investments, savings and guilt-free spending, with a health score against real thresholds.',
    card: 'Four buckets, not forty. Guilt-free spending as a target, not a leak.',
  },
  {
    slug: 'real-estate',
    block: 're-block.html',
    tool: APP + '/real-estate.html',
    title: 'Free Real Estate Calculators — Rent vs Buy, Property XIRR, vs Equities',
    h1: 'Free Real Estate Calculators',
    eyebrow: 'Property',
    lede: '“Is property a good investment” is really three separate questions, and they have different answers. Here is which calculator answers which, and why their thresholds differ.',
    desc: 'Three free property calculators — rent vs buy, real estate versus equities, and property XIRR — and a guide to which question each one answers.',
    card: 'Which of the three property tools answers your question.',
  },
];

function readBlock(file) {
  const p = path.join(BLOCKS, file);
  if (!fs.existsSync(p)) throw new Error('missing content block: ' + p);
  const raw = fs.readFileSync(p, 'utf8');
  const m = raw.match(/<section class="calc-explainer">([\s\S]*?)<\/section>/);
  if (!m) throw new Error('no .calc-explainer section in ' + file);
  let body = m[1];
  // The blocks were written for the app, where a relative href lands on the
  // app's own tool. Here those must point at the app explicitly, and the
  // sibling guides must point at the guides rather than back into the app.
  const toGuide = {
    'rent-vs-buy.html': '/calculators/rent-vs-buy',
    're-xirr.html': '/calculators/property-xirr',
    're-vs-equity.html': '/calculators/real-estate-vs-equities',
    'fi-calculator.html': '/calculators/financial-independence',
    'budget-planner.html': '/calculators/budget-planner',
    'real-estate.html': '/calculators/real-estate',
  };
  body = body.replace(/href="([a-z0-9-]+\.html)"/g, (full, file2) =>
    toGuide[file2] ? 'href="' + toGuide[file2] + '"' : 'href="' + APP + '/' + file2 + '"');
  // Trailing "Free, no sign-in needed" lines were written for a page that IS
  // the tool. Here the CTA says that, so drop the duplicate closing note.
  body = body.replace(/<p class="calc-explainer-cta">[\s\S]*?<\/p>/g, '');
  // The copy was written to sit UNDER the calculator, so it points at it as
  // "the calculator above". On this page the calculator is a link, not
  // something above the text. Only the positional phrase is rewritten —
  // "above 60%", "the example above" and "the assumptions above" are a
  // comparison and a back-reference within this same page, and stay.
  // \s+ rather than a literal space: the source is hand-wrapped, so "the" and
  // "calculator" are routinely separated by a newline and indentation.
  body = body.replace(/\bthe\s+calculator\s+above\b/g, 'the calculator')
             .replace(/\bthe\s+tool\s+above\b/g, 'the calculator')
             .replace(/\bcalculator\s+above\s+runs\b/g, 'calculator runs')
             .replace(/\btool\s+above\s+runs\b/g, 'calculator runs');
  return body.trim();
}

function faqFromBlock(body) {
  const qa = [...body.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<div><p>([\s\S]*?)<\/p>/g)];
  const plain = (x) => x.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    .replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return qa.map(([, q, a]) => ({
    '@type': 'Question', name: plain(q),
    acceptedAnswer: { '@type': 'Answer', text: plain(a) },
  }));
}

const NAV = (active) => `<nav>
  <a href="/" class="nav-logo">
    <img src="/images/dhanx-logo-nav.png" alt="Dhan-X">
  </a>
  <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav-links">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-links" id="nav-links">
    <a class="nav-link${active === 'calculators' ? ' active' : ''}" href="/calculators/">Free calculators</a>
    <a class="nav-link" href="/#pricing">Pricing</a>
    <a class="nav-link" href="/blog">Blogs &amp; Media</a>
    <a class="nav-link" href="/buffett-munger-quotes">Inspiring quotes</a>
    <a class="nav-link" href="/about">About</a>
    <a class="nav-cta" href="/early-access">Get early access</a>
  </div>
</nav>`;

const FOOTER = `<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <img src="/images/dhanx-logo-transparent.png" alt="Dhan-X">
      <p>Your personal finance coach — for every account, every market, every decision.</p>
      <p class="footer-tagline">Your Wealth Deserves the X Factor</p>
    </div>
    <div class="footer-col">
      <h4>Product</h4>
      <a href="/calculators/">Free calculators</a>
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/early-access">Early access</a>
    </div>
    <div class="footer-col">
      <h4>Calculators</h4>
${GUIDES.map((g) => `      <a href="/calculators/${g.slug}">${esc(g.h1)}</a>`).join('\n')}
    </div>
    <div class="footer-col">
      <h4>Company</h4>
      <a href="/about">About</a>
      <a href="/buffett-munger-quotes">Buffett &amp; Munger quotes</a>
      <a href="/blog">Blogs &amp; Media</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&#169; 2026 Dhan-X. All rights reserved.</p>
    <p>dhan-x.com</p>
  </div>
</footer>`;

function head(title, desc, canonical, jsonld) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="canonical" href="${canonical}"/>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Dhan-X">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${APP}/assets/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${APP}/assets/og-image.jpg">
<link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/guide.css">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
</head>
<body>
${NAV('calculators')}`;
}

function related(slug) {
  const others = GUIDES.filter((g) => g.slug !== slug).slice(0, 3);
  return `<section class="guide-related">
  <h2>Other free calculators</h2>
  <div class="guide-related-grid">
${others.map((g) => `    <a class="guide-related-card" href="/calculators/${g.slug}"><strong>${esc(g.h1)}</strong><span>${esc(g.card)}</span></a>`).join('\n')}
  </div>
</section>`;
}

function buildGuide(g) {
  const canonical = `${SITE}/calculators/${g.slug}`;
  const body = readBlock(g.block);
  const faq = faqFromBlock(body);
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': canonical + '#article',
        headline: g.h1,
        description: g.desc,
        url: canonical,
        author: { '@type': 'Organization', name: 'Dhan-X', url: SITE },
        publisher: { '@type': 'Organization', name: 'Dhan-X', url: SITE },
        mainEntityOfPage: canonical,
      },
      {
        '@type': 'WebApplication',
        name: g.h1,
        url: g.tool,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any (web browser)',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      { '@type': 'FAQPage', mainEntity: faq },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Free calculators', item: SITE + '/calculators/' },
          { '@type': 'ListItem', position: 2, name: g.h1, item: canonical },
        ],
      },
    ],
  };

  const cta = `<div class="guide-cta">
  <p class="guide-cta-text">The calculator itself runs in your browser — nothing you enter is sent to a server.</p>
  <a class="guide-cta-btn" href="${g.tool}">Open the calculator &rarr;</a>
  <p class="guide-cta-note">Free, no account needed. An account only adds saving a scenario and opening it on another device.</p>
</div>`;

  return `${head(g.title, g.desc, canonical, jsonld)}
<main>
<article class="guide">
  <p class="guide-crumb"><a href="/calculators/">Free calculators</a> &rsaquo; ${esc(g.h1)}</p>
  <header class="guide-hero">
    <p class="guide-eyebrow">${esc(g.eyebrow)}</p>
    <h1>${esc(g.h1)}</h1>
    <p class="guide-lede">${esc(g.lede)}</p>
  </header>
  ${cta}
  <div class="guide-body">
${body}
  </div>
  ${cta}
${related(g.slug)}
</article>
</main>
${FOOTER}
<script src="/js/main.js"></script>
</body>
</html>
`;
}

// ── The hub ────────────────────────────────────────────────────────────────
function buildHub() {
  // Trailing slash: Cloudflare serves the directory index at /calculators/
  // and 307s the bare form to it. The canonical must name the URL actually
  // served, not one that redirects.
  const canonical = SITE + '/calculators/';
  const title = 'Free Financial Calculators for Indian & US Investors — Dhan-X';
  const desc = 'Six free financial calculators, no sign-up: FIRE, rent vs buy, property XIRR, real estate vs equities and budgeting. Built for people holding money in both India and the US.';
  const faq = [
    ['Are these calculators really free?', 'Yes. All of them open without an account, run entirely in your browser, and have no usage limit. Nothing you type is sent to a server. A free account only adds the ability to save a scenario and reopen it on another device.'],
    ['Do I need to sign up to use them?', 'No. Open any calculator and start typing. The sign-up prompt only appears if you want to save a result and come back to it from a different device.'],
    ['Is my financial data stored anywhere?', 'No. Every calculation runs in your browser, so the figures you enter never reach us. If you choose to save a scenario while signed out, it is kept in that browser only.'],
    ['Do these work for US property and investments as well as Indian ones?', 'Yes, and that is the point of them. Switch country and the defaults change — mortgage rates near 7% rather than 8.5%, transfer and title costs under 1% rather than 5–8% stamp duty, and US equity return assumptions. Most calculators online assume one country.'],
    ['Which calculator should I use?', 'If you are deciding whether to buy a home, rent vs buy. If you already own property and want to know what it returned, property XIRR. If you are choosing between property and an index, real estate vs equities. If you want to know when work becomes optional, the FIRE calculator. If you want to know what you can afford to invest in the first place, the budget planner.'],
  ];
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonical + '#page',
        url: canonical,
        name: 'Free Financial Calculators',
        description: desc,
      },
      {
        '@type': 'ItemList',
        name: 'Free financial calculators',
        numberOfItems: GUIDES.length + 1,
        itemListElement: GUIDES.map((g, i) => ({
          '@type': 'ListItem', position: i + 1,
          name: g.h1, url: `${SITE}/calculators/${g.slug}`,
        })).concat([{
          '@type': 'ListItem', position: GUIDES.length + 1,
          name: 'XIRR Calculator', url: APP + '/xirr-calculator.html',
        }]),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({
          '@type': 'Question', name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };

  // The XIRR calculator has no guide page of its own — "xirr calculator" is a
  // crowded query where a thin guide would not rank anyway. It is still a free,
  // working tool, so it is carded straight to the app rather than orphaned.
  const cards = GUIDES.map((g) => `    <a class="guide-related-card" href="/calculators/${g.slug}"><strong>${esc(g.h1)}</strong><span>${esc(g.card)}</span></a>`)
    .concat([`    <a class="guide-related-card" href="${APP}/xirr-calculator.html"><strong>XIRR Calculator</strong><span>Your real return when money went in on different dates &mdash; every SIP, top-up and redemption.</span></a>`])
    .join('\n');

  const body = `
  <h2>Which calculator do you need?</h2>
  <p>Pick by the question you are actually asking, not by the name of the tool. The wrong one will give you a confident number that does not answer your situation.</p>
  <ul class="calc-takeaway">
    <li><strong>I am deciding whether to buy a home.</strong> <a href="/calculators/rent-vs-buy">Rent vs Buy</a> — you need somewhere to live and are choosing between paying a landlord and paying a bank.</li>
    <li><strong>I already own a property.</strong> <a href="/calculators/property-xirr">Property XIRR</a> — what it has actually returned, once every EMI, cost and rent is counted at its own date.</li>
    <li><strong>I am choosing where to invest.</strong> <a href="/calculators/real-estate-vs-equities">Real Estate vs Equities</a> — the same money in property or in an index, with the cash flows matched.</li>
    <li><strong>I want to know when I can stop working.</strong> <a href="/calculators/financial-independence">FIRE Calculator</a> — your number, and the year you reach it.</li>
    <li><strong>I want to know what I can afford to invest.</strong> <a href="/calculators/budget-planner">Budget Planner</a> — four buckets instead of forty.</li>
    <li><strong>I want my real return on a fund or SIP.</strong> <a href="${APP}/xirr-calculator.html">XIRR Calculator</a> — the right measure when money went in on different dates.</li>
  </ul>

  <h2>What these actually tell you</h2>
  <p>Each guide carries a worked example computed by the calculator itself, not written by hand. A few of the answers are worth knowing before you open anything:</p>
  <ul class="calc-takeaway">
    <li>Buying a home beats renting and investing the difference above roughly <strong>9.2% annual appreciation</strong>, or below a <strong>17.9× price-to-rent ratio</strong>. A ₹2 crore flat renting for ₹55,000 a month sits at 30×.</li>
    <li>The <strong>6% stamp duty</strong> on that flat — ₹12 lakh — costs about <strong>₹0.97 crore</strong> of twenty-year wealth, because that money never compounds. One line on the sale deed is roughly a fifth of the whole result.</li>
    <li>Leverage can <strong>cut</strong> your property return rather than raise it. A flat bought at ₹80 lakh in 2015 and worth ₹1.5 crore today returned 7.1% unlevered but only <strong>4.9% on your own equity</strong>, because the loan cost 9% while the asset grew at 6.5%.</li>
    <li>An eleven percent portfolio against six percent inflation is not a five percent real return. It is <strong>4.72%</strong> — you divide rather than subtract, and over twenty years the difference is large.</li>
  </ul>

  <h2>Built for money in two countries</h2>
  <p>Nearly every calculator online assumes you live in one country, earn in one currency and invest in one market. If you hold money in both India and the US, none of them fit: they have no concept of stamp duty, no NSE or BSE, no notion that your rupee savings and your dollar portfolio belong to the same plan.</p>
  <p>These do. Switch the country and the assumptions move with it — <strong>8.5% home loans and 5–8% stamp duty</strong> in India against <strong>7% mortgages and sub-1% transfer costs</strong> in the US, Indian metro rent inflation against US figures, Nifty-style return assumptions against broad US equities. The structure of each question is the same; only the inputs change.</p>

  <h2>No account, no catch</h2>
  <p>Every calculator here opens without signing in and runs entirely in your browser, which means the figures you type never reach a server. There is no usage limit, no email wall and no trial.</p>
  <p>A free Dhan-X account adds two things these pages deliberately do not need: saving a scenario so you can reopen it from another device, and the tools that read live market data or your own holdings. If all you want is the answer, you never have to create one.</p>

  <h2>Common questions</h2>
  <div class="calc-faq">
${faq.map(([q, a]) => `    <details>
      <summary>${esc(q)}</summary>
      <div><p>${esc(a)}</p></div>
    </details>`).join('\n')}
  </div>`;

  return `${head(title, desc, canonical, jsonld)}
<main>
<article class="guide">
  <header class="guide-hero">
    <p class="guide-eyebrow">Free &middot; no sign-up</p>
    <h1>Free Financial Calculators for Indian &amp; US Investors</h1>
    <p class="guide-lede">Six calculators for people whose money does not sit in one country. Each opens without an account, runs in your browser, and is explained in full — including the assumptions that decide the answer.</p>
  </header>
  <div class="guide-related-grid" style="margin-bottom:42px">
${cards}
  </div>
  <div class="guide-body">
${body}
  </div>
</article>
</main>
${FOOTER}
<script src="/js/main.js"></script>
</body>
</html>
`;
}

// ── Write ──────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
fs.writeFileSync(path.join(OUT, 'index.html'), buildHub());
console.log('  calculators/index.html');
n++;
for (const g of GUIDES) {
  fs.writeFileSync(path.join(OUT, g.slug + '.html'), buildGuide(g));
  console.log('  calculators/' + g.slug + '.html');
  n++;
}
console.log('\nwrote ' + n + ' pages');
