#!/usr/bin/env node
/**
 * Reconciles the Russian dictionaries with English after an upstream merge, so a
 * translation gap never blocks a release.
 *
 * The fork promises a fallback: a brand-new English string must not break the
 * build. Upstream adds keys to `en.ts`, `en.settings.ts` and the module
 * `*.i18n.ts` files; this script copies the missing ones into the matching
 * Russian dictionary and reports exactly which keys still need a real
 * translation, so the sync workflow can put them in an issue.
 *
 * Why the values are not copied verbatim: upstream's own tests assert that a
 * non-English locale does not reuse the English string — the module
 * `*.i18n.test.ts` files do it for every key, and `messages.test.ts` does it for
 * the telemetry descriptions. A verbatim copy would fail both. So each filled
 * value gets MARKER appended: the English text stays readable while the string
 * is visibly a placeholder. The one exception is the telemetry metric labels,
 * which `messages.test.ts` caps at 16 characters — those get the bare English
 * string, which the same assertion guarantees fits.
 *
 * Module blocks are rebuilt rather than appended to, because
 * `isolated-spaces.i18n.test.ts` compares the key arrays without sorting: the
 * Russian block has to follow English's key order, not just carry the same keys.
 *
 * Keys English no longer has are dropped (a stale translation of a removed key
 * fails the parity and type checks just as a missing one does) and reported.
 *
 * Usage:
 *   node scripts/ru/fill-missing-keys.mjs            # reconcile in place, JSON to stdout
 *   node scripts/ru/fill-missing-keys.mjs --check    # report only, change nothing
 *
 * Exit code 1 means something could not be repaired automatically — a module
 * file upstream added that has no `ru` block yet. The caller must not release.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MESSAGES_DIR = path.join(REPO_ROOT, 'packages/ui/src/lib/i18n/messages');

const MARKER = ' (не переведено)';

/** `chat.workStatus.telemetry.<metric>` — a metric label, length-capped at 16. */
const TELEMETRY_LABEL_RE = /^chat\.workStatus\.telemetry\.[^.]+$/;

/**
 * Metric labels get the bare English string because `messages.test.ts` caps
 * them at 16 characters, and English passes that same assertion. Their
 * `…Description` siblings are the opposite case: the test requires them to
 * differ from English, so they must take the marker.
 */
const isTelemetryLabel = (key) => TELEMETRY_LABEL_RE.test(key) && !key.endsWith('Description');

/** `  'key': 'value',` / `  "key": "value",` — the leading key of a dictionary line. */
const KEY_RE = /^\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')\s*:/;

const DECLARATIONS = {
  dict: /^export const dict\b/,
  settings: /^export const settingsDict\b/,
};

const readLines = (file) => fs.readFileSync(file, 'utf8').split('\n');

const keyOf = (line) => {
  const match = line.match(KEY_RE);
  if (!match) return null;
  return match[1] !== undefined ? match[1] : match[2];
};

/**
 * The literal part of a top-level dictionary. The range spans the whole object
 * rather than stopping at the first spread: `en.ts` keeps its `common.language.*`
 * group *after* the block that merges the module dictionaries in, so a range
 * that ended at the first spread would silently ignore those keys. Spreads do
 * not look like `'key': …` lines, so collecting keys over the whole object skips
 * them on its own.
 */
const dictRange = (lines, declarationRe) => {
  const start = lines.findIndex((line) => declarationRe.test(line));
  if (start < 0) throw new Error(`declaration ${declarationRe} not found`);
  let end = -1;
  let insertAt = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (insertAt < 0 && /^\s*\.\.\./.test(lines[i])) insertAt = i;
    if (/^\}\s*(as const)?\s*;$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('unterminated dictionary object — the shape changed upstream');
  // New keys go where most of the literals already are, ahead of the spreads.
  return { start: start + 1, end, insertAt: insertAt < 0 ? end : insertAt };
};

/** The `xx: { ... }` block of a module dictionary file. */
const localeRange = (lines, locale) => {
  const start = lines.findIndex((line) => line === `  ${locale}: {`);
  if (start < 0) return null;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^  \},?$/.test(lines[i])) return { start: start + 1, end: i };
  }
  throw new Error(`unterminated "${locale}" block`);
};

const collectKeys = (lines, range) => {
  const keys = new Map();
  for (let i = range.start; i < range.end; i += 1) {
    const key = keyOf(lines[i]);
    if (key !== null) keys.set(key, lines[i]);
  }
  return keys;
};

/** Append MARKER to the value of a dictionary line, keeping quotes and comma intact. */
const withMarker = (line, marker) => {
  const carriageReturn = line.endsWith('\r') ? '\r' : '';
  const body = carriageReturn ? line.slice(0, -1) : line;
  const trimmed = body.replace(/\s+$/, '');
  const hasComma = trimmed.endsWith(',');
  const core = hasComma ? trimmed.slice(0, -1) : trimmed;

  const colon = core.indexOf(':');
  if (colon < 0) return line;

  const quote = core.slice(colon + 1).trimStart().startsWith('"') ? '"' : "'";
  const closingQuote = core.lastIndexOf(quote);
  if (closingQuote <= colon) return line;

  return `${core.slice(0, closingQuote)}${marker}${core.slice(closingQuote)}${hasComma ? ',' : ''}${carriageReturn}`;
};

const buildUnits = () => {
  const moduleFiles = fs
    .readdirSync(MESSAGES_DIR)
    .filter((file) => file.endsWith('.i18n.ts'))
    .sort();

  return [
    {
      id: 'messages/en.ts',
      kind: 'dict',
      declaration: DECLARATIONS.dict,
      en: path.join(MESSAGES_DIR, 'en.ts'),
      ru: path.join(MESSAGES_DIR, 'ru.ts'),
    },
    {
      id: 'messages/en.settings.ts',
      kind: 'dict',
      declaration: DECLARATIONS.settings,
      en: path.join(MESSAGES_DIR, 'en.settings.ts'),
      ru: path.join(MESSAGES_DIR, 'ru.settings.ts'),
    },
    ...moduleFiles.map((file) => ({
      id: `messages/${file}`,
      kind: 'module',
      declaration: DECLARATIONS.dict,
      en: path.join(MESSAGES_DIR, file),
      ru: path.join(MESSAGES_DIR, file),
    })),
  ];
};

const main = () => {
  const checkOnly = process.argv.includes('--check');
  const report = { checkOnly, added: [], dropped: [], manual: [] };

  for (const unit of buildUnits()) {
    const enLines = readLines(unit.en);
    const enRange = unit.kind === 'dict'
      ? dictRange(enLines, unit.declaration)
      : localeRange(enLines, 'en');
    if (!enRange) throw new Error(`${unit.id}: no "en" block`);
    const enKeys = collectKeys(enLines, enRange);

    const ruLines = readLines(unit.ru);
    const ruRange = unit.kind === 'dict'
      ? dictRange(ruLines, unit.declaration)
      : localeRange(ruLines, 'ru');

    // A module upstream added wholesale has no Russian block yet. Filling one in
    // means inventing the import and the spread in ru.ts as well — that is a
    // human call, so report it instead of guessing.
    if (!ruRange) {
      report.manual.push({ unit: unit.id, keys: [...enKeys.keys()] });
      continue;
    }

    const ruKeys = collectKeys(ruLines, ruRange);
    const enKeyList = [...enKeys.keys()];
    const ruKeyList = [...ruKeys.keys()];
    const missing = enKeyList.filter((key) => !ruKeys.has(key));
    const dropped = ruKeyList.filter((key) => !enKeys.has(key));

    const fillLine = (key) => {
      const source = enKeys.get(key);
      return isTelemetryLabel(key) ? source : withMarker(source, MARKER);
    };

    if (unit.kind === 'module') {
      const orderMatches = ruKeyList.length === enKeyList.length
        && ruKeyList.every((key, index) => key === enKeyList[index]);
      if (orderMatches) continue;

      // Rebuild in English's order: covers a gap and a reordering in one pass.
      const rebuilt = enKeyList.map((key) => ruKeys.get(key) ?? fillLine(key));
      ruLines.splice(ruRange.start, ruRange.end - ruRange.start, ...rebuilt);
    } else {
      if (!missing.length && !dropped.length) continue;

      for (let i = ruRange.end - 1; i >= ruRange.start; i -= 1) {
        const key = keyOf(ruLines[i]);
        if (key !== null && !enKeys.has(key)) ruLines.splice(i, 1);
      }

      if (missing.length) {
        let insertAt = ruRange.end;
        for (let i = ruRange.start; i < ruLines.length; i += 1) {
          if (/^\s*\.\.\./.test(ruLines[i])) {
            insertAt = i;
            break;
          }
        }
        ruLines.splice(insertAt, 0, ...missing.map(fillLine));
      }
    }

    if (!checkOnly) fs.writeFileSync(unit.ru, ruLines.join('\n'), 'utf8');
    report.added.push(...missing.map((key) => ({ unit: unit.id, key })));
    report.dropped.push(...dropped.map((key) => ({ unit: unit.id, key })));
  }

  const summary = (label, entries) => {
    if (!entries.length) return;
    process.stderr.write(`${label} ${entries.length}:\n`);
    for (const entry of entries) process.stderr.write(`  ${entry.unit}  ${entry.key}\n`);
  };

  if (report.added.length) {
    process.stderr.write(`${checkOnly ? 'Would fill' : 'Filled'} ${report.added.length} untranslated key(s) with the English text.\n`);
  } else {
    process.stderr.write('Nothing to fill — the Russian dictionaries already cover every English key.\n');
  }
  summary(checkOnly ? 'Would drop' : 'Dropped', report.dropped);
  if (report.manual.length) {
    process.stderr.write('Needs a human — module file(s) without a Russian block:\n');
    for (const entry of report.manual) process.stderr.write(`  ${entry.unit}\n`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.manual.length ? 1 : 0);
};

main();
