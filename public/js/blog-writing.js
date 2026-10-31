/* Adds an editorial brief to every API to ROI video entry. */
(function () {
  'use strict';
  const context = {
    'AI & markets': 'The investing task is to separate a durable technology trend from the price being paid for it. Capital spending, financing, margins and the path to cash flow deserve as much attention as the headline opportunity.',
    'Company research': 'A strong company thesis begins with the economics: how the business makes money, why customers stay, what could weaken its advantage, and how much future success is already reflected in the valuation.',
    'Cross-border wealth': 'For cross-border investors, the asset is only part of the decision. Tax residence, estate rules, currency, fund domicile, remittance costs and legal ownership can materially change the outcome.',
    'Portfolio construction': 'A portfolio should match an investor’s time horizon, liquidity needs and ability to stay invested. Attractive narratives still need to be weighed against concentration, access to capital and downside risk.',
    'ETF research': 'An ETF should be understood through its holdings, costs, valuation and structure—not only its trailing return. Those inputs help explain both the opportunity and the risk an investor is taking.',
    'Investing basics': 'This concept is a starting point for analysis, not a shortcut to a buy or sell decision. It is most useful when combined with business quality, balance-sheet strength, valuation and a margin of safety.',
    'Technology': 'Technology shifts can reshape costs, competition and capital allocation before the market settles on the eventual winners. The second-order effects matter as much as the first headline.',
    'Decision making': 'The framework favours clarity over activity: remove unnecessary work before trying to automate or accelerate it. The same discipline improves investment research and everyday decisions.'
  };
  function enrich() {
    document.querySelectorAll('.research-card').forEach(card => {
      if (card.querySelector('.written-brief')) return;
      const topic = card.querySelector('.research-topic')?.textContent || '';
      const summary = card.querySelector('.research-copy > p')?.textContent || '';
      const details = document.createElement('details');
      details.className = 'written-brief';
      details.innerHTML = `<summary>Read the written brief</summary><p>${summary}</p><p>${context[topic] || 'The original video provides the supporting examples and full context behind this written brief.'}</p>`;
      card.querySelector('.research-copy')?.insertBefore(details, card.querySelector('.research-watch'));
    });
  }
  enrich();
  new MutationObserver(enrich).observe(document.getElementById('research-grid'), { childList: true });
}());
