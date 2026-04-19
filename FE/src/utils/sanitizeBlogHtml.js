import DOMPurify from "dompurify";

export const sanitizeBlogHtml = (html) =>
  DOMPurify.sanitize(String(html || ""), {
    USE_PROFILES: { html: true },
  });
