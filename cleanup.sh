#!/bin/bash
set -e

cd /home/tod/GiTody-1

echo "=== Добавление изменений ==="
git add src/js/ui/githubPanel.js src/js/api/githubManager.js package.json CHANGELOG.md

echo "=== Создание коммита ==="
git commit -m "refactor: устранить TODO комментарии, переименовать проект в gitody, обновить CHANGELOG" || echo "Коммит уже создан или нет изменений"

echo "=== Отправка в GitHub ==="
git push origin main

echo "=== Очистка удаленных веток ==="
git remote prune origin

echo "=== Готово ==="
