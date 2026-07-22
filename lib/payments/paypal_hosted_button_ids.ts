/**
 * PayPal Hosted Button IDs + public client-id (NEXT_PUBLIC_* — safe in browser).
 */

export const CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ||
  'BAA2pLZ9r0GDymXTIJ85zRAbZ7UD_eKid08QZUvFnfgQ0fNJA2y18vKJtLiYweHgBA7jugeF7sqRbtHing';

export const HOSTED_BUTTON_ID_FULL =
  process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_FULL?.trim() || 'V684FJT73X9T2';

export const HOSTED_BUTTON_ID_PROMO =
  process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_PROMO?.trim() || 'LG4MDNKQ63HEY';
