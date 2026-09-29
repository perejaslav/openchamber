#!/usr/bin/env node
/**
 * Resolves the conflicts that an upstream release always creates in this fork.
 *
 * Upstream keeps adding locales (v2.0.4 added Dutch), and the fork adds Russian
 * in the same places — the locale union in `runtime.ts`, the `common.language.*`
 * labels in every dictionary, the locale blocks of the module `*.i18n.ts` files,
 * the hardcoded locale arrays in the module tests. Git sees two edits to the
 * same lines and stops, every single release.
 *
 * None of that is a real disagreement, so this script resolves it mechanically:
 * take upstream's file, then re-apply the Russian part. Anything it does not
 * recognise is left conflicted on purpose, so the caller can stop and open an
 * issue instead of guessing.
 *
 * Run it inside a repository with an in-progress merge. Exits non-zero if
 * conflicts remain.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const I18N_DIR = 'packages/ui/src/lib/i18n';
const MESSAGES = `${I18N_DIR}/messages`;
const RUNTIME = `${I18N_DIR}/runtime.ts`;

/**
 * Paths must be compared and handed to git in one shape. `path.join` produces
 * backslashes on Windows, which breaks a prefix comparison against these
 * forward-slash constants and makes `git show HEAD:<path>` fail — so normalise
 * on the way in, and compare resolved directories instead of string prefixes.
 */
const toGitPath = (file) => file.split(path.sep).join('/');
const isIn = (file, directory) => path.dirname(path.resolve(file)) === path.resolve(directory);

/** How upstream spells "Russian" in each locale it ships. */
const RUSSIAN_LABEL = {
  en: 'Russian',
  de: 'Russisch',
  fr: 'Russe',
  nl: 'Russisch',
  es: 'Ruso',
  ja: 'ロシア語',
  'pt-BR': 'Russo',
  uk: 'Російська',
  ko: '러시아어',
  pl: 'Rosyjski',
  'zh-CN': '俄语',
  'zh-TW': '俄語',
  tr: 'Rusça',
};

const RUSSIAN_LABEL_KEY = 'common.language.russian';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const gitOrNull = (...args) => {
  try {
    return git(...args);
  } catch {
    return null;
  }
};

const readLines = (file) => fs.readFileSync(file, 'utf8').split('\n');
const writeLines = (file, lines) => fs.writeFileSync(file, lines.join('\n'), 'utf8');

const fail = (message) => {
  throw new Error(message);
};

/** Take upstream's side of a conflicted file and stage it. */
const takeTheirs = (file) => {
  git('checkout', '--theirs', '--', toGitPath(file));
};

/** The `xx: { ... }` block of a module dictionary file, as raw lines. */
const extractLocaleBlock = (text, locale) => {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line === `  ${locale}: {`);
  if (start < 0) return null;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^  \},?$/.test(lines[i])) return lines.slice(start, i + 1);
  }
  return null;
};

const hasRussianLabel = (lines) => lines.some((line) => line.includes(RUSSIAN_LABEL_KEY));

/** Upstream dictionaries must carry the Russian label, or the picker shows a raw key. */
const ensureRussianLabel = (file, locale) => {
  const lines = readLines(file);
  if (hasRussianLabel(lines)) return false;

  const label = RUSSIAN_LABEL[locale];
  if (!label) fail(`${file}: нет перевода слова «Русский» для локали ${locale} — добавьте его в RUSSIAN_LABEL`);

  const spreadIndex = lines.findIndex((line) => /^\s*\.\.\./.test(line));
  if (spreadIndex < 0) fail(`${file}: не найден блок спредов`);

  lines.splice(spreadIndex, 0, `  '${RUSSIAN_LABEL_KEY}': '${label}',`);
  writeLines(file, lines);
  return true;
};

/** Put the fork's `ru` block back into a module dictionary, keeping upstream's edits. */
const ensureRuBlock = (file) => {
  const lines = readLines(file);
  if (lines.some((line) => line === '  ru: {')) return false;

  // Our pre-merge version is still reachable through HEAD, because the merge is
  // still in progress.
  const ours = gitOrNull('show', `HEAD:${toGitPath(file)}`);
  let block = ours ? extractLocaleBlock(ours, 'ru') : null;
  // A module upstream added wholesale has nothing to copy — start empty and let
  // fill-missing-keys.mjs populate it with the English fallback.
  if (!block) block = ['  ru: {', '  },'];

  const closeIndex = lines.lastIndexOf('} as const;');
  if (closeIndex < 0) fail(`${file}: не найден закрывающий "} as const;"`);
  lines.splice(closeIndex, 0, ...block);
  writeLines(file, lines);
  return true;
};

/** Keep `ru` in the hardcoded locale array the module tests iterate. */
const ensureRuInLocales = (file) => {
  const lines = readLines(file);
  const index = lines.findIndex((line) => /^const locales = \[/.test(line));
  if (index < 0) fail(`${file}: не найден массив locales`);
  if (lines[index].includes("'ru'")) return false;

  lines[index] = lines[index].replace("['en', ", "['en', 'ru', ");
  if (!lines[index].includes("'ru'")) fail(`${file}: не удалось добавить ru в массив locales`);
  writeLines(file, lines);
  return true;
};

/** Re-apply the fork's five edits to runtime.ts on top of upstream's version. */
const ensureRuntime = (file) => {
  let source = fs.readFileSync(file, 'utf8');
  const changed = [];

  const expect = (condition, what) => {
    if (!condition) fail(`${file}: ${what} — разметка файла изменилась, нужна ручная правка`);
  };

  if (!source.includes("'ru'")) {
    const union = source.match(/^export type Locale = [^\n]*;$/m);
    expect(union, 'не найден тип Locale');
    source = source.replace(union[0], `${union[0].replace(/;$/, '')} | 'ru';`);

    const locales = source.match(/^export const LOCALES = \[[^\n]*$/m);
    expect(locales, 'не найден массив LOCALES');
    source = source.replace(locales[0], `${locales[0].replace('LOCALES = [', "LOCALES = ['ru', ")}`);

    const labels = source.match(/^export const LOCALE_LABEL_KEYS: Record<Locale, [^\n]*$/m);
    expect(labels, 'не найден тип LOCALE_LABEL_KEYS');
    source = source.replace(labels[0], `${labels[0].replace(/> = \{$/, ` | '${RUSSIAN_LABEL_KEY}'> = {`)}`);

    const labelLines = source.split('\n');
    const labelsStart = labelLines.findIndex((line) => line.startsWith('export const LOCALE_LABEL_KEYS'));
    const labelsEnd = labelLines.indexOf('};', labelsStart);
    expect(labelsEnd > labelsStart, 'не найден конец LOCALE_LABEL_KEYS');
    labelLines.splice(labelsEnd, 0, `  ru: '${RUSSIAN_LABEL_KEY}',`);
    source = labelLines.join('\n');

    // `normalizeLocale` is the first function in the file, and `detectInitialLocale`
    // ends with the very same two lines — so take the first match, not the last.
    const fallback = source.indexOf('  return DEFAULT_LOCALE;\n}');
    expect(fallback >= 0, 'не найден финальный return в normalizeLocale');
    source = `${source.slice(0, fallback)}  if (normalized === 'ru' || normalized.startsWith('ru-')) {\n    return 'ru';\n  }\n${source.slice(fallback)}`;

    source = source.replace(/^export const DEFAULT_LOCALE: Locale = '[a-z-]+';$/m, "export const DEFAULT_LOCALE: Locale = 'ru';");
    changed.push('runtime');
  }

  fs.writeFileSync(file, source, 'utf8');
  return changed.length > 0;
};

/** `en.ts`, `pt-BR.ts`, `zh-CN.ts` … — upstream's per-locale dictionaries. */
const LOCALE_DICTIONARY_RE = /^[a-z]{2}(?:-[A-Za-z]{2})?\.ts$/;

const isLocaleDictionary = (file) => {
  const base = path.basename(file);
  return LOCALE_DICTIONARY_RE.test(base) && base !== 'ru.ts' && isIn(file, MESSAGES);
};

const localeOf = (file) => path.basename(file, '.ts');

const main = () => {
  const unresolved = gitOrNull('diff', '--name-only', '--diff-filter=U') ?? '';
  const conflicted = unresolved ? unresolved.split('\n').filter(Boolean) : [];

  const resolved = [];
  const leftAlone = [];

  for (const file of conflicted) {
    const base = path.basename(file);
    try {
      if (base === 'runtime.ts' && isIn(file, I18N_DIR)) {
        takeTheirs(file);
        ensureRuntime(file);
        resolved.push(file);
      } else if (base.endsWith('.i18n.test.ts') && isIn(file, MESSAGES)) {
        takeTheirs(file);
        ensureRuInLocales(file);
        resolved.push(file);
      } else if (base.endsWith('.i18n.ts') && isIn(file, MESSAGES)) {
        takeTheirs(file);
        ensureRuBlock(file);
        resolved.push(file);
      } else if (isLocaleDictionary(file)) {
        takeTheirs(file);
        ensureRussianLabel(file, localeOf(file));
        resolved.push(file);
      } else {
        leftAlone.push(file);
      }
    } catch (error) {
      process.stderr.write(`Не удалось разрешить ${file}: ${error instanceof Error ? error.message : error}\n`);
      leftAlone.push(file);
    }
  }

  // Upstream may have added a whole locale or module that never conflicted.
  const messageFiles = fs.readdirSync(MESSAGES).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
  for (const name of messageFiles) {
    const file = path.join(MESSAGES, name);
    if (name.endsWith('.i18n.ts')) {
      try {
        if (ensureRuBlock(file)) resolved.push(file);
      } catch (error) {
        leftAlone.push(`${file} (${error instanceof Error ? error.message : error})`);
      }
    } else if (isLocaleDictionary(file)) {
      try {
        if (ensureRussianLabel(file, localeOf(file))) resolved.push(file);
      } catch (error) {
        leftAlone.push(`${file} (${error instanceof Error ? error.message : error})`);
      }
    }
  }

  for (const file of resolved) {
    gitOrNull('add', '--', toGitPath(file));
  }

  const stillUnmerged = (gitOrNull('diff', '--name-only', '--diff-filter=U') ?? '')
    .split('\n')
    .filter(Boolean);
  for (const file of stillUnmerged) {
    if (!leftAlone.includes(file)) leftAlone.push(file);
  }

  process.stderr.write(`Разрешено механически: ${resolved.length}\n`);
  for (const file of resolved) process.stderr.write(`  ok  ${file}\n`);
  if (leftAlone.length) {
    process.stderr.write('Остались неразрешёнными (нужна ручная работа):\n');
    for (const file of leftAlone) process.stderr.write(`  !!  ${file}\n`);
  }

  process.stdout.write(`${JSON.stringify({ resolved, leftAlone }, null, 2)}\n`);
  process.exit(leftAlone.length ? 1 : 0);
};

main();
