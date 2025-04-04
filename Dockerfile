# Базовый образ
FROM node:20

# Создаём директорию внутри контейнера
WORKDIR /app

# Копируем всё (клиент, сервер, package.json, package-lock.json)
COPY . .

# Указываем рабочую директорию для запуска — папка с сервером
WORKDIR /app/server

# Устанавливаем зависимости
RUN npm install

# Порт (если нужен)
EXPOSE 8080

# Стартуем сервер
CMD ["node", "main.js"]