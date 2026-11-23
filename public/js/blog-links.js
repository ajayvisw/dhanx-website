/* Points each card on the blog index at its article, and shows the
 * article's own headline rather than the video's.
 *
 * WHY THE HEADLINE IS SWAPPED HERE
 *
 * The card data in blog.js carries the YouTube title, and it has to: the
 * rows are rebuilt nightly by sync-youtube.py from the feed, so anything
 * edited in place there is gone by morning. A YouTube title is written to
 * earn a click in a feed; the article's headline is written for the search
 * result and for the reader. Showing one on the card and the other on the
 * page the card leads to reads as two different articles.
 *
 * article-titles.js is generated next to the article pages, keyed by video
 * id. A video with no article yet is simply absent from it and keeps its
 * YouTube title, which is honest for a page that is still a shell.
 *
 * The MutationObserver matters: blog.js re-renders the whole grid on every
 * filter click and search keystroke, which throws away these edits.
 */
(function () {
  'use strict';
  const titles = window.DHANX_TITLES || {};

  function link() {
    document.querySelectorAll('.research-card').forEach((card) => {
      const watch = card.querySelector('.research-watch');
      const id = watch && new URL(watch.href, location.href).searchParams.get('v');
      if (!id) return;

      // A video with no article yet keeps its YouTube link. Its page exists
      // but is a forty-word shell, and sending a reader there under "Read the
      // full blog" promises something that is not on the other side. Presence
      // in article-titles.js is exactly the test: the generator lists only
      // videos that have one.
      if (!titles[id]) return;

      // No .html: Cloudflare serves these extension-less and 307s the
      // .html form, so linking to it sent every reader through a redirect.
      const href = `/blogs/${id}`;
      const thumb = card.querySelector('.research-thumb');
      if (thumb) thumb.href = href;
      watch.href = href;
      watch.textContent = 'Read the full blog →';

      const heading = card.querySelector('h2');
      if (heading) heading.textContent = titles[id];
    });
  }

  link();
  const grid = document.getElementById('research-grid');
  if (grid) new MutationObserver(link).observe(grid, { childList: true });
}());
