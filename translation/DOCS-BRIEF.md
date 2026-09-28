# Docs translation brief — locale `ru` for the OpenChamber docs site

You are translating the **OpenChamber documentation site** from English into Russian.
OpenChamber is an open-source workspace for running and reviewing AI coding work on
desktop, web, VS Code and mobile.

The audience is a **non-technical reader trying to get something done** — not an engineer
reading a spec. That tone is set by the project itself in `packages/docs/CONTRIBUTING.md`
and must survive translation.

`packages/docs/content/docs/uk/` is the closest sibling translation. Read the matching
Ukrainian file when a sentence is ambiguous — it shows the intended level of plainness.

---

## 1. Hard output rules

1. Output the **whole translated file**, frontmatter included. Nothing else — no markdown
   fence around the file, no commentary, no "here is the translation".
2. **Do not change the structure.** Same headings, same order, same number of list items,
   same blank lines. Only human-readable text changes.
3. **Code blocks are untouchable.** Anything inside ``` ``` ``` fenced blocks stays
   byte-identical, including comments, comments inside commands, and example values.
4. **Inline code stays as-is**: `` `openchamber` ``, `` `--ui-password` ``, `` `~/.config` ``.
   Never translate or reformat what is inside backticks.
5. **Links keep their target.** `[Install](/install/)` — the path `/install/` is identical in
   every locale; only the link **text** is translated.
6. **Images keep their path.** `![alt](./images/desktop.png)` — translate only the `alt` text.
   Never translate a filename.
7. **MDX and JSX stay valid.** `import { Image } from "astro:assets";`, `<Image src={x} alt="…" />`,
   `<details>`, `<summary>`, admonitions like `> [!IMPORTANT]` and `> [!NOTE]` — keep the
   syntax exactly; translate only the visible words (`alt` text, `<summary>` text).
8. **Frontmatter `title` and `description` must be translated.** Validation fails if either is
   missing, and leaving them English is a defect.
9. Keep `…` as one character, keep `—` as an em dash, keep the trailing punctuation of a
   sentence. Russian uses `«…»` for quotes.
10. Use `ё` consistently (всё, ещё, подключён).

## 2. Never translate

Product and brand nouns, verbatim and in Latin script:
`OpenChamber`, `OpenCode`, `VS Code`, `PWA`, `GitHub`, `Discord`, `macOS`, `Windows`,
`Linux`, `iOS`, `Android`, `MCP`, `SSE`, `API`, `CLI`, `SSH`, `JWT`, `OAuth`, `JSON`,
`YAML`, `WebSocket`, `Cloudflare`, `Ngrok`, `Open VSX`, `Astro`, `Starlight`, `SDK`,
`TypeScript`, `Node.js`, `Bun`, `AppImage`, `FUSE`, `VSIX`.

Also verbatim: shell commands, flags, file paths, config keys, environment variables,
model and provider names, URL fragments, and the page filename.

## 3. Glossary — the same one the app UI uses

The documentation and the application interface must use one vocabulary. Follow this table
in every file.

| English | Russian |
|---|---|
| Agent | Агент |
| Subagent | Субагент |
| Provider | Провайдер |
| Model | Модель |
| Session | Сессия |
| Chat | Чат |
| Message | Сообщение |
| Prompt | Промпт |
| Turn | Ход |
| Run | Запуск |
| Skill | Навык |
| Tool | Инструмент |
| Permission | Разрешение |
| Workspace | Рабочая область |
| Project | Проект |
| Repository | Репозиторий |
| Branch | Ветка |
| Commit | Коммит |
| Stash | Стэш |
| Worktree | Worktree |
| Merge | Слияние |
| Rebase | Rebase |
| Pull request | Pull request |
| Diff | Дифф |
| Changes | Изменения |
| Checkpoint | Контрольная точка |
| Snapshot | Снимок |
| Rollback | Откат |
| Artifact | Артефакт |
| Attachment | Вложение |
| Isolated space | Изолированное пространство |
| Safety net | Предохранитель |
| Routing | Маршрутизация |
| Classification | Классификация |
| Telemetry | Телеметрия |
| Cache hit | Попадание в кэш |
| Cost | Стоимость |
| Tokens | Токены |
| Reasoning | Рассуждения |
| Thinking level | Уровень размышлений |
| Compaction | Сжатие контекста |
| Context window | Окно контекста |
| Streaming | Потоковая передача |
| Settings | Настройки |
| Appearance | Оформление |
| Theme | Тема |
| Extension | Расширение |
| Plugin | Плагин |
| Marketplace | Магазин |
| Usage | Использование |
| Quickstart | Быстрый старт |
| Walkthrough | Обзорный тур |
| Tunnel | Туннель |
| Private Relay | Private Relay |
| Session Goals | Session Goals |
| Multi-run | Multi-run |
| Fusion | Fusion |
| Preview | Preview |
| Terminal | Терминал |
| File | Файл |
| Folder / Directory | Папка |
| Command palette | Палитра команд |
| Keyboard shortcuts | Горячие клавиши |
| Sidebar | Боковая панель |
| Sign in / Sign out | Войти / Выйти |
| API key | API-ключ |
| Environment variable | Переменная окружения |
| Enable / Disable | Включить / Отключить |
| Troubleshooting | Устранение неполадок |

Feature names that are product nouns (`Session Goals`, `Multi-run`, `Fusion`,
`Private Relay`, `Preview`, `Changes Walkthrough`) stay Latin — they are the names of
things in the interface, and the interface keeps them Latin too. When one of them is used
as an ordinary common noun in a sentence, translate it normally.

## 4. Style

- Lead with the task, not with background. Keep the reader's first line useful.
- Second person, active voice: «Откройте», «Выберите», «Запустите».
- Prefer common words over internal ones: «приложение» beats «поверхность»,
  «версия» beats «инстанс» where the meaning allows.
- Explain a term the first time it appears, in parentheses, in everyday words.
- Do not add or remove sentences. Translate what is there — no embellishment, no trimming.
- Keep list style consistent inside one list: either all short fragments (lowercase, no
  period) or all full sentences (capital letter, period). Mirror the English list's choice.
- Numbers and units keep their formatting (`up to five models` → «до пяти моделей»).

## 5. Examples

Frontmatter:
```mdx
---
title: Install
description: Install OpenChamber for desktop, web, or VS Code.
---
```
→
```mdx
---
title: Установка
description: Установите OpenChamber для десктопа, веба или VS Code.
---
```

Prose with an untouched code block and link:
```mdx
Open the URL the CLI prints (usually `http://localhost:3000`). You should see the
OpenChamber session list. To keep it handy, use your browser's "Install" option.
```
→
```mdx
Откройте URL, который выводит CLI (обычно `http://localhost:3000`). Вы должны увидеть
список сессий OpenChamber. Чтобы держать его под рукой, используйте пункт «Установить»
в адресной строке браузера.
```

Admonition and JSX:
```mdx
> [!IMPORTANT]
> The content folder uses the lowercase locale key.

<Image src={desktopLight} alt="Desktop app" class="oc-light-only" />
```
→
```mdx
> [!IMPORTANT]
> Папка с контентом использует ключ локали в нижнем регистре.

<Image src={desktopLight} alt="Десктопное приложение" class="oc-light-only" />
```
