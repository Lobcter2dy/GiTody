# Инструкция по установке и запуску

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

Это установит все необходимые пакеты:
- `vite` - сборщик для веб-версии
- `electron` - для десктопной версии
- `electron-builder` - для сборки Electron приложения
- `concurrently` и `wait-on` - для параллельного запуска

### 2. Запуск веб-версии (для разработки)

```bash
npm run dev
```

Приложение откроется в браузере по адресу: http://localhost:5173

### 3. Запуск Electron версии

```bash
npm run electron:dev
```

Это запустит:
- Vite dev сервер (http://localhost:5173)
- Electron приложение (окно приложения)

### 4. Сборка для продакшена

#### Веб-версия:
```bash
npm run build
```

Файлы будут в папке `dist/`

#### Electron версия:
```bash
npm run electron:build
```

Установочные файлы будут в папке `dist-electron/`

## Структура проекта

```
GITODY/
├── src/                    # Исходный код
│   ├── styles/            # CSS модули
│   ├── js/                # JavaScript модули
│   └── index.html         # Главная страница
├── electron/              # Electron конфигурация
├── public/                # Публичные файлы
├── dist/                  # Собранные файлы (после npm run build)
├── package.json           # Зависимости
├── vite.config.js         # Конфигурация Vite
└── README.md              # Документация
```

## Требования

- Node.js >= 18.0.0
- npm или yarn

## Решение проблем

### Ошибка: "Cannot find module"
Убедитесь, что выполнили `npm install`

### Ошибка порта 5173 занят
Измените порт в `vite.config.js`:
```js
server: {
  port: 3000, // другой порт
}
```

### Electron не запускается
Убедитесь, что установлены все зависимости:
```bash
npm install --save-dev electron
```

## Дополнительная информация

См. [README.md](README.md) для полной документации.
