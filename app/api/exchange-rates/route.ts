export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/ILS', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return Response.json({
      USD: 1 / data.rates.USD,
      EUR: 1 / data.rates.EUR,
      GBP: 1 / data.rates.GBP,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json({
      USD: 3.0,
      EUR: 3.42,
      GBP: 3.8,
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    });
  }
}
