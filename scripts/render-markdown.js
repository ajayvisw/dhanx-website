/**
 * render-markdown.js — the small subset of Markdown the blog articles use.
 *
 * Deliberately not a dependency. This site has no build step and no
 * node_modules in the deploy path; adding a Markdown library would mean adding
 * both. The articles are written by hand against this subset, so the parser
 * only has to handle what they actually contain:
 *
 *   # H1            the article title (consumed by the caller, not emitted)
 *   ## H2           section headings — these become the page's outline
 *   ### H3          sub-headings
 *   - item          unordered lists
 *   **bold**        emphasis
 *   *italic*
 *   [text](url)     links
 *   > quote         blockquote
 *   paragraph       everything else
 *
 * Anything it does not recognise is emitted as a paragraph rather than
 * silently dropped, so a mistake in an article shows up as odd prose instead
 * of a missing section.
 */
'use strict';

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/** Inline formatting. Order matters: links before emphasis, so URLs with
 *  underscores are not mangled into <em>. */
function inline(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
    const external = /^https?:\/\//.test(href) && !/dhan-x\.com/.test(href);
    const rel = external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${href}"${rel}>${text}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Keep an em dash tight rather than letting it wrap onto its own line.
  t = t.replace(/ — /g, '&nbsp;— ');
  return t;
}

/** A URL-safe id for a heading, so each section is linkable and Google can
 *  offer a jump link straight to it. */
function slugify(s) {
  return String(s).toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 60);
}

/**
 * Returns { title, html, headings, text }.
 *  title    — the single H1, if present
 *  html     — the article body
 *  headings — [{ id, text }] for the on-page contents list
 *  text     — plain text, for word counts and the meta description
 */
function render(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let title = '';
  let para = [];
  let list = null;

  const flushPara = () => {
    if (!para.length) return;
    out.push('<p>' + inline(para.join(' ')) + '</p>');
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push('<ul>' + list.map((li) => '<li>' + inline(li) + '</li>').join('') + '</ul>');
    list = null;
  };
  const flushAll = () => { flushPara(); flushList(); };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { flushAll(); continue; }

    let m;
    if ((m = line.match(/^#\s+(.*)$/))) { flushAll(); title = m[1].trim(); continue; }
    if ((m = line.match(/^##\s+(.*)$/))) {
      flushAll();
      const text = m[1].trim();
      const id = slugify(text);
      headings.push({ id, text });
      out.push(`<h2 id="${id}">${inline(text)}</h2>`);
      continue;
    }
    if ((m = line.match(/^###\s+(.*)$/))) {
      flushAll();
      const text = m[1].trim();
      out.push(`<h3 id="${slugify(text)}">${inline(text)}</h3>`);
      continue;
    }
    if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      (list = list || []).push(m[1].trim());
      continue;
    }
    if ((m = line.match(/^>\s?(.*)$/))) {
      flushAll();
      out.push('<blockquote><p>' + inline(m[1].trim()) + '</p></blockquote>');
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushAll();

  const html = out.join('\n');
  // Drop the H1 line entirely: it is the headline, and a meta description that
  // opens by repeating the headline wastes the only 155 characters a search
  // result gives you.
  const text = String(md)
    .replace(/^#\s+.*$/m, '')
    .replace(/^#{2,3}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, html, headings, text };
}

module.exports = { render, slugify, esc, inline };
