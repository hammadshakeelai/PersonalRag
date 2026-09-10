/**
 * Client-Side HTML Sanitizer
 * Strips script tags, iframes, objects, embeds, and malicious event handlers (onload, onerror, onclick, etc.)
 * while allowing safe markdown formatting (p, span, div, strong, em, code, pre, h1-h6, table, thead, tbody, tr, th, td, ul, ol, li, blockquote).
 */

const DANGEROUS_TAGS_REGEX = /<\/?(script|iframe|object|embed|applet|meta|link|style|base|form|input|button|textarea|select)[^>]*>/gi;
const DANGEROUS_ATTRS_REGEX = /\s*(on\w+|javascript:|data:|vbscript:)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_REGEX = /href\s*=\s*["']\s*javascript:[^"']*["']/gi;

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  return dirtyHtml
    // 1. Remove dangerous executable tags
    .replace(DANGEROUS_TAGS_REGEX, '')
    // 2. Remove inline event handlers (onclick, onerror, onload, onmouseover, etc.)
    .replace(DANGEROUS_ATTRS_REGEX, '')
    // 3. Remove javascript: pseudo-protocol in links
    .replace(JAVASCRIPT_URL_REGEX, 'href="#"');
}

/**
 * Escapes raw user text before markdown parsing to prevent inadvertent injection
 */
export function escapeRawText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
