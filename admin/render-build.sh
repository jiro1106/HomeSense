#!/usr/bin/env bash
set -o errexit

echo "🔧 Fixing permissions..."
chmod +x node_modules/.bin/* || true

echo "📦 Installing dependencies..."
npm ci --include=dev

echo "🏗️ Building project..."
npx react-scripts build