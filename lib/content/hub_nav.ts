/** Round 12 (CONTENT_HUB): the hub's paths and the links the site shows when the flag is on. No imports, so it is light on the client. */
export const HUB_PATHS = { guides: '/guides', articles: '/articles' } as const;
export const HUB_NAV = [
  [HUB_PATHS.guides, 'מדריכים'],
  [HUB_PATHS.articles, 'כתבות'],
] as const;
