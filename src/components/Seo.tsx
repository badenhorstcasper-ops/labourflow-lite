import { useEffect } from "react";

const SITE = "https://app.inreco.co.za";

type SeoProps = {
  /** Page title shown in the browser tab and in Google results. */
  title: string;
  /** One-sentence summary of this page (aim for 50-160 characters). */
  description: string;
  /** The address of this page, e.g. "/pricing". */
  path: string;
  /** Optional extra information for Google, such as a list of questions and answers. */
  jsonLd?: Record<string, unknown>;
};

function setTag(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  apply(el);
}

/**
 * Sets the page title, description, web address and social-sharing details for a
 * single page, so every address on the site looks different in Google and in
 * shared links.
 */
export default function Seo({ title, description, path, jsonLd }: SeoProps) {
  useEffect(() => {
    const url = `${SITE}${path}`;
    document.title = title;

    setTag(
      'meta[name="description"]',
      () => Object.assign(document.createElement("meta"), { name: "description" }),
      (el) => el.setAttribute("content", description),
    );
    setTag(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement("link"), { rel: "canonical" }),
      (el) => el.setAttribute("href", url),
    );

    const meta: Array<[string, string, string]> = [
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["property", "og:url", url],
      ["property", "og:type", "website"],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description],
    ];
    for (const [attr, key, value] of meta) {
      setTag(
        `meta[${attr}="${key}"]`,
        () => {
          const el = document.createElement("meta");
          el.setAttribute(attr, key);
          return el;
        },
        (el) => el.setAttribute("content", value),
      );
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "page";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
    };
  // Stringified so a freshly-built object each render does not redo the work.
  }, [title, description, path, jsonLd ? JSON.stringify(jsonLd) : null]);

  return null;
}
