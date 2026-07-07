export async function onRequest(context) {
  const country = context.request.cf?.country || 'US';
  const isIndia = country === 'IN';

  return new Response(JSON.stringify({
    country: isIndia ? 'India' : 'United States',
    countryCode: country,
    isIndia,
    currency: isIndia ? 'INR' : 'USD',
    symbol: isIndia ? '₹' : '$',
    monthly: isIndia ? 499 : 12.99,
    yearly: isIndia ? 4999 : 100,
    yearlySavings: isIndia ? 17 : 36,
    alternateRegion: isIndia ? 'US' : 'India',
    alternatePrice: isIndia ? '$12.99/mo' : '₹499/mo'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
