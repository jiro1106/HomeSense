#!/usr/bin/env bash
# Give execute permission to React scripts
chmod +x ./node_modules/.bin/* || true

# Install dependencies and build
npm install
npm run build