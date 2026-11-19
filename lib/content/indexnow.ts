import { SITE_ORIGIN } from '../seo/site';

/**
 * Round 12 (CONTENT_HUB): IndexNow, as on the SBC site (sbc-site/lib/indexnow.ts): Bing, Yandex and the other engines that share it
 * learn about a new post in minutes. The key is public by design (the engines read it at keyLocation, public/<key>.txt).
 * Off until INDEXNOW_ENABLED=on, and only from the production address: a preview or a local run never reports anything.
 */
export const INDEXNOW_KEY = '2ac59979c42fc2ca38e923d8e1b6d9aa';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const PRODUCTION_HOST = 'equify.co.il';

export const indexNowEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.INDEXNOW_ENABLED?.trim() === 'on' && new URL(SITE_ORIGIN).host === PRODUCTION_HOST && env.VERCEL_ENV === 'production';

/** What would be sent: only addresses of this site, at most the 10,000 one request takes. */
export function indexNowBody(urls: string[]) {
  const host = new URL(SITE_ORIGIN).host;
  const urlList = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return { host, key: INDEXNOW_KEY, keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`, urlList: urlList.slice(0, 10000) };
}

/** Sends the addresses when switched on; otherwise says what it would have sent and sends nothing. */
export async function submitIndexNow(urls: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ sent: boolean; status?: number; count: number }> {
  const body = indexNowBody(urls);
  if (!indexNowEnabled(env) || !body.urlList.length) return { sent: false, count: body.urlList.length };
  const res = await fetch(INDEXNOW_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  return { sent: true, status: res.status, count: body.urlList.length };
}
