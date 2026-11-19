import { homeJsonLd, jsonLdScriptContent } from '../../lib/seo/structured_data';
import { readSiteFlags } from '../../lib/flags/site_flags';

/** Round 6: JSON-LD of the home page (lib/seo/structured_data.ts). Server component, no client JS. */
export function HomeStructuredData() {
  return (
    <>
      {homeJsonLd(readSiteFlags().copyV2).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(d) }} />
      ))}
    </>
  );
}
