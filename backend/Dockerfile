FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]