FROM node:20-alpine
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose backend port
EXPOSE 3000

# Start backend using ts-node (or nodemon)
CMD ["npx", "ts-node", "src/index.ts"]
