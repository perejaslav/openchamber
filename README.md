# <picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/badges/openchamber-logo-dark.svg"><img src="docs/references/badges/openchamber-logo-light.svg" width="32" height="32" align="absmiddle" /></picture> OpenChamber

> **Русская версия.** Это личный форк [openchamber/openchamber](https://github.com/openchamber/openchamber)
> с русской локализацией интерфейса и документации. Русский язык здесь включён **по умолчанию**.
> Всё остальное — оригинальный проект.
> Оригинальный README на английском: [`git show upstream/main:README.md`](https://github.com/openchamber/openchamber/blob/main/README.md).
> Готовые сборки — в [Releases](https://github.com/perejaslav/openchamber/releases);
> как обновляться и собирать — см. [FORK.md](FORK.md).

[![GitHub stars](https://img.shields.io/github/stars/openchamber/openchamber?style=flat&labelColor=100F0F&color=66800B)](https://github.com/openchamber/openchamber/stargazers)
[![GitHub release](https://img.shields.io/github/v/release/perejaslav/openchamber?style=flat&labelColor=100F0F&color=205EA6)](https://github.com/perejaslav/openchamber/releases/latest)
[![Discord](https://img.shields.io/badge/Discord-join.svg?style=flat&labelColor=100F0F&color=8B7EC8&logo=discord&logoColor=FFFCF0)](https://discord.gg/ZYRSdnwwKA)
[![Support the project](https://img.shields.io/badge/Support-Project-black?style=flat&labelColor=100F0F&color=EC8B49&logo=patreon&logoColor=FFFCF0)](https://www.patreon.com/openchamber)

<a href="https://www.blacksmith.sh/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/badges/blacksmith-dark.svg"><img src="docs/references/badges/blacksmith-light.svg" height="28" alt="CI на базе Blacksmith" /></picture></a>

## Запускайте работу агентов. Держите всё под контролем. Выпускайте откуда угодно.

**OpenChamber — это рабочая область с открытым исходным кодом для запуска и проверки работы AI-агентов на десктопе, в вебе, VS Code и на мобильных.**

Запустите работу агента, посмотрите, что изменилось, и проведите её через ревью и выпуск. Ваши проекты и сессии остаются доступны, когда вы меняете устройство или отходите от дел.

![OpenChamber Chat](docs/references/chat_example.png)

<details>
<summary>Больше скриншотов</summary>

![VS Code Extension](packages/vscode/extension.jpg)

<p>
<img src="docs/references/pwa_chat_example.png" width="45%" alt="Чат OpenChamber PWA">
<img src="docs/references/pwa_diff_example.png" width="45%" alt="Просмотр диффов OpenChamber PWA">
</p>

</details>

## Что можно делать в OpenChamber

### Цели, которые продолжаются сами

Задайте сессии финишную прямую с помощью **Цели сессии**. OpenChamber проверяет результат после каждого хода и держит агента в работе, пока тот не завершит цель, не упрётся в блокировку или не достигнет заданного вами лимита. Работа может продолжаться и после того, как вы закроете приложение.

### Сравнивайте и объединяйте запуски

Используйте **Multi-run**, чтобы отдать одну и ту же задачу до пяти моделям — каждая в своей сессии и, при желании, в своём worktree. Посмотрите, что на самом деле построила каждая, выберите лучший результат или примените **Объединение**, чтобы собрать самые сильные части в новую сессию.

### Обзорные туры по изменениям

**Обзорный тур по изменениям** превращает большой дифф в проведённый ИИ обзор изменения. Он собирает связанные правки в шаги, выстраивает их в том порядке, в котором изменение обретает смысл, и объясняет, как всё складывается воедино.

### Осматривайте запущенное приложение

Откройте приложение рядом с чатом с помощью **Preview**. Укажите на элемент, чтобы отправить агенту его скриншот, стили, положение и ошибки браузера. Больше не нужно объяснять «вот эту штуку вот здесь». Десктопное приложение умеет то же самое с любой веб-страницей в своём встроенном браузере.

### Контекст GitHub: от проблемы до pull request

Начните сессию из проблемы или pull request на GitHub с прикреплённым контекстом. Отправляйте агенту упавшие проверки или комментарии ревью, а затем обновляйте pull request или выполняйте слияние прямо из OpenChamber.

### Продолжайте на другом устройстве

Открывайте те же проекты и сессии с десктопа, из веба/PWA, VS Code, iOS или Android. Проверяйте прогресс, отвечайте на вопросы, просматривайте изменения и подключайтесь заново к работающему терминалу.

### Приватный удалённый доступ

Спарьте устройство по одноразовому QR-коду и подключайтесь через **Private Relay**, не открывая порты и не выставляя публичный сервер в интернет. Соединение защищено сквозным шифрованием, и его можно отозвать в любой момент. Также поддерживаются прямые подключения, доступ через локальную сеть/VPN, туннели Cloudflare/Ngrok и SSH.

### Следите за работой по всем проектам

Смотрите, какие сессии работают, ждут, завершились или упали, а рядом — подтверждения, запланированные задачи, лимиты провайдеров, использование токенов и стоимость. Раскладывайте сессии по папкам и держите под рукой заметки, задачи и переиспользуемые действия проекта.

### Планируйте повторяющуюся работу

Запускайте промпт один раз, ежедневно, еженедельно или по расписанию cron. Запланированные задачи могут использовать цели сессии, поэтому движутся к результату, а не останавливаются после одного ответа.

## Используйте там, где работаете

| Платформа | Роль |
| --- | --- |
| **Десктоп** | Полноценная рабочая область для macOS, Windows и Linux: несколько окон, Мини-чат, удалённые машины, SSH и системные уведомления |
| **Веб / PWA** | Открывайте рабочую область в браузере, установите её как приложение и оставайтесь в курсе благодаря фоновым уведомлениям |
| **VS Code** | Держите сессии рядом с кодом, отправляйте выделенное агенту, открывайте результаты в редакторе и сравнивайте параллельные запуски |
| **iOS / Android** | Проверяйте работу и управляйте ею вдали от рабочего стола, получайте оповещения о завершении и пользуйтесь терминалом с сенсорным управлением |
| **CLI / Сервер** | Запускайте OpenChamber на рабочей станции или сервере, планируйте работу, управляйте удалённым доступом и держите его доступным после входа в систему |

## Быстрый старт

### Десктоп для macOS, Windows и Linux

Скачайте последний релиз со страницы [GitHub Releases](https://github.com/openchamber/openchamber/releases/latest). Десктоп включает в себя подходящий OpenCode CLI, поэтому отдельно устанавливать OpenCode не нужно.

Релизы для Linux доступны в виде AppImage для x86_64 и ARM64. Сделайте скачанный AppImage исполняемым и держите его в папке с правом записи — так обновления будут работать изнутри приложения:

```bash
chmod +x OpenChamber-*.AppImage
./OpenChamber-*.AppImage
```

Для AppImage на Linux нужен FUSE (`libfuse.so.2`). Без FUSE запускайте с `APPIMAGE_EXTRACT_AND_RUN=1`.

### VS Code

Установите [OpenChamber из Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=fedaykindev.openchamber) или найдите «OpenChamber» в разделе расширений.

### CLI для веба и PWA

Требуется Node.js 22+. CLI/веб и VS Code используют установленный у вас [OpenCode CLI](https://opencode.ai).

```bash
curl -fsSL https://raw.githubusercontent.com/openchamber/openchamber/main/scripts/install.sh | bash
openchamber --ui-password be-creative-here
```

Частые операции:

```bash
openchamber status
openchamber connect-url --qr
openchamber tunnel start --provider cloudflare --mode quick --qr
openchamber startup enable
openchamber logs
openchamber stop
openchamber update
```

По умолчанию OpenChamber слушает localhost. Используйте `--lan` только в доверенной сети и защищайте доступ из браузера с помощью `--ui-password`.

## Руководства

Изучите OpenChamber глубже с помощью руководств:

- [Быстрый старт](packages/docs/content/docs/quickstart.mdx)
- [Установка](packages/docs/content/docs/install.mdx)
- [Подключение устройств](packages/docs/content/docs/connect-devices.mdx)
- [Private Relay](packages/docs/content/docs/private-relay.mdx)
- [Multi-run](packages/docs/content/docs/multi-run.mdx)
- [Цель сессии](packages/docs/content/docs/session-goals.mdx)
- [Обзорный тур по изменениям](packages/docs/content/docs/walkthrough.mdx)
- [Preview и dev-серверы](packages/docs/content/docs/preview.mdx)
- [Рабочие процессы GitHub](packages/docs/content/docs/github.mdx)
- [Мобильные приложения](packages/docs/content/docs/mobile.mdx)
- [Безопасность](packages/docs/content/docs/security.mdx)
- [Устранение неполадок](packages/docs/content/docs/troubleshooting.mdx)

О деталях самостоятельного хостинга читайте в [руководстве по обратному прокси](docs/REVERSE_PROXY.md). О создании собственных тем — в [руководстве по пользовательским темам](docs/CUSTOM_THEMES.md).

## Почему OpenCode?

OpenChamber использует [OpenCode](https://opencode.ai) для запуска агентов-программистов. Мы выбрали его, потому что он с открытым исходным кодом, имеет надёжный API и легко расширяется.

Всё остальное в рабочем процессе OpenChamber берёт на себя. Вы решаете, что попробовать, держите агента в русле, проверяете результат, подключаетесь с другого устройства и выпускаете изменение.

OpenChamber — независимый проект и не связан с командой OpenCode.

## Участие в проекте

Исправления ошибок и небольшие улучшения приветствуются в виде PR. Новые возможности и изменения поведения начинаются с [обсуждения идей](https://github.com/openchamber/openchamber/discussions/categories/ideas), чтобы мы договорились о продукте до того, как кто-то начнёт писать код. Прочитайте [CONTRIBUTING.md](./CONTRIBUTING.md) перед открытием PR: там есть настройка, правила ревью и то, что происходит с большими незапланированными PR. Руководство по написанию документации — в [`packages/docs`](packages/docs/README.md).

Об ошибках сообщайте в [issues](https://github.com/openchamber/openchamber/issues/new/choose). Вопросы задавайте в [обсуждениях Q&A](https://github.com/openchamber/openchamber/discussions/categories/q-a).

## Благодарности

Особая благодарность:

- [OpenCode](https://opencode.ai) — за API и открытую архитектуру, на которых строится OpenChamber
- [Pierre](https://pierrejs-docs.vercel.app/) — за просмотрщик диффов и подсветку синтаксиса
- Команде [T3 Code](https://github.com/pingdotgg/t3code) — за браузерный адаптер для [libghostty-vt](https://github.com/ghostty-org/ghostty), на котором построен наш терминал
- [Yulia Ivashko](https://github.com/yulia-ivashko) — за праздничный фейерверк, который играет при каждом успешном push
- Всем, кто писал код, сообщал об ошибках или делился идеями

## Лицензия

MIT
