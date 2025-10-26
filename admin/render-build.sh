#!/usr/bin/env bash
set -o errexit

#  1. Force clean npm cache — prevents corrupted installs on Render
npm cache clean --force

#  2. Install dependencies fresh
npm install

#  3. Ensure @babel/traverse (the missing file) is properly installed
npm install --save-dev @babel/traverse@7.24.1

# 🚀 4. Build React app
npm run build