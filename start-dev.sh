#!/bin/bash
echo "🚀 Starting IdealAICompanion Development Environment..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping services..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Check ports
if lsof -i :3000 >/dev/null; then
    echo "⚠️  Port 3000 (Server) is already in use. Attempting to free..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
fi
if lsof -i :5173 >/dev/null; then
    echo "⚠️  Port 5173 (Web) is already in use. Attempting to free..."
    lsof -ti :5173 | xargs kill -9 2>/dev/null
fi

# Start Server
echo "📦 Starting Backend Server (Port 3000)..."
cd Source/server && npm run dev &
SERVER_PID=$!

# Wait for server to be ready (naive check)
sleep 3

# Start Web
echo "💻 Starting Frontend Web (Port 5173)..."
cd Source/web && npm run dev &
WEB_PID=$!

echo "✅ Services are running."
echo "   - Backend: http://localhost:3000"
echo "   - Frontend: http://localhost:5173"
echo "   (Press Ctrl+C to stop both)"

wait
