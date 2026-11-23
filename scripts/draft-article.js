#!/usr/bin/env node
/**
 * draft-article.js — write the article for any video that does not have one.
 *
 * WHY THIS EXISTS
 *
 * sync-youtube.py imports a new upload within a day, and
 * generate-blog-articles.js builds it a page. But the page is only a shell
 * until content/blog/<id>.md exists: roughly forty words of boilerplate,
 * correctly marked noindex, and now correctly kept out of the sitemap. Left
 * alone, every new video produced a URL that could never rank.
 *
 * The existing 51 articles were written by hand from each video's transcript.
 * That does not scale past the person willing to do it, so this script does
 * the same job: pull the captions, write the piece, commit the Markdown.
 *
 * WHAT IT WILL AND WILL NOT DO
 *
 * It writes only from the transcript. The prompt forbids introducing facts,
 * figures or companies the speaker did not mention, because the alternative
 * on a personal-finance site is inventing numbers under a masthead that
 * people are being asked to trust with their savings. Output that fails the
 * structural checks below is discarded rather than published; the video keeps
 * its noindex shell and can be retried or written by hand.
 *
 * It does not review itself. An article here goes live on the next build
 * without a person reading it. Set DRAFT=1 to hold new articles as noindex
 * drafts instead, and flip `status: draft` to `published` in the frontmatter
 * once read.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/draft-article.js
 *   ANTHROPIC_API_KEY=... node scripts/draft-article.js <videoId>   # just one
 *   DRAFT=1 ...        # write as drafts (noindex until promoted)
 *   MAX_PER_RUN=3 ...  # cap per run (default 3) so a backlog cannot bill at once
 *
 * Requires yt-dlp on PATH. YouTube answers its caption endpoint only after a
 * JS challenge, so a plain HTTP fetch of timedtext returns nothing useful.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content', 'blog');

const MODEL = 'claude-opus-5-5';
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 3);
const DRAFT = !!process.env.DRAFT;

// ── The brief ────────────────────────────────────────────────────────────
// Written against the failure modes of the first attempt at these articles,
// which read as competent filler: headings a person would not search for,
// and paragraphs that restated a number instead of saying what it meant.
const SYSTEM = `You write the article that accompanies a video on Dhan-X, a personal-finance site for investors with money in both India and the United States.

You are given one video's transcript. Produce a written piece that stands on its own for someone who will never watch it.

WHAT TO WRITE
- Follow the argument the speaker actually makes, in their order. This is that episode's piece, not a general explainer on the topic.
- Give each section one idea and make it land. If you cannot say what a section is for, it should not exist.
- Abstract rather than transcribe. A figure quoted on screen means something; say what it means. "Capital spending reached $250 billion a year" is a fact. Why that number is hard to earn back is the sentence worth writing.
- Keep the prose tight. Short sentences carry complex arguments better than long ones. Cut throat-clearing.
- Write headings a person might plausibly search for. Substantive and concrete, never colloquial, never a teaser, never a question with no answer under it.

HARD RULES
- Use only what the transcript contains. Never introduce a company, figure, date or claim the speaker did not make. If a number is unclear, leave it out rather than guessing.
- Never give investment advice, never recommend buying or selling, never predict a price. Report what the speaker argued and the reasoning behind it.
- No hype, no "in today's fast-paced world", no second-person sales copy, no exclamation marks.
- No concluding section that summarises the piece back to the reader.

FORMAT
- Markdown only. One "# " title, then "## " sections. No front matter, no code fences, no closing commentary.
- The title should read as an article headline, not the video's title, and stay under 65 characters.
- Four to seven "## " sections, each two to four short paragraphs.
- 700-1100 words total.`;

/** The catalogue the site builds its pages from. */
function rows() {
  const raw = fs.readFileSync(path.join(ROOT, 'public', 'js', 'blog.js'), 'utf8');
  const m = raw.match(/const P=(\[[\s\S]*?\])\.map/);
  if (!m) throw new Error('Could not read the blog catalogue');
  return Function(`return ${m[1]}`)();
}

/**
 * Captions, as one block of prose.
 *
 * json3 stores a line as a list of segments; a segment whose text is "\n" is
 * a line break, not a word boundary. Dropping those instead of turning them
 * into spaces glues the last word of each line to the first of the next
 * ("theobjective"), which is quiet enough to survive into published copy.
 */
function transcript(id) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
  try {
    execFileSync('yt-dlp', [
      '--skip-download', '--write-auto-subs', '--write-subs',
      // en-orig first. The plain "en" track is the one everything else hits,
      // so it is the one that returns 429 under load; en-orig is the same
      // captions on a less contended path and succeeded here when en did not.
      '--sub-langs', 'en-orig,en.*,en', '--sub-format', 'json3',
      // YouTube gates its caption endpoint behind a JavaScript challenge, and
      // yt-dlp enables only deno by default. A GitHub runner has Node and not
      // deno, so without this it fails with "No supported JavaScript runtime
      // could be found" and the video silently keeps its empty shell.
      '--js-runtimes', 'node',
      '-o', path.join(dir, '%(id)s.%(ext)s'),
      `https://www.youtube.com/watch?v=${id}`,
    ], { stdio: 'pipe', timeout: 120000 });
  } catch (e) {
    throw new Error(`yt-dlp failed: ${String(e.stderr || e.message).slice(0, 200)}`);
  }
  const f = fs.readdirSync(dir).find((x) => x.endsWith('.json3'));
  if (!f) throw new Error('no captions available');
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  fs.rmSync(dir, { recursive: true, force: true });

  const words = [];
  for (const ev of data.events || []) {
    for (const seg of ev.segs || []) {
      const t = seg.utf8;
      if (t === undefined) continue;
      words.push(t === '\n' ? ' ' : t);
    }
  }
  return words.join('').replace(/\s+/g, ' ').trim();
}

/** Structural checks. Anything that fails is discarded, not published. */
function validate(md) {
  const problems = [];
  const titles = (md.match(/^# .+$/gm) || []).length;
  const sections = (md.match(/^## .+$/gm) || []).length;
  const words = md.replace(/[#*`>_-]/g, ' ').split(/\s+/).filter(Boolean).length;

  if (titles !== 1) problems.push(`expected 1 H1, found ${titles}`);
  if (sections < 3) problems.push(`only ${sections} sections`);
  if (words < 450) problems.push(`only ${words} words`);
  if (words > 1800) problems.push(`${words} words, too long`);
  if (/```/.test(md)) problems.push('contains a code fence');
  if (/^(Here|Sure|I'll|Below)\b/i.test(md.trim())) problems.push('starts with preamble');
  // A model that could not use the transcript tends to say so rather than stop.
  if (/\b(transcript|the video|as an AI)\b/i.test(md.split('\n')[0] || '')) {
    problems.push('title refers to the transcript');
  }
  return { ok: problems.length === 0, problems, words };
}

async function write(client, row, text) {
  const [id, , topic, , title] = row;
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    // Deciding what an argument is actually for, then compressing it without
    // losing it, is not a mechanical rewrite - let the model think.
    thinking: { type: 'adaptive' },
    // A policy decline here would otherwise just stop and leave the video
    // without an article; this re-runs it on another model inside the call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Video title: ${title}\nTopic: ${topic}\n\nTranscript:\n\n${text}`,
    }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('declined by safety classifier');
  if (msg.stop_reason === 'max_tokens') throw new Error('hit max_tokens');
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

(async () => {
  const only = process.argv[2];
  const pending = rows().filter(([id]) =>
    (!only || id === only) && !fs.existsSync(path.join(CONTENT, `${id}.md`)));

  if (!pending.length) { console.log('Every video already has an article.'); return; }
  // Two ways to be authenticated, and this guard has to know both. An API
  // key is the obvious one. In CI there is no key at all: GitHub mints an
  // identity token, the SDK exchanges it, and the credential never exists as
  // a stored secret. Checking only for the key made the workflow report
  // "ANTHROPIC_API_KEY is not set" while sitting on a perfectly good
  // federated credential.
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const hasFederation = !!(process.env.ANTHROPIC_FEDERATION_RULE_ID &&
    process.env.ANTHROPIC_ORGANIZATION_ID &&
    (process.env.ANTHROPIC_IDENTITY_TOKEN || process.env.ANTHROPIC_IDENTITY_TOKEN_FILE));
  if (!hasKey && !hasFederation) {
    console.error('No Anthropic credential: set ANTHROPIC_API_KEY, or the ' +
      'federation variables (ANTHROPIC_FEDERATION_RULE_ID, ' +
      'ANTHROPIC_ORGANIZATION_ID and ANTHROPIC_IDENTITY_TOKEN).');
    process.exitCode = 1; return;
  }
  console.log(hasKey ? 'Authenticating with an API key.'
                     : 'Authenticating by workload identity federation.');

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  const batch = pending.slice(0, MAX_PER_RUN);
  console.log(`${pending.length} video(s) without an article; writing ${batch.length}.`);

  let written = 0;
  for (const row of batch) {
    const id = row[0];
    try {
      const text = transcript(id);
      if (text.split(/\s+/).length < 150) throw new Error('transcript too short to work from');

      const md = await write(client, row, text);
      const check = validate(md);
      if (!check.ok) {
        // Discarded on purpose. The page keeps its noindex shell and stays out
        // of the sitemap, which is a better outcome than publishing this.
        console.error(`  ${id}: discarded — ${check.problems.join('; ')}`);
        continue;
      }
      const body = DRAFT ? `---\nstatus: draft\n---\n\n${md}\n` : `${md}\n`;
      fs.mkdirSync(CONTENT, { recursive: true });
      fs.writeFileSync(path.join(CONTENT, `${id}.md`), body);
      console.log(`  ${id}: ${check.words} words${DRAFT ? ' (draft)' : ''}`);
      written++;
    } catch (e) {
      // One bad video must not stop the rest, and must not fail the workflow:
      // the run still has a sync and a rebuild to commit.
      console.error(`  ${id}: skipped — ${e.message}`);
    }
  }
  console.log(`Wrote ${written} article(s).`);
})().catch((e) => { console.error('draft-article failed:', e.message); process.exitCode = 1; });
