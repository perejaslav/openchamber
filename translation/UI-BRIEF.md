# Translation brief — locale `ru` for OpenChamber

You are translating UI strings of **OpenChamber** (an Electron/VS Code desktop UI for the
`opencode` coding agent) from English into **Russian**.

The product is a developer tool. The audience is Russian-speaking software engineers.
Tone: concise, professional, neutral. Same register as the existing `uk` (Ukrainian) locale.

---

## 1. Hard output rules (a violation breaks the build)

1. **Translate only the string value.** The line shape is
   `<indent><key>: <value>,` — the key, the colon, the comma, the indentation and the quote
   characters must stay **byte-identical**. Never rename, reorder, add or drop a line.
2. **Keep the original quote characters.** If the source value is wrapped in `'`, wrap the
   translation in `'`. If it is wrapped in `"`, wrap it in `"`. Do not switch.
3. **Never use a bare ASCII apostrophe inside a single-quoted value.** Use `’` (U+2019) or
   guillemets `«»` instead. If an ASCII `'` is truly unavoidable, escape it as `\'`.
   Same for `"` inside a double-quoted value: escape as `\"`.
4. **Placeholders are sacred.** `{name}`, `{count}`, `{path}`, `{version}`, `{error}`,
   `{input}`, `{output}`, `{reasoning}`, `{model}`, `{index}`, `{patterns}` … must survive
   exactly, with the same spelling and the same number of occurrences. Their position inside
   the sentence may move — Russian word order differs.
5. **Keep `\n` escape sequences** and any leading/trailing spaces exactly where the source has them.
6. **Keep the ellipsis character `…`** (not `...`) wherever the source uses `…`.
7. Lines that are blank or start with `...` (spread operators) are **not translated** —
   copy them through untouched.
8. Output **only** the translated block. No markdown fences, no commentary, no explanations.

## 2. Never translate (keep verbatim, Latin script)

Product & protocol names: `OpenChamber`, `OpenCode`, `GitHub`, `Jev`, `TypeSafe`, `Zen`,
`Open VSX`, `VS Code`, `MCP`, `SSE`, `WebSocket`, `API`, `OAuth`, `OIDC`, `JSON`, `YAML`,
`URL`, `CLI`, `SDK`, `TTFT`, `HTTP`, `HTTPS`, `SSH`, `Git`.

Also verbatim: model and provider names (`Claude`, `GPT`, `Gemini`, `Anthropic`, …),
file paths, shell commands, environment variables, code identifiers, user-generated content,
and literal values that are pure symbols or numbers (`✓`, `—`, `%`, `2026-07-28`).

A value that is only a product name, a path, a command, a URL or a symbol stays **as is**
(that is not an "English stub" — it is correct).

## 3. Glossary — follow it in every file

| English | Russian | Note |
|---|---|---|
| Agent | Агент | |
| Subagent | Субагент | |
| Provider | Провайдер | |
| Model | Модель | |
| Small Model | Малая модель | |
| Session | Сессия | |
| Chat | Чат | |
| Message | Сообщение | |
| Prompt | Промпт | NB: a *permission* request is «запрос разрешения» — different word |
| Turn | Ход | "completed turns" → «завершённые ходы» |
| Run | Запуск | |
| Skill | Навык | |
| Tool | Инструмент | |
| Tool call | Вызов инструмента | |
| Permission | Разрешение | |
| Workspace | Рабочая область | |
| Project | Проект | |
| Repository | Репозиторий | |
| Branch | Ветка | |
| Commit | Коммит | |
| Stash | Стэш | |
| Worktree | Worktree | keep Latin, it is a git term |
| Merge | Слияние | |
| Rebase | Rebase | keep Latin |
| Pull request | Pull request | keep Latin |
| Diff | Дифф | |
| Changes | Изменения | |
| Checkpoint | Контрольная точка | |
| Snapshot | Снимок | |
| Rollback | Откат | |
| Artifact | Артефакт | |
| Attachment | Вложение | |
| Isolated space | Изолированное пространство | |
| Safety net | Предохранитель | the Jev guard feature |
| Routing | Маршрутизация | |
| Classification | Классификация | |
| Telemetry | Телеметрия | |
| Cache hit | Попадание в кэш | |
| Cost | Стоимость | |
| Tokens | Токены | |
| Reasoning | Рассуждения | |
| Thinking level | Уровень размышлений | |
| Compaction | Сжатие контекста | |
| Context window | Окно контекста | |
| Streaming | Потоковая передача | |
| Settings | Настройки | |
| Appearance | Оформление | |
| Theme | Тема | |
| Extension | Расширение | |
| Plugin | Плагин | |
| Marketplace | Магазин | |
| Usage | Использование | |
| Onboarding | Первый запуск | |
| Walkthrough | Обзорный тур | |
| Guest integration | Гостевая интеграция | |
| Third-party | Сторонний | |
| MCP server | MCP-сервер | |
| Quota | Квота | |
| Terminal | Терминал | |
| File | Файл | |
| Folder / Directory | Папка | |
| Command palette | Палитра команд | |
| Keyboard shortcuts | Горячие клавиши | |
| Sidebar | Боковая панель | |
| Header | Верхняя панель | |
| Sign in / Sign out | Войти / Выйти | |
| API key | API-ключ | |
| Environment variable | Переменная окружения | |
| Enable / Disable | Включить / Отключить | |
| Copy | Копировать | |
| Retry | Повторить | |
| Dismiss | Закрыть | |
| Delete | Удалить | |
| Cancel | Отмена | |
| Save | Сохранить | |
| Close | Закрыть | |
| Search | Поиск | |
| Loading | Загрузка | |
| Failed | Не удалось | prefer «Не удалось …» over «Ошибка» where a verb fits |

## 4. Style

- Sentence case for descriptions; capitalise the first letter of buttons, labels and titles
  («Сохранить», «Отмена», «Новая сессия»).
- Use `ё` consistently (всё, ещё, подключён, завершён).
- Use `«…»` for quotation marks, `—` (em dash) for dashes.
- Mirror the source punctuation: a trailing period stays a trailing period, a trailing `?`
  stays `?`. Exception: a one-word button label has no period in either language.
- Prefer active, imperative phrasing for actions («Открыть чат», not «Чат может быть открыт»).
- Keep it short — these strings sit in buttons, tooltips and narrow panels.
- **Never leave the English text as the value.** If a string is genuinely untranslatable
  (pure product name / path / command), keep it and it is correct. Anything else must be
  real Russian.

## 5. Reference

The Ukrainian locale (`uk.ts`, `uk.settings.ts`, `*.i18n.ts` → `uk` blocks) is the closest
sibling. Match its level of detail and its terminology where the languages agree
(uk «скіл» = ru «Навык», uk «сабагент» = ru «Субагент», uk «дозвіл» = ru «Разрешение»).

## 6. Examples

```
  'layout.mainTab.chat': 'Chat',                    →  'layout.mainTab.chat': 'Чат',
  'common.cancel': 'Cancel',                        →  'common.cancel': 'Отмена',
  'chat.workStatus.section.session': 'Session',     →  'chat.workStatus.section.session': 'Сессия',
  'toast.language.changed': 'Language changed to {language}',
                                                    →  'toast.language.changed': 'Язык изменён на {language}',
  'sessions.aiRename.checking': 'Checking completed turns...',
                                                    →  'sessions.aiRename.checking': 'Проверка завершённых ходов...',
  'sessions.scheduledTasks.dialog.lastRun.never': 'never',
                                                    →  'sessions.scheduledTasks.dialog.lastRun.never': 'никогда',
  'x.y': 'OpenCode is bundled with OpenChamber. Update OpenChamber to get OpenCode v2.',
                                                    →  'x.y': 'OpenCode входит в состав OpenChamber. Обновите OpenChamber, чтобы получить OpenCode v2.',
```

## 7. Special constraint — telemetry rows

For keys `chat.workStatus.telemetry.<metric>` (label) the value must be **≤ 16 characters**.
For `chat.workStatus.telemetry.<metric>Description` it must be **> 30 characters** and must
differ from the English text. Metrics: `responseSpeed`, `speed`, `llmDuration`, `toolDuration`,
`ttft`, `steps`, `tokens`, `cacheHit`, `cost`.

Also `chat.workStatus.telemetry.tokens.inOut` must contain `{input}` and `{output}`, and
`chat.workStatus.telemetry.tokensDescription` must contain `{input}`, `{output}` and `{reasoning}`.
