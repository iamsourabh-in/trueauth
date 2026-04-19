FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Angular default port
EXPOSE 4200

# Start frontend development server on 0.0.0.0 to allow external access
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--disable-host-check"]
