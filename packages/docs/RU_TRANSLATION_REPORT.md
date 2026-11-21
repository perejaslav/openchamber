# Отчёт: русская локализация документации OpenChamber

Дата: 22 ноября 2026. Ветка: `docs/ru-translation`, один коммит поверх `cb45f2f`.

## Итог

Переведены все **62** английские страницы: создано дерево
`packages/docs/content/docs/ru/` с зеркальными путями, в `sidebar.config.json`
добавлены русские подписи для всех **70** узлов с `label` (8 секций и 62 пункта).
Английские исходники и другие локали не изменены.

| Показатель | Значение |
| --- | --- |
| Исходная ревизия | `cb45f2f` (ветка `main`, sparse checkout `packages/docs` + `scripts/docs`) |
| Английских страниц | 62 |
| Русских страниц | 62 |
| Всего страниц после перевода | 806 (было 744) |
| Русских строк | 5 603 |
| Объём русского текста | ~52 600 слов, 388 КБ |
| Русских меток меню | 70 из 70 узлов с `label` |
| Изменения в `sidebar.config.json` | +140 / −70 строк, только добавления ключа `ru` |

## Что сделано

1. Зафиксировано исходное состояние: `git status` чистый (кроме добавленного ТЗ),
   `HEAD` = `cb45f2f`; создана ветка `docs/ru-translation`.
2. Для каждого английского `.mdx` создан русский файл с тем же относительным путём.
   Вложенные каталоги `sdk/` и `troubleshooting/` повторены.
3. Переведены `title` и `description` всех страниц, все заголовки, абзацы, списки,
   таблицы, предупреждения, подписи ссылок и `<summary>`.
4. Код, команды, пути, URL, якоря, имена настроек, API и значения оставлены без изменений.
5. В меню добавлен ключ `ru` в каждый `translations`; остальные языки и структура не тронуты.
6. Проведена независимая сверка каждой страницы с оригиналом (шесть отдельных проходов)
   и сквозная унификация терминов и заголовков.
7. Официальный валидатор и собственные проверки пройдены.

## Проведённые проверки

| Проверка | Команда | Результат |
| --- | --- | --- |
| Официальный валидатор | `bun run docs:validate` (из корня репозитория) | `Docs validation passed: 806 pages, 62 sidebar links.` |
| Полнота дерева | сравнение списков EN и RU | EN = 62, RU = 62, пропусков и лишних файлов нет |
| Структура и код | `node check-ru.mjs` (Приложение А) | `checked: 62/62`, `All checks passed.` |
| Заголовки и `title` | `node check-titles.mjs` | 62/62 совпадают с таблицей меню |
| Единообразие заголовков | `node check-headings.mjs` | 460 групп заголовков, вариантов перевода — 0 |
| JSON меню | парсинг `sidebar.config.json` | валиден, 8 секций, 62 пункта, 70 меток `ru` |
| Кодировка и формат | поиск CRLF, табов, хвостовых пробелов | не найдено |
| Ссылки | поиск `](/ru/` | не найдено; цели ссылок совпадают с оригиналом |
| Diff | `git status --short` | изменён только `sidebar.config.json`; остальное — новый каталог `ru/` и отчёт |

Что именно проверяет собственный скрипт по каждой паре файлов:

- одинаковое число и побайтовое совпадение всех ```-блоков кода;
- сохранность инлайн-кода (предупреждение при расхождении);
- совпадение целей всех Markdown-ссылок;
- совпадение последовательности HTML-тегов (включая `<kbd>`, `<details>`, `<summary>`);
- совпадение числа и уровней заголовков;
- совпадение числа строк таблиц;
- непустые `title` и `description`, отличные от английских (исключение — `sdk/host.mdx`,
  где `title: Host API` — имя API);
- отсутствие CRLF;
- доля кириллицы в прозе не ниже 35 % (ошибка) и 55 % (предупреждение);
- строки, похожие на непереведённый английский текст;
- резкое падение числа строк прозы (возможная потеря абзацев).

Финальный прогон прошёл без единого предупреждения.

## Решения по переводу

### Термины

Единый глоссарий применялся во всех 62 файлах; основные решения:

- `session` — сессия, `workspace` — рабочая область, `provider` — провайдер,
  `permission` — разрешение, `agent` — агент, `tunnel` — туннель,
  `sidebar` — боковая панель;
- `worktree` — «рабочее дерево Git (worktree)» при первом упоминании, далее «рабочее дерево»;
- `pull request` — «пул-реквест (PR)», `issue` — «issue» (не переводится);
- `pair / pairing` — «сопряжение / сопрячь», `connect` — «подключение»:
  различие оригинала сохранено, терминология выровнена по всем страницам;
- `skill` — навык, `workflow` — воркфлоу, `lead` — лид, `todo` — todo,
  `relay` — релей, `reverse proxy` — обратный прокси;
- `capability` — «возможность (capability)», `surface` — «поверхность (surface)»,
  `toast` — «всплывающее уведомление (toast)».

### Подписи интерфейса

Названия кнопок, меню и панелей, у которых нет подтверждённой русской локализации
приложения, оставлены английскими: **Settings**, **Add a device**, **Anywhere**,
**Work Status**, **Diff**, **Walkthrough**, **Install**, **Revoke** и т. п.
В прозе они выделены жирным, при первом упоминании иногда пояснены по-русски.
Это осознанное решение: выдумывать русские подписи, которых может не быть в приложении,
опаснее, чем оставить английские.

### Ссылки

Цели всех ссылок сохранены байт-в-байт, префикс `/ru/` не добавлялся — как требует ТЗ.
См. открытый вопрос № 1.

### Заголовки

`title` и H1 каждой страницы совпадают с подписями бокового меню. Пять страниц, где
английский H1 отличается от пункта меню (`/`, `/notes-todos-plans/`, `/git/`, `/github/`,
`/extensions/`), переведены по смыслу оригинала и согласованы между собой.
Сквозные заголовки унифицированы: `## Related` → «См. также» во всех 54 файлах,
`## Keep in mind` → «Что учитывать».

### Ориентир

Украинская версия использовалась только как подсказка по терминам и тону. Она местами
сокращена, устарела или переводит подписи интерфейса (например, `uk/sdk.mdx` заметно
длиннее английского, а `uk/install.mdx` теряет код-блок). Истиной всегда был английский файл.

## Замечания к английскому оригиналу

Не исправлялись — перевод следует оригиналу. Кандидаты на правку в upstream:

1. `security.mdx` — обоснование «There's no environment variable for this…» дословно
   повторено для `opencodeBinary` и `hideBuiltinSkillCatalogs`; переменные
   `OPENCHAMBER_JEV_MODEL` и `OPENCHAMBER_JEV_API_KEY` есть в примере, но не описаны.
2. `sdk/host.mdx` — заголовок «Running with nobody asking» не отражает содержание раздела
   (старт по первому запросу, `keepRunning`, `schedule`); форма `session` в таблице
   заявлена как `{ id, title, busy }`, хотя ниже упомянуты `model` и `agent`.
3. `sdk.mdx` — список `token` / `oauth` / `host: { provider: "linear" }` начинается без
   вводного предложения; абзац про пять видов сервисов занимает ~600 слов;
   «Work Status» и «Work status» пишутся по-разному.
4. `extensions.mdx` — «Work status» против «Work Status» в соседних абзацах.
5. `walkthrough.mdx` — единица разбора называется то `stop`, то `step`
   (при теге `Outdated steps`); в переводе сознательно выбрано «шаг».
6. `install.mdx` — минимальная версия «Node.js 24.14» выглядит сомнительной;
   `themes.mdx` указывает расположение темы только для macOS/Linux, без Windows.
7. `git.mdx` — «Bringing in conflicts» звучит невнятно; придаточное «where the tab opens
   merge requests» грамматически относится ко всем четырём хостингам, хотя merge request
   открывает только GitLab.
8. `integrations.mdx` — «Stop on a dev server or a job ends that command» без подлежащего;
   написание «New Worktree» / «new-worktree dialog» непоследовательно.
9. `project-actions.mdx` — пункт **Add new action** ведёт в **Settings → Projects**, хотя
   по смыслу должен вести в **Project Actions** того же экрана.
10. `usage.mdx` — «on the Usage settings» при пути **Settings → Usage**; в списке
    провайдеров соседствуют `z.ai` и `Zhipu`.
11. `reverse-proxy.mdx` — примеры Nginx расходятся по структуре; обещание «файлы только
    по ссылке, выданной вошедшему» сильнее, чем конфиг с `auth_request off`.
12. `classification-providers.mdx` — существование «Gemini Decision» / «Google's
    Decisions API» по открытым источникам подтвердить не удалось.
13. `magic-prompts.mdx` — промпт Fusion указан в группе Session, хотя запускается
    из мультизапуска; связь кнопки Review с режимом handoff не объяснена.
14. `repository-config.mdx` — текст ссылки «Project Notes, Todos & Plans» не совпадает
    с названием страницы «Notes, Todos & Plans».
15. `permissions.mdx` — ссылка ведёт на `https://opencode.ai/v2/docs/permissions/`;
    актуальность раздела v2 не проверялась.

## Открытые вопросы

1. **Префикс локали в ссылках.** По ТЗ ссылки оставлены как в оригинале, без `/ru/`.
   Но существующие локали единой практики не имеют: `uk`, `es`, `ko`, `nl`, `pl`, `pt-br`,
   `zh-cn` в основном префиксуют ссылки (`/uk/mobile/`), а `de`, `fr`, `ja`, `tr` — нет.
   Если Starlight не подставляет локаль в Markdown-ссылки автоматически, из русских
   страниц переходы будут вести на английские версии. Решать на этапе интеграции
   с `openchamber-website`: либо добавить префиксы одним механическим проходом,
   либо включить локализацию ссылок на уровне сайта.
2. **Локализация интерфейса.** Английские подписи кнопок и меню оставлены намеренно.
   Если в приложении появится подтверждённая русская локализация, подписи нужно будет
   привести к ней отдельной задачей.
3. **Версии и внешние факты.** Node.js 24.14, версии Git-хостингов (Gitea 1.21,
   Forgejo 7.0, Gerrit 3.8), «более 150 сервисов», ссылки на внешнюю документацию
   сверены только с английским текстом, не с первоисточниками.
4. **Язык сайта.** Добавление `ru/` в этот репозиторий само по себе не публикует русский
   язык: нужна правка `locales` в `openchamber-website/apps/docs/astro.config.mjs`.
   Это следующий этап, в текущую работу не входит.
5. **Изображения.** В `content/docs/` нет бинарных изображений, поэтому alt-тексты
   и локализованные скриншоты не затрагивались. При их появлении понадобится отдельный
   проход.
6. **Стилистические мелочи.** В `sessions-in-work.mdx` Jev везде женского рода; `stop`
   в `walkthrough.mdx` передан как «шаг»; `surface` в `sdk.mdx` встречается только
   как идентификатор кода и не переводится. Это решения, а не ошибки.

## Как воспроизвести проверки

```powershell
cd D:\github\openchamber-docs

# один раз: скрипт валидатора лежит вне sparse-набора
git sparse-checkout add scripts/docs

# официальная проверка структуры и маршрутов меню
bun run docs:validate

# собственные проверки (скрипты из Приложения А)
node D:\Temp\sys\opencode\check-ru.mjs
node D:\Temp\sys\opencode\check-titles.mjs
node D:\Temp\sys\opencode\check-headings.mjs
```

Ожидаемый вывод: `Docs validation passed: 806 pages, 62 sidebar links.` и
`All checks passed.` Скрипты берут пути `D:/github/openchamber-docs/...`; при переносе
репозитория поправьте константы `EN` и `RU` в начале файлов.

Проверка полноты без скриптов:

```powershell
$base = 'D:\github\openchamber-docs\packages\docs\content\docs'
$source = @(Get-ChildItem -LiteralPath $base -Recurse -File -Filter '*.mdx' |
  Where-Object { $_.FullName.Substring($base.Length + 1) -notmatch '^(de|es|fr|ja|ko|nl|pl|pt-br|tr|uk|zh-cn|ru)\\' })
$ru = @(Get-ChildItem -LiteralPath (Join-Path $base 'ru') -Recurse -File -Filter '*.mdx')
"English: $($source.Count); Russian: $($ru.Count)"
```

## Как обновлять перевод при изменениях upstream

1. Обновлять английские исходники только осознанно, зафиксировав новый SHA:
   `git fetch origin` и `git rev-parse --short origin/main`. Не делать `git pull`
   в разгар правок и не использовать `git stash` в общем рабочем каталоге.
2. Посмотреть, какие английские страницы изменились:
   `git diff --stat cb45f2f..origin/main -- packages/docs/content/docs`.
3. Для каждой изменённой страницы обновить `ru/<тот же путь>`, а не только
   изменившееся предложение: перечитать вступление и весь раздел, как требует
   `CONTRIBUTING.md` («Update a page after a behaviour change»).
4. Если появилась новая английская страница — сразу создать её русское зеркало:
   валидатор не требует полноты переводов, но `CONTRIBUTING.md` требует.
5. Если изменились пункты меню — обновить `translations.ru` в `sidebar.config.json`,
   не трогая другие языки и `link`.
6. После правок повторить блок «Как воспроизвести проверки» и убедиться,
   что `check-ru.mjs` не показывает предупреждений.
7. Если upstream переименовал путь страницы, переименовать и русский файл,
   иначе появится «лишний» русский файл и пропуск зеркала.

## Приложение А. Скрипт `check-ru.mjs`

Сохраните как `D:\Temp\sys\opencode\check-ru.mjs`.

```js
import fs from "node:fs";
import path from "node:path";

const EN = "D:/github/openchamber-docs/packages/docs/content/docs";
const RU = process.env.RU_DIR || path.join(EN, "ru");
const LOCALES = new Set(["de", "es", "fr", "ja", "ko", "nl", "pl", "pt-br", "tr", "uk", "zh-cn", "ru"]);

function listEnglish() {
  const out = [];
  for (const entry of fs.readdirSync(EN, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (LOCALES.has(entry.name)) continue;
      for (const nested of fs.readdirSync(path.join(EN, entry.name), { withFileTypes: true })) {
        if (nested.isFile() && nested.name.endsWith(".mdx")) out.push(`${entry.name}/${nested.name}`);
      }
    } else if (entry.name.endsWith(".mdx")) {
      out.push(entry.name);
    }
  }
  return out.sort();
}

const CIR = /[\u0400-\u04FF]/;
const LAT = /[A-Za-z]/;
const FENCE = /^\s*```/;

function stripFences(text) {
  const lines = text.split(/\r?\n/);
  const prose = [];
  let inFence = false;
  let fenceCount = 0;
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      fenceCount++;
      continue;
    }
    if (!inFence) prose.push(line);
  }
  if (inFence) return { prose, fenceCount, broken: true };
  return { prose, fenceCount, broken: false };
}

function fencedBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (FENCE.test(line)) {
      if (current === null) current = [line.trim()];
      else {
        blocks.push(current.join("\n"));
        current = null;
      }
      continue;
    }
    if (current !== null) current.push(line);
  }
  return blocks;
}

function stripInline(text) {
  return text
    .replace(/`[^`]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "] ")
    .replace(/<(https?:\/\/[^>]+)>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, " ");
}

function inlineCode(text) {
  return [...text.matchAll(/(`[^`\n]+`)/g)].map((m) => m[1]).sort();
}

function links(text) {
  return [...text.matchAll(/\]\(([^)\s]+)[^)]*\)/g)].map((m) => m[1]).sort();
}

function htmlTags(text) {
  return [...text.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1].toLowerCase()).sort();
}

function headings(text) {
  const { prose } = stripFences(text);
  return prose
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => (line.match(/^#+/)?.[0] ?? "").length);
}

function tableRows(text) {
  const { prose } = stripFences(text);
  return prose.filter((line) => /^\s*\|/.test(line)).length;
}

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2];
  }
  return fields;
}

function latinProseLines(text) {
  const { prose } = stripFences(text);
  const out = [];
  prose.forEach((line, index) => {
    if (/^\s*\|?\s*:?-{2,}/.test(line)) return;
    if (/^\s*<!--/.test(line)) return;
    const clean = stripInline(line).replace(/<[^>]+>/g, " ");
    const words = clean.split(/[^A-Za-zА-Яа-яЁё]+/).filter((w) => w.length > 1);
    if (!words.length) return;
    const latin = words.filter((w) => LAT.test(w)).length;
    const cyr = words.filter((w) => CIR.test(w)).length;
    if (latin >= 5 && cyr === 0) out.push(`${index + 1}: ${line.trim().slice(0, 110)}`);
  });
  return out;
}

function cyrillicShare(text) {
  const { prose } = stripFences(text);
  let lat = 0;
  let cyr = 0;
  for (const line of prose) {
    const clean = stripInline(line).replace(/<[^>]+>/g, " ");
    for (const ch of clean) {
      if (CIR.test(ch)) cyr++;
      else if (LAT.test(ch)) lat++;
    }
  }
  return cyr + lat === 0 ? 1 : cyr / (cyr + lat);
}

const args = process.argv.slice(2);
const enFiles = args.length ? args : listEnglish();
const errors = [];
const warnings = [];
let checked = 0;

for (const rel of enFiles) {
  const enPath = path.join(EN, rel);
  const ruPath = path.join(RU, rel);
  if (!fs.existsSync(enPath)) {
    errors.push(`${rel}: no English source`);
    continue;
  }
  if (!fs.existsSync(ruPath)) {
    errors.push(`${rel}: missing Russian file`);
    continue;
  }
  checked++;
  const en = fs.readFileSync(enPath, "utf8");
  const ru = fs.readFileSync(ruPath, "utf8");

  if (ru.includes("\r")) errors.push(`${rel}: CRLF line endings (validator needs LF)`);

  const enFm = frontmatter(en);
  const ruFm = frontmatter(ru);
  if (!ruFm) {
    errors.push(`${rel}: no frontmatter`);
  } else {
    for (const key of ["title", "description"]) {
      if (!ruFm[key] || !ruFm[key].trim()) errors.push(`${rel}: empty ${key}`);
      const allowedSame = key === "title" && rel === "sdk/host.mdx";
      if (ruFm[key] === enFm?.[key] && !allowedSame) errors.push(`${rel}: ${key} left in English`);
    }
  }

  const enStripped = stripFences(en);
  const ruStripped = stripFences(ru);
  if (ruStripped.broken) errors.push(`${rel}: unbalanced code fence`);
  if (enStripped.fenceCount !== ruStripped.fenceCount) {
    errors.push(`${rel}: fence count ${enStripped.fenceCount} -> ${ruStripped.fenceCount}`);
  }

  const enBlocks = fencedBlocks(en);
  const ruBlocks = fencedBlocks(ru);
  const blockCount = Math.min(enBlocks.length, ruBlocks.length);
  for (let i = 0; i < blockCount; i++) {
    if (enBlocks[i] !== ruBlocks[i]) {
      errors.push(`${rel}: code block #${i + 1} differs`);
      break;
    }
  }

  const enInline = inlineCode(en);
  const ruInline = inlineCode(ru);
  const missingInline = enInline.filter((token) => !ruInline.includes(token));
  if (missingInline.length) {
    warnings.push(`${rel}: inline code missing/changed: ${missingInline.slice(0, 4).join(" ")}`);
  }

  const enLinks = links(en);
  const ruLinks = links(ru);
  const linkDiff = enLinks.filter((link) => !ruLinks.includes(link));
  const extraLinks = ruLinks.filter((link) => !enLinks.includes(link));
  if (linkDiff.length || extraLinks.length) {
    errors.push(`${rel}: link targets differ (missing ${JSON.stringify(linkDiff.slice(0, 3))}, extra ${JSON.stringify(extraLinks.slice(0, 3))})`);
  }

  const enTags = htmlTags(en);
  const ruTags = htmlTags(ru);
  if (enTags.join(",") !== ruTags.join(",")) errors.push(`${rel}: HTML tag sequence differs`);

  const enHeadings = headings(en);
  const ruHeadings = headings(ru);
  if (enHeadings.join(",") !== ruHeadings.join(",")) errors.push(`${rel}: heading structure differs`);

  const enRows = tableRows(en);
  const ruRows = tableRows(ru);
  if (enRows !== ruRows) errors.push(`${rel}: table rows ${enRows} -> ${ruRows}`);

  const proseLines = (lines) =>
    lines.filter((line) => line.trim() && !/^#{1,6}\s/.test(line) && !/^\s*\|?\s*:?-{2,}/.test(line) && !/^\s*(import|export)\s/.test(line)).length;
  const enProseCount = proseLines(enStripped.prose);
  const ruProseCount = proseLines(ruStripped.prose);
  if (enProseCount >= 8 && ruProseCount < enProseCount * 0.75) {
    warnings.push(`${rel}: prose lines ${enProseCount} -> ${ruProseCount} (possible dropped content)`);
  }

  const share = cyrillicShare(ru);
  if (share < 0.35) errors.push(`${rel}: only ${(share * 100).toFixed(1)}% Cyrillic letters in prose`);
  else if (share < 0.55) warnings.push(`${rel}: low Cyrillic share ${(share * 100).toFixed(1)}%`);

  for (const line of latinProseLines(ru).slice(0, 3)) {
    warnings.push(`${rel}: possible untranslated line ${line}`);
  }
}

console.log(`checked: ${checked}/${enFiles.length}`);
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log("  - " + w);
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("\nAll checks passed.");
```

## Приложение Б. Скрипт `check-titles.mjs`

Сохраните как `D:\Temp\sys\opencode\check-titles.mjs`. Он строит ожидаемые заголовки
из `sidebar.config.json` (с пятью исключениями для страниц, где H1 отличается от пункта
меню) и сверяет с ними `title` и H1 русских страниц.

```js
import fs from "node:fs";
import path from "node:path";

const docs = "D:/github/openchamber-docs/packages/docs";
const sidebar = JSON.parse(fs.readFileSync(path.join(docs, "sidebar.config.json"), "utf8"));

// Page titles that intentionally differ from the sidebar item label.
const overrides = {
  "/": "Документация OpenChamber",
  "/notes-todos-plans/": "Заметки, todo и планы проекта",
  "/git/": "Работа с Git",
  "/github/": "Git-хостинги: issue и пул-реквесты",
  "/extensions/": "Расширения",
};

const expected = [];
for (const section of sidebar.sections) {
  for (const item of section.items ?? []) {
    const link = item.link;
    let rel;
    if (link === "/") rel = "index.mdx";
    else if (link.endsWith("/")) rel = link.slice(1, -1) + ".mdx";
    else rel = link.slice(1) + ".mdx";
    expected.push({ rel, title: overrides[link] ?? item.translations.ru });
  }
}

const problems = [];
for (const { rel, title } of expected) {
  const file = path.join(docs, "content", "docs", "ru", rel);
  if (!fs.existsSync(file)) {
    problems.push(`${rel}: missing`);
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const fmTitle = /^---\r?\n[\s\S]*?^title:\s*"?([^"\n]+?)"?\s*$/m.exec(text)?.[1]?.trim();
  const h1 = /^#\s+(.+)$/m.exec(text)?.[1]?.trim();
  if (fmTitle !== title) problems.push(`${rel}: frontmatter "${fmTitle}" != "${title}"`);
  if (h1 !== title) problems.push(`${rel}: H1 "${h1}" != "${title}"`);
}

console.log(`checked titles: ${expected.length}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("All titles and H1 match the navigation table.");
```

## Приложение В. Скрипт `check-headings.mjs`

Сохраните как `D:\Temp\sys\opencode\check-headings.mjs`. Он находит заголовки, которые
в разных страницах переведены по-разному.

```js
import fs from "node:fs";
import path from "node:path";

const EN = "D:/github/openchamber-docs/packages/docs/content/docs";
const RU = path.join(EN, "ru");
const LOCALES = new Set(["de", "es", "fr", "ja", "ko", "nl", "pl", "pt-br", "tr", "uk", "zh-cn", "ru"]);

const files = [];
for (const entry of fs.readdirSync(EN, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (LOCALES.has(entry.name)) continue;
    for (const nested of fs.readdirSync(path.join(EN, entry.name))) {
      if (nested.endsWith(".mdx")) files.push(`${entry.name}/${nested}`);
    }
  } else if (entry.name.endsWith(".mdx")) files.push(entry.name);
}

function headings(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2] });
  }
  return out;
}

const groups = new Map();
for (const rel of files) {
  const en = headings(fs.readFileSync(path.join(EN, rel), "utf8"));
  const ruPath = path.join(RU, rel);
  if (!fs.existsSync(ruPath)) continue;
  const ru = headings(fs.readFileSync(ruPath, "utf8"));
  if (en.length !== ru.length) continue;
  en.forEach((h, i) => {
    const key = `${h.level}|${h.text}`;
    if (!groups.has(key)) groups.set(key, new Map());
    const variants = groups.get(key);
    const t = ru[i].text;
    if (!variants.has(t)) variants.set(t, []);
    variants.get(t).push(rel);
  });
}

const drift = [...groups.entries()]
  .filter(([, variants]) => variants.size > 1)
  .map(([key, variants]) => ({ key, variants: [...variants.entries()].sort((a, b) => b[1].length - a[1].length) }))
  .sort((a, b) => b.variants.length - a.variants.length);

console.log(`heading groups: ${groups.size}, with variants: ${drift.length}`);
for (const d of drift.slice(0, 40)) {
  console.log(`\n${d.key}`);
  for (const [text, list] of d.variants) console.log(`   ${list.length}x  ${text}   [${list.slice(0, 3).join(", ")}${list.length > 3 ? ", …" : ""}]`);
}
```

## Приложение Г. Перечень созданных файлов

Все пути — относительно `packages/docs/content/docs`; русские файлы лежат под `ru/`.

```text
agent-control-tool.mdx
agent-pages.mdx
auto-model-routing.mdx
chat-input.mdx
chats.mdx
classification-providers.mdx
connect-devices.mdx
context.mdx
desktop-browser.mdx
desktop-tunnels.mdx
environment.mdx
extensions.mdx
git-identities.mdx
git.mdx
github.mdx
index.mdx
install.mdx
integrations.mdx
issues-and-prs.mdx
leads.mdx
magic-prompts.mdx
mcp.mdx
mobile.mdx
multi-run.mdx
notes-todos-plans.mdx
notifications.mdx
opencode-server.mdx
permissions.mdx
preview.mdx
private-relay.mdx
project-actions.mdx
project-icons.mdx
projects.mdx
providers.mdx
quickstart.mdx
remote-instances.mdx
repository-config.mdx
reverse-proxy.mdx
scheduled-tasks.mdx
sdk.mdx
sdk/example.mdx
sdk/host.mdx
sdk/ui.mdx
security.mdx
session-goals.mdx
sessions-in-work.mdx
sidebar.mdx
skills-catalog.mdx
skills.mdx
ssh-hosts-proxying.mdx
themes.mdx
troubleshooting.mdx
troubleshooting/opencode-connection.mdx
troubleshooting/remote-access.mdx
troubleshooting/worktrees-git.mdx
tunnels.mdx
updates.mdx
usage.mdx
voice.mdx
walkthrough.mdx
workflows.mdx
worktrees.mdx
```
