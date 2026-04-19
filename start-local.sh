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

# Use npm run dev (concurrently installed as root dev dep)
npm run dev
