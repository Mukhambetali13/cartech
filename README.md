# AutoMarket

Маркетплейс автоуслуг: клиенты находят мастеров для SOS-помощи и планового ТО,
мастера откликаются на заявки и предлагают цену. Цены указываются в тенге (₸).

| Часть        | Папка       | Технологии                          | Адрес по умолчанию        |
|--------------|-------------|-------------------------------------|---------------------------|
| База данных  | —           | PostgreSQL 16 (Docker)              | `localhost:5432`          |
| Бэкенд (API) | `backend/`  | Rust, Axum, SQLx                    | `http://localhost:8080/api` |
| Сайт         | `frontend/` | React, TypeScript, Vite             | `http://localhost:3000`   |
| Мобильное    | `mobile/`   | Expo (SDK 52), React Native         | Metro на порту `8081`     |

## Что нужно установить

- **Docker** и Docker Compose — для PostgreSQL.
- **Rust** (stable) через [rustup](https://rustup.rs).
- **Node.js** 20 или новее и npm.
- Для мобильного приложения одно из двух:
  - **Android Studio** с эмулятором (Android SDK в `~/Android/Sdk`);
  - телефон с приложением **Expo Go для SDK 52** (версия из магазина может
    быть новее и не подойти — см. «Частые проблемы»).

> **Важно:** путь к папке проекта должен быть только латиницей, без пробелов и
> кириллицы (например `~/project1`, а не `~/Рабочий стол/project1`). Иначе Expo
> не запустится с ошибкой `Invalid character in header content`.

## Первый запуск

Все команды выполняются из корня проекта.

### 1. База данных

```bash
docker compose up -d
```

Проверить, что контейнер `automarket-postgres` работает:

```bash
docker ps
```

### 2. Бэкенд

Создать файл настроек из примера (один раз):

```bash
cp backend/.env.example backend/.env
```

Запустить сервер:

```bash
cd backend && cargo run
```

При старте бэкенд сам применяет миграции и заполняет справочник категорий
услуг. Проверить, что API отвечает:

```bash
curl http://localhost:8080/api/services/categories
```

### 3. Сайт

В новом терминале:

```bash
cd frontend && npm install && npm run dev
```

Открыть <http://localhost:3000>.

### 4. Мобильное приложение

В новом терминале:

```bash
cd mobile && npm install && npx expo start
```

Дальше в терминале Expo:

- `a` — открыть в Android-эмуляторе (эмулятор должен быть уже запущен);
- или отсканировать QR-код приложением Expo Go на телефоне.

Запустить эмулятор из терминала можно так (имя берётся из списка
`emulator -list-avds`):

```bash
~/Android/Sdk/emulator/emulator -list-avds
```

```bash
~/Android/Sdk/emulator/emulator -avd AutoMarket_API_35
```

#### Адрес API для мобильного приложения

- Android-эмулятор: `http://10.0.2.2:8080/api` — подставляется автоматически.
- iOS-симулятор: `http://localhost:8080/api` — тоже автоматически.
- Настоящий телефон: телефон и компьютер должны быть в одной Wi-Fi сети.
  Узнайте IP компьютера (`hostname -I`) и создайте `mobile/.env`:

  ```
  EXPO_PUBLIC_API_URL=http://192.168.1.10:8080/api
  ```

  После изменения `.env` перезапустите Expo с очисткой кэша:

  ```bash
  cd mobile && npx expo start --clear
  ```

## Ежедневный запуск

Когда всё уже установлено, достаточно четырёх терминалов:

```bash
docker compose up -d
```

```bash
cd backend && cargo run
```

```bash
cd frontend && npm run dev
```

```bash
cd mobile && npx expo start
```

Остановить базу данных:

```bash
docker compose down
```

## Проверки перед коммитом

```bash
cd backend && cargo check
```

```bash
cd frontend && npm run build && npm run lint
```

```bash
cd mobile && npm run typecheck && npx expo-doctor
```

## Настройки бэкенда (`backend/.env`)

| Переменная             | Значение по умолчанию                                         |
|------------------------|---------------------------------------------------------------|
| `DATABASE_URL`         | `postgres://automarket:automarket@localhost:5432/automarket`  |
| `JWT_SECRET`           | замените на свой длинный секрет перед выкладкой на сервер     |
| `JWT_EXPIRATION_HOURS` | `24`                                                          |
| `SERVER_HOST`          | `0.0.0.0` — сервер доступен из локальной сети (нужно телефону) |
| `SERVER_PORT`          | `8080`                                                        |
| `RUST_LOG`             | `debug`                                                       |

Сайт по умолчанию ходит в API на `http://localhost:8080`; другой адрес можно
задать переменной `VITE_API_URL` в `frontend/.env`.

## Частые проблемы

**«Project is incompatible with this version of Expo Go»** — на устройстве
стоит Expo Go для другой версии SDK. Проекту нужен Expo Go для SDK 52. На
эмуляторе удалите старый Expo Go и запустите `npx expo start`, затем нажмите
`a` и согласитесь (`Y`) установить подходящую версию:

```bash
~/Android/Sdk/platform-tools/adb uninstall host.exp.exponent
```

**`Invalid character in header content ["X-React-Native-Project-Root"]`** —
в пути к проекту есть кириллица или другие не-латинские символы. Перенесите
проект в папку с латинским путём.

**«Нет соединения с сервером» в приложении** — бэкенд не запущен или указан
неверный `EXPO_PUBLIC_API_URL`. Проверьте `curl http://localhost:8080/api/services/categories`
на компьютере и IP-адрес в `mobile/.env`.

**Порт 5432 или 8080 занят** — остановите другой PostgreSQL или процесс на
этом порту, либо поменяйте порт в `docker-compose.yml` / `backend/.env`.
