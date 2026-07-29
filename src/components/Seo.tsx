import { Helmet } from "react-helmet-async";

const SITE = "https://app.inreco.co.za";

type SeoProps = {
  /** Page title shown in the browser tab and in Google results. */
  title: string;
  /** One-sentence summary of this page (aim for 50-160 characters). */
  description: string;
  /** The address of this page, e.g. "/pricing". */
  path: string;
  /** Optional extra tags (for example structured data). */
  children?: React.ReactNode;
};

/**
 * Sets the page title, description and social-sharing tags for a single page,
 * so every address on the site looks different in Google and in shared links.
 */
export default function Seo({ title, description, path, children }: SeoProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {children}
    </Helmet>
  );
}
