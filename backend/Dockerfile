FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "node migrate.js && node server.js"]
