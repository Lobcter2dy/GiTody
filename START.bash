#!/bin/bash
# Скрипт для гарантированного запуска GiTody (Electron) - ПОПЫТКА 3

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}--- 🚀 Запуск GiTody ---${NC}"

# 1. Жесткая чистка портов
echo -e "${YELLOW}🧹 Очистка портов 5173 и 47523...${NC}"
# Пытаемся убить процессы на портах разными способами
for port in 5173 47523; do
    # Linux way using ss/awk/kill
    PID=$(ss -lptn "sport = :$port" | grep -oP '(?<=pid=)\d+' | head -n 1)
    if [ ! -z "$PID" ]; then
        echo "Убиваю процесс $PID на порту $port"
        kill -9 $PID 2>/dev/null
    fi
done

# Также убиваем по имени на всякий случай
pkill -9 -f "electron" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null

sleep 1

# 2. Проверка зависимостей
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 node_modules не найдены. Устанавливаю...${NC}"
    npm install
fi

# 3. Фикс прав для Electron (иногда слетают на Linux)
if [ -f "node_modules/.bin/electron" ]; then
    chmod +x node_modules/.bin/electron 2>/dev/null
fi

# 4. Запуск
echo -e "${GREEN}⚡ Запуск Dev-режима...${NC}"
# Мы запускаем через concurrently, но добавим логов
npm run electron:dev
