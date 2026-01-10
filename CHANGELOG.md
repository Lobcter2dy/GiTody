# Changelog

Все важные изменения в этом проекте будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Изменено
- Переименование проекта: `github-manager` → `gitody` в package.json
- Обновлен appId и productName в конфигурации сборки Electron
- Интеграция GitHubPanelManager с GitHubManager API - устранены все TODO комментарии
- Добавлен метод `fetchReleases()` в GitHubManager для загрузки релизов

### Исправлено
- GitHubPanel методы теперь используют реальный GitHubManager API вместо заглушек
- Правильная передача параметров в метод `createBranch()`

### Добавлено
- Полная настройка GitHub репозитория
- MIT лицензия
- GitHub Actions для автоматической сборки
- Шаблоны для Issues и Pull Requests
- Политика безопасности (SECURITY.md)
- Кодекс поведения (CODE_OF_CONDUCT.md)
- Руководство для контрибьюторов (CONTRIBUTING.md)
- Конфигурация для единообразного форматирования кода
- Автоматическое обновление зависимостей через Dependabot
- Системный мониторинг с реальными данными через IPC
- Менеджер секретов с проверками персистентности
- Улучшенный UI/UX с интеграциями облачных сервисов

## [1.0.0] - 2026-01-05

### Добавлено
- Electron приложение для управления GitHub репозиториями
- Веб-интерфейс
- Редактор кода
- Чат-помощник
- Управление репозиториями и ветками
- Работа с Pull Requests
- Аутентификация через GitHub

[Unreleased]: https://github.com/Lobcter2dy/GiTody/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Lobcter2dy/GiTody/releases/tag/v1.0.0
