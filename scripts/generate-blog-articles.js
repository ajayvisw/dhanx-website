#!/usr/bin/env node
/* Generates static, crawlable article pages from the public API to ROI archive. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const raw = fs.readFileSync(path.join(root, 'js/blog.js'), 'utf8');
const match = raw.match(/const P=(\[[\s\S]*?\])\.map/);
if (!match) throw new Error('Could not read the blog catalogue');
const rows = Function(`return ${match[1]}`)();
// These are editorial rewrites of the channel's own video transcripts.  They
// intentionally retain each episode's argument and examples rather than
// producing category-level filler.  The original video remains linked below.
const rewrites = {
  PnR8TGbqSOU: [
    ['Five fault lines worth watching', 'This short explains why the presenter is holding more cash without making a doomsday call. The concern is not one headline; it is the way several fragile parts of the market can reinforce one another. AI capital expenditure is the first fault line: the spending is enormous, while the route from infrastructure spend to durable returns is still being tested.'],
    ['Cash is a risk-management decision', 'The point is not that an investor can time a crash. It is that a portfolio should leave room for uncertainty when valuations, leverage and the pace of investment all look demanding. Holding cash can be a conscious choice to preserve flexibility, rather than a prediction that every asset must fall.']
  ],
  Kl3dXOgEq0o: [
    ['Start by challenging the requirement', 'The video draws on Elon Musk’s framework for getting difficult work done. Its first rule is deliberately blunt: make every requirement less dumb. Before optimising a process, ask who requested each step, what decision it supports and whether it would still exist if the work began today.'],
    ['Remove before you accelerate', 'The sequence matters. Eliminating an unnecessary task before automating it prevents a team from becoming faster at work that never mattered. Investors can apply the same discipline to research: identify the few assumptions that change an investment result, then spend time testing those instead of expanding a checklist for its own sake.']
  ],
  XUNGJFjG1E8: [
    ['A US portfolio can create an estate-tax exposure', 'For Indian investors who own US securities, investment performance is only one part of the outcome. The episode highlights a commonly missed issue: on death, a non-US person’s direct US-situs holdings can face US estate-tax rules, with rates that can reach 40% in some circumstances.'],
    ['Structure should be reviewed early', 'The lesson is not to avoid global investing. It is to consider ownership structure, tax residence, domicile and succession planning before a portfolio becomes large. The right route depends on the investor’s family, residency and assets, so this is a prompt to obtain cross-border tax and legal advice rather than a one-size-fits-all solution.']
  ],
  '2i8Vd0MzGrA': [
    ['The 40% number is not a return calculation', 'This video focuses on a risk that may sit outside a standard brokerage statement. A non-US resident who holds certain US securities directly can trigger US estate-tax exposure at death. The top rate often cited in this context is 40%, which is why the issue can be material even for investors whose current income tax filings look straightforward.'],
    ['Estate planning belongs beside allocation', 'A US allocation may still make sense for diversification and access to businesses. But the investor should understand where the asset is legally situated and how it will pass to heirs. Fund domicile, direct ownership and the investor’s personal facts can change the answer. Treat this as an estate-planning question to review with qualified advisers, not a reason to act on a generic internet rule.']
  ],
  '82n0uSaA4us': [
    ['The question behind the AI rally', 'AI-related stocks have heated up since 2022 as hyperscalers, Nvidia, memory suppliers and power infrastructure providers all benefit from the build-out. The video asks a harder question than whether AI is transformative: can the enormous capital expenditure earn adequate returns, and what happens if the investment cycle slows before the revenue base catches up?'],
    ['A useful way to test the narrative', 'The analysis points to the connections between chip demand, data-centre construction, financing and electricity supply. These links can become fault lines when every participant assumes the next layer of demand will arrive on schedule. Investors should separate belief in the technology from confidence in a particular valuation, then watch utilisation, margins, cash generation and the cost of funding rather than relying on a single growth forecast.'],
    ['Why this is not a simple bubble call', 'The video does not argue that AI is useless or that every beneficiary is identical. It argues that the more capital a narrative requires, the more important it becomes to test the economics. A genuine technological shift can coexist with overly optimistic prices.']
  ],
  '9n5Yp_s9LNw': [
    ['Why SpaceX is hard to value', 'SpaceX is not one business. The discussion frames its valuation around a launch operation, Starlink’s satellite internet network and the option value of future projects. At the time of the episode, reported private-market valuations had moved dramatically from roughly $800 billion in late 2025 toward a much higher figure, making the assumptions behind any comparison especially important.'],
    ['Compare drivers, not just headlines', 'A peer comparison should ask which revenues are recurring, how much capital the network needs, how much competitive protection launch capability creates and where regulation or execution could change the result. Starlink may offer a different revenue profile from launch services, while neither maps neatly onto a listed telecom or aerospace company.'],
    ['Use a range, not a false precision', 'Private-company pricing can be informative without being a daily market verdict. The useful conclusion is a range of outcomes tied to subscribers, launch cadence, margins and reinvestment needs. That makes clear what would have to go right for the most ambitious valuation to be justified.']
  ],
  OCaF0VYncBo: [
    ['Software’s sharp repricing', 'The video examines the selloff in software-as-a-service companies, noting declines of roughly 25% to 30% for names such as Microsoft, Adobe and Salesforce, with some businesses falling far more. The market was not only reacting to a weak quarter; it was debating whether AI changes the economics of the software model itself.'],
    ['Fear and valuation can move together', 'When a category has been valued for durable growth, a threat to pricing power or seat-based revenue can quickly change the multiple investors are prepared to pay. That does not mean every software company has the same exposure. Products embedded in a workflow, supported by proprietary data or tied to a system of record may face a different competitive reality from a simple feature.'],
    ['Questions to carry forward', 'The research task is to distinguish disruption from discount. Review retention, usage, gross margins, customer switching costs and the company’s own AI product strategy. A falling share price is not proof of value; nor is a new technology automatically proof that an established business is finished.']
  ],
  Gcim6uIKY9Y: [
    ['Nvidia’s moat is more than the GPU', 'This short argues that Nvidia’s advantage cannot be understood through chip specifications alone. CUDA and the surrounding software ecosystem have had roughly 17 years to build developer familiarity, tools and libraries. That installed knowledge makes it costly for organisations to move workloads, even if competing hardware improves.'],
    ['The investment implication', 'A strong ecosystem can support pricing and customer loyalty, but it is not permanent by decree. Investors should watch whether developers continue to use Nvidia’s stack, whether alternatives become easier to deploy and whether customers find the cost of concentration unacceptable. The end game is a question about the durability of the platform, not merely the next quarter of unit sales.']
  ],
  iycrftQvoPQ: [
    ['A concentrated portfolio, explained', 'The video uses the Nevada Investment Fund as a case study in concentrated ownership. Between 2001 and 2014, its holdings in Costco, Amazon and Berkshire Hathaway reportedly produced annualised returns of about 20.8%, compared with roughly 6.5% for the benchmark cited in the video.'],
    ['What the example does and does not prove', 'The lesson is not that three stocks are always safer or that past concentration should be copied. The case illustrates why an investor may focus on businesses with durable advantages, capable management and a long runway for compounding. Concentration magnifies both insight and error, so the burden of research rises with position size.']
  ],
  'ZHd-g74Cggc': [
    ['Illiquidity deserves a higher bar', 'The video cautions retail investors against treating private funds and listed real-estate investment trusts as automatic portfolio upgrades. Private credit, private equity and property vehicles can offer access to assets that are difficult to buy directly, but that access comes with fees, valuation opacity and limits on when capital can be withdrawn.'],
    ['Match the vehicle to the liability', 'A long lock-up is easier to tolerate when the investor has no near-term need for the money and understands how the fund values its underlying assets. It can be damaging when an investor expects daily liquidity or depends on the allocation during a market stress. Yield alone is not compensation if it comes with a risk the investor cannot carry.'],
    ['Ask the practical questions first', 'Before investing, examine redemption terms, leverage, fees, conflicts, asset quality and how returns are measured. A diversified public-market portfolio may be less exciting, but its transparency and liquidity are valuable features rather than shortcomings.']
  ],
  XyXt__aIrh8: [
    ['A $57 billion quarter needs context', 'The episode reviews Nvidia’s reported $57 billion quarter and asks whether a strong result settles the investment case. Revenue growth in the roughly 60% range is exceptional, but the key question for shareholders is how much of that growth is already reflected in expectations and how long customers will maintain their spending pace.'],
    ['Results and valuation are separate tests', 'A business can execute superbly while its shares still require an ambitious future. The video’s framework is to inspect demand from cloud customers, margins, competition and the link between AI infrastructure spending and end-user economics. That prevents a headline beat from becoming a substitute for valuation work.'],
    ['What to revisit after earnings', 'Track growth relative to the prior period, the quality of cash flow, customer concentration and management’s outlook for supply and demand. The conclusion should be conditional: a great company can be a better or worse investment depending on the price and the assumptions embedded in it.']
  ],
  '98Cc8RkyAt0': [
    ['What Indians should ask before investing in the US', 'This video considers whether US investing is worthwhile for an Indian resident. It starts with the attraction: access to global businesses, a deep market and potential diversification. It then asks whether those advantages survive currency conversion, taxes, remittance costs and the investor’s own objectives.'],
    ['Returns are only one layer', 'The analysis highlights the practical frictions around taking money abroad and bringing it back. Currency can help or hurt a rupee-based investor, while product structure and tax treatment can materially alter the net result. A US holding should therefore be assessed alongside Indian assets, not in isolation.'],
    ['Build a deliberate allocation', 'The useful decision is rarely all-or-nothing. Define why an overseas allocation belongs in the plan, the proportion it should represent and the route used to own it. Personal tax and regulatory details matter, so confirm the implementation with an adviser who understands the investor’s residency and reporting obligations.']
  ],
  XD0MOkFxOXk: [
    ['The overlooked Amazon case', 'The short makes a bullish case for Amazon by looking beyond the retail storefront. AWS, described in the video as a roughly $107 billion revenue business, remains a cloud leader and has an important role in AI infrastructure. Amazon’s custom Trainium chips are part of the argument that it may have more ways to participate in AI demand than the market gives it credit for.'],
    ['A sum-of-the-parts mindset', 'Retail, advertising, subscriptions and cloud services have different economics. Looking at them separately can reveal why a company with low retail margins may still create significant cash flow elsewhere. It can also expose the risks: retail competition, cloud pricing, high capital requirements and the execution needed to turn infrastructure investment into returns.']
  ],
  '9qHLlrdzOeI': [
    ['Lenskart’s IPO through a valuation lens', 'The video approaches the Lenskart IPO as a valuation question rather than a popularity contest. It refers to an approximately ₹70,000 crore valuation and 2025 revenue of roughly ₹6,650 crore, then asks what growth, margins and competitive durability would be needed to support the price.'],
    ['Growth does not remove downside', 'A consumer brand can have a compelling market position while an IPO still carries execution and valuation risk. Investors should examine store economics, online versus offline mix, customer acquisition, repeat purchases, supply chain control and adjusted profitability rather than stopping at revenue growth.'],
    ['Avoid the falling-knife reflex', 'The phrase in the video title is a reminder that a lower price does not automatically create value. Make the investment case in advance, state what would invalidate it, and compare the implied future business with realistic outcomes for the category.']
  ],
  lIAWhbbnI8E: [
    ['Apple’s China story is also a supply-chain story', 'The video draws lessons from Apple’s long relationship with China. It describes the early Foxconn bet in the 2000s and Apple’s roughly $55 billion investment in a manufacturing ecosystem that helped reshape global consumer-electronics production.'],
    ['Scale creates both strength and dependency', 'A dense supplier network can improve speed, cost and product quality. It can also make diversification difficult when geopolitics, regulation or labour conditions change. For investors, China exposure should be assessed through manufacturing capacity, consumer demand, local competition and the time and capital required to build alternatives elsewhere.']
  ],
  Lku6QFtbeuw: [
    ['What VWO owns', 'VWO gives an investor a broad emerging-markets wrapper, with major positions including TSMC, Tencent, Alibaba and Reliance Industries. The video notes a low expense ratio of about 0.08%, but argues that a low fee alone does not answer whether the fund is attractive.'],
    ['Valuation and growth can diverge', 'The comparison in the episode contrasts an S&P 500 valuation around 30 times earnings with VWO around 15 times, while also noting strong earnings growth for the fund’s holdings over the preceding five years. Lower valuation and faster earnings do not guarantee higher returns, especially when currency, country risk and sector composition differ.'],
    ['Use the ETF as an allocation decision', 'Review the holdings, regional exposures, fund structure and role in a wider portfolio. The right question is whether emerging-market exposure improves the investor’s overall diversification and expected return, not whether one headline multiple is cheaper.']
  ],
  biLdwAiOflY: [
    ['TSMC sits at the centre of advanced chips', 'TSMC manufactures chips for companies including Apple, Nvidia, AMD and Qualcomm. The video describes its scale as roughly 60% of global foundry capacity and around 90% of the most advanced nodes. That position explains why the company is central to the AI and smartphone supply chains.'],
    ['A global footprint does not erase concentration risk', 'Taiwan remains fundamental to TSMC, while new capacity in Arizona, Germany and Japan can diversify production over time. Building leading-edge fabs elsewhere is expensive and difficult, so geography, customer dependence and capital intensity remain part of the thesis.'],
    ['Value needs more than strategic importance', 'A company can be indispensable and still require an attractive price. Investors should test the demand outlook, depreciation and capital spending, technology leadership, geopolitical scenarios and free-cash-flow conversion before calling the shares a value opportunity.']
  ],
  E6lZh47lfAU: [
    ['Cheap drones are changing the cost curve of war', 'The video explains a shift from relying only on billion-dollar platforms to combining AI with inexpensive, adaptable drones. It uses Ukraine’s Operation Spiderweb as an illustration of how relatively low-cost drones can threaten assets that cost vastly more to replace.'],
    ['Technology changes doctrine as well as equipment', 'The important development is not just a cheaper aircraft. AI-assisted targeting, distributed production and rapid iteration can change surveillance, logistics and the ability to impose costs on an adversary. Established defence programmes may remain important, but the procurement mix and the skills required to operate it are evolving.'],
    ['The investor lens', 'For investors, distinguish the technology demonstration from the companies that can capture economic value. Regulation, procurement cycles, export controls, counter-drone systems and the ability to scale reliably all shape who benefits.']
  ],
  FGRIJqIFPdM: [
    ['Owner earnings asks what owners can really take out', 'The video introduces Warren Buffett’s owner-earnings concept. Reported earnings can overstate distributable cash when a business needs continual spending simply to maintain its competitive position. Owner earnings attempt to account for the cash required to keep the business operating at its current level.'],
    ['Maintenance and growth capex are different', 'A central distinction is between maintenance capital expenditure and investment that expands future capacity. The split is rarely printed cleanly in financial statements, so an analyst must use judgement, management commentary and historical results. Treating all capex as either a cost or a growth investment can misstate the economics.'],
    ['Use the metric as a research prompt', 'Owner earnings are not a shortcut to a precise valuation. They encourage better questions about depreciation, working capital, reinvestment needs and the durability of cash generation. Compare those answers over a cycle, not just in a strong year.']
  ],
  e46KejFBMwA: [
    ['The AI bubble comparison needs nuance', 'This episode compares the AI boom with the late-1990s technology cycle, while stressing that the analogy is imperfect. Today’s major companies often have real revenue, cash flow and established customers. The concern is whether the scale of AI investment, and the financing behind it, runs ahead of the returns it can produce.'],
    ['Follow the capital structure', 'Oracle is used as an example in the discussion of how debt, cloud infrastructure and AI demand can become connected. When large projects rely on assumptions about future utilisation, investors should look at funding terms, customer commitments and the time required for returns to emerge.'],
    ['A framework for uncertainty', 'Believing that AI will matter does not settle the valuation of every company involved. Separate the technology’s long-term potential from the near-term earnings needed to justify today’s price, and consider how a slower demand ramp would affect balance sheets and multiples.']
  ],
  AzQgrhRnqIA: [
    ['Costco began with a simple operating idea', 'The short traces Costco’s roots to Sol Price’s Price Club in 1976 and the role of Jim Sinegal in building the later company. The core idea was low prices, high volume and a culture that treated customers and employees as long-term partners rather than sources of a one-off margin.'],
    ['The moat is a system', 'Membership economics, limited assortment, inventory turnover, supplier relationships and customer trust reinforce each other. A competitor can copy a product or a promotion more easily than it can copy an operating system developed over decades.'],
    ['A great story still needs valuation discipline', 'The Costco story is a useful case study in business quality. It should also remind investors to examine membership renewal, comparable sales, margins, international expansion and the price paid for future growth.']
  ],
  '6cDoF1x0RFM': [
    ['A P/E ratio is a starting point', 'The video demonstrates a simple valuation exercise using price-to-earnings. If a company trades at roughly 25 to 30 times current earnings, an investor can estimate future earnings per share, choose a future multiple and compare the implied future price with today’s price.'],
    ['The assumptions do the work', 'The calculation is only as useful as its inputs. Growth may slow, margins may change and the market may pay a lower or higher multiple in the future. Writing each assumption down turns a familiar ratio into a scenario that can be tested when new results arrive.'],
    ['Use more than one outcome', 'A reasonable analysis includes conservative, base and optimistic cases. It also checks business quality, debt, cyclicality and cash flow. A low P/E can signal value, but it can also reflect risks that earnings alone do not reveal.']
  ],
  '8YO-adImEgE': [
    ['OpenAI’s web of commercial relationships', 'The video maps the flow of dollars and infrastructure around OpenAI. It describes different ways companies can deploy AI capacity: owning data centres, using a provider such as Oracle Cloud Infrastructure, or relying on other cloud arrangements. The point is to show that AI economics are spread across model providers, chip suppliers, cloud platforms and customers.'],
    ['Revenue visibility is not the same as cash economics', 'Large partnerships can sound straightforward while still involving substantial upfront capital, long contracts and complicated dependencies. Investors should ask who funds the infrastructure, where the demand ultimately comes from and whether the customer relationship produces attractive returns after energy, chips and depreciation.'],
    ['Look through the announcement', 'The analysis encourages readers to trace each announced deal through the ecosystem. A commitment for capacity can benefit several companies, but it can also create circular expectations if each participant relies on another participant’s future spending.']
  ]
};
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function prettyDate(value) { return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value + 'T12:00:00')); }
function article(row) {
  const [id, date, topic, format, title, summary] = row;
  const sections = rewrites[id];
  if (!sections) throw new Error(`Missing transcript rewrite for ${id}`);
  const canonical = `https://www.dhan-x.com/blogs/${id}.html`;
  const body = sections.map(([heading, text]) => `<h2>${esc(heading)}</h2><p>${esc(text)}</p>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Blogs & Media | Dhan-X</title><meta name="description" content="${esc(summary)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)} | Dhan-X"><meta property="og:description" content="${esc(summary)}"><meta property="og:url" content="${canonical}"><meta property="article:published_time" content="${date}T12:00:00Z"><link rel="icon" href="../favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet"><link rel="stylesheet" href="../css/styles.css"><link rel="stylesheet" href="../css/article.css"><script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"${esc(title)}","description":"${esc(summary)}","datePublished":"${date}","dateModified":"${date}","author":{"@type":"Organization","name":"Dhan-X"},"publisher":{"@type":"Organization","name":"Dhan-X"},"mainEntityOfPage":"${canonical}","video":{"@type":"VideoObject","name":"${esc(title)}","contentUrl":"https://www.youtube.com/watch?v=${id}","uploadDate":"${date}"}}</script></head><body><nav><a href="../index.html" class="nav-logo"><img src="../images/dhanx-logo-transparent.png" alt="Dhan-X"></a><div class="nav-links"><a class="nav-link" href="../index.html">Home</a><a class="nav-link active" href="../blog.html">Blogs &amp; Media</a><a class="nav-cta" href="https://app.dhan-x.com">Get Private Beta Access</a></div></nav><main class="article"><a class="article-back" href="../blog.html">← All Blogs &amp; Media</a><p class="article-meta">${esc(topic)} · ${esc(format)} · <time datetime="${date}">${prettyDate(date)}</time></p><h1>${esc(title)}</h1><p class="article-lede">${esc(summary)}</p><img class="article-image" src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt=""><article><p>${esc(summary)}</p>${body}<h2>Watch the original analysis</h2><p><a class="btn-primary" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Watch on YouTube →</a></p></article><p class="article-disclaimer">For educational purposes only. This is not investment, tax or legal advice.</p></main><script src="../js/main.js"></script></body></html>`;
}
const out = path.join(root, 'blogs'); fs.mkdirSync(out, { recursive: true });
rows.forEach(row => fs.writeFileSync(path.join(out, `${row[0]}.html`), article(row)));
const urls = ['https://www.dhan-x.com/', 'https://www.dhan-x.com/blog.html', ...rows.map(r => `https://www.dhan-x.com/blogs/${r[0]}.html`)];
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}</urlset>`);
console.log(`Generated ${rows.length} static articles`);
