# Русский форк OpenChamber

Это личный форк [openchamber/openchamber](https://github.com/openchamber/openchamber)
с русской локализацией интерфейса и документации. Всё остальное — оригинальный проект,
и он продолжает развиваться независимо.

Этот файл описывает, как устроен форк и как его сопровождать.

---

## Что переведено

| Что | Где | Объём |
|---|---|---|
| Интерфейс приложения | `packages/ui/src/lib/i18n/messages/` | 6628 ключей, 48 файлов |
| Сайт документации | `packages/docs/content/docs/ru/` | 57 страниц |
| Боковое меню документации | `packages/docs/sidebar.config.json` | 65 подписей |
| Пользовательские доки репозитория | `README.md`, `docs/CUSTOM_THEMES.md`, `SECURITY.md` | 3 файла |

**Что намеренно не переведено:** `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`,
`changelog/`, внутренние `DOCUMENTATION.md` внутри исходников, `.agents/skills/`,
`.opencode/`. Это материалы для тех, кто меняет код самого OpenChamber, а не для
пользователя. `AGENTS.md` к тому же прямо требует, чтобы документация проекта была
на английском.

---

## Ветки

| Ветка | Что в ней | Назначение |
|---|---|---|
| `main` | чистое зеркало `upstream/main` | синхронизация с оригиналом, ничего своего |
| `feat/ru-locale` | только локализация интерфейса | источник pull request №1 в апстрим |
| `feat/ru-docs` | только локализация сайта документации | источник pull request №2 в апстрим |
| `ru` | **всё вместе** + `README.md` и доки на русском + этот файл | рабочая ветка для сборки и установки |

Правило простое: `feat/*` держим в виде, пригодном для мержа в апстрим — никаких
личных файлов. Всё личное живёт только в `ru`.

`main` никогда не трогаем своими коммитами, иначе `git merge --ff-only` перестанет
работать и синхронизация превратится в ручное разрешение конфликтов.

### Remote

```
origin    https://github.com/perejaslav/openchamber.git      # ваш форк
upstream  https://github.com/openchamber/openchamber.git     # оригинал
```

---

## Обновление до новой версии апстрима

```bash
cd openchamber

# 1. Подтянуть оригинал
git fetch upstream

# 2. Обновить зеркало (только fast-forward)
git checkout main
git merge --ff-only upstream/main
git push origin main

# 3. Перенести свои ветки на новую основу
git checkout feat/ru-locale
git rebase main

git checkout feat/ru-docs
git rebase main

# 4. Собрать личную ветку заново
git checkout ru
git merge feat/ru-locale feat/ru-docs
```

### Конфликты в документации

При обновлении `ru` конфликты возможны только в трёх файлах: `README.md`,
`docs/CUSTOM_THEMES.md`, `SECURITY.md` — потому что они переведены **на месте**.
Правильная сторона — ваша:

```bash
git checkout ru
git merge upstream/main
# при конфликте в перечисленных файлах:
git checkout --ours README.md docs/CUSTOM_THEMES.md SECURITY.md
git add README.md docs/CUSTOM_THEMES.md SECURITY.md
git commit
```

Если апстрим **добавил новый раздел** в README, `--ours` его потеряет. Поэтому после
такого мержа стоит заглянуть в диф:

```bash
git diff upstream/main -- README.md | head -50
```

и дописать перевод нового раздела руками.

### Конфликты в локали

В `packages/ui/src/lib/i18n/` конфликты будут почти наверняка: апстрим добавляет новые
ключи. Типичный случай — новый ключ есть в `en.ts`, но отсутствует в `ru.ts`, и тест
паритета падает с сообщением вида:

```
all locales stay in key parity with english
```

Что делать: найти новые ключи и доперевести.

```bash
# ключи, которые есть в en, но отсутствуют в ru
cd packages/ui/src/lib/i18n/messages
comm -23 <(grep -oE "^  '?[^']+'?:" en.ts | sed "s/[: ]//g;s/'//g" | sort -u) \
         <(grep -oE "^  '?[^']+'?:" ru.ts | sed "s/[: ]//g;s/'//g" | sort -u)
```

Правила перевода и глоссарий лежат в репозитории:

- `translation/UI-BRIEF.md` — интерфейс приложения;
- `translation/DOCS-BRIEF.md` — сайт документации.

Глоссарий общий и обязательный: интерфейс и документация должны использовать одни и те
же слова. Перед тем как допереводить что-то новое, прочитайте нужный бриф — там же
описано, что переводить нельзя.

---

## Сборка и установка русской версии

Приложение для десктопа берёт интерфейс из папки `resources/web-dist` установленной
копии. Чтобы увидеть русскую версию, её нужно собрать из этой ветки и подменить.

```bash
cd openchamber
bun install
bun run --cwd packages/electron build:web-assets     # ~1.5 минуты
```

Готовый интерфейс окажется в `packages/electron/resources/web-dist`.

Дальше — скрипт `scripts/ru/install-desktop-locale.ps1`:

```powershell
# Закрыть OpenChamber, затем:
& ".\scripts\ru\install-desktop-locale.ps1" status    # что сейчас установлено
& ".\scripts\ru\install-desktop-locale.ps1" apply     # подменить (делает бэкап)
& ".\scripts\ru\install-desktop-locale.ps1" revert    # вернуть оригинал
```

Скрипт **не удаляет файлы** — только перезаписывает, потому что окружение блокирует
массовое удаление. Бэкап оригинала лежит рядом с `web-dist` в `web-dist.orig`.

### Про обновления приложения

Обновление OpenChamber **затрёт русский язык**: установщик заменит `web-dist` официальной
сборкой. Само по себе это не случится — в приложении `autoDownload = false` и
`autoInstallOnAppQuit = false`, обновление ставится только вручную.

После каждого обновления:

```bash
git checkout ru
git merge upstream/main      # разрешить конфликты как описано выше
bun install
bun run --cwd packages/electron build:web-assets
```

и снова `apply`. Скрипт сам скажет `STATE: STALE`, если маркер патча пережил обновление,
а интерфейс уже откатился.

---

## Проверка перед коммитом

```bash
bun test packages/ui/src/lib/i18n      # паритет ключей и качество перевода
bun run docs:validate                  # структура сайта документации
bun run type-check
bun run lint
```

---

## Статус pull request'ов в апстрим

Правила проекта (`CONTRIBUTING.md`) требуют **сначала обсуждение в Ideas, потом PR**:
без явного согласия мейнтейнера pull request не рассматривают. Поэтому оба PR открыты
как **draft** и ждут ответа.

| | Ссылка | Состояние |
|---|---|---|
| Обсуждение | [discussions/4122](https://github.com/openchamber/openchamber/discussions/4122) | открыто, ждёт ответа мейнтейнера |
| Локализация интерфейса | [pull/4123](https://github.com/openchamber/openchamber/pull/4123) | draft, +6765/−16, 50 файлов |
| Локализация документации | [pull/4124](https://github.com/openchamber/openchamber/pull/4124) | draft, +4039/−65, 58 файлов |

### Что делать дальше

1. **Если мейнтейнер ответит «да»** — снять с обоих PR статус draft:
   ```bash
   gh pr ready 4123 --repo openchamber/openchamber
   gh pr ready 4124 --repo openchamber/openchamber
   ```
2. **Если попросят правки** — править в `feat/ru-locale` или `feat/ru-docs` (не в `ru`),
   потому что PR обновляется из этих веток.
3. **Если откажут** — ничего не делать: форк уже рабочий, ветка `ru` самодостаточна.
   Обновлять её по мере выхода новых версий апстрима, как описано выше.
4. **Если PR примут** — можно вернуться на чистый апстрим: русский язык появится
   в официальных релизах, и подмена `web-dist` больше не понадобится. Ветку `ru` тогда
   стоит оставить только ради русского README.

Локализация интерфейса по правилам проекта считается `size:XS`: каталоги переводов
не идут в подсчёт размера PR, сколько бы строк в них ни было.
