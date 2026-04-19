#!/bin/bash

# Ensure Redis is running (since it's an external binary, using Docker for just this is standard)
echo "Starting Redis via Docker (if not already running)..."
docker-compose up -d redis

echo "============================================================"
echo "🚀 TrueAuth is running locally without Docker web containers"
echo "🌐 Frontend: http://localhost:4200"
echo "🔌 Backend: http://localhost:3000"
echo "🛑 Press Ctrl+C to stop everything"
echo "============================================================"

# Use concurrently to properly multiplex the terminal streams 
# so Angular (ng serve) doesn't clear the backend's logs from the screen
npx concurrently -k -p "[{name}]" -n "BACKEND,FRONTEND" -c "cyan.bold,yellow.bold" \
  "cd backend && npx ts-node src/index.ts" \
  "cd frontend && npx ng serve"
