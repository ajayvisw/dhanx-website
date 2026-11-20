/**
 * NOT DEPLOYED. Reachable at no URL. /api/pricing answers 404 in production.
 *
 * This is a Pages Function, but dhan-x.com is a Workers project whose
 * wrangler.jsonc sets assets.directory to "public" - so this directory is
 * simply not uploaded. It was written when the project was Pages-shaped and
 * has been dead since the move.
 *
 * It is kept rather than deleted because request.cf.country is the RIGHT way
 * to do this: real IP geolocation, decided at the edge, with no flash of the
 * wrong currency and nothing a visitor can spoof by changing a system clock.
 * The homepage currently guesses from browser timezone and locale instead,
 * which is weaker. Wiring this up - a Worker entry point that serves assets
 * and rewrites the price - is the proper fix when there is appetite for
 * touching the deploy.
 *
 * Its prices were left at Rs 499 and $12.99 long after the real ones became
 * Rs 199 and $7.99, so anything that did reach it would have quoted figures
 * that had not been current for some time. They are corrected below. If you
 * change pricing, this file counts as a fourth place to update - see the
 * comment beside the price panel in public/index.html.
 */
export async function onRequest(context) {
  const country = context.request.cf?.country || 'US';
  const isIndia = country === 'IN';

  return new Response(JSON.stringify({
    country: isIndia ? 'India' : 'United States',
    countryCode: country,
    isIndia,
    currency: isIndia ? 'INR' : 'USD',
    symbol: isIndia ? '₹' : '$',
    monthly: isIndia ? 199 : 7.99,
    yearly: isIndia ? 1990 : 79.99,
    yearlySavings: 17,
    alternateRegion: isIndia ? 'US' : 'India',
    alternatePrice: isIndia ? '$7.99/mo' : '₹199/mo'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
