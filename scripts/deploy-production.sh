#!/bin/bash
# LINE Harness — Production deploy script
# Usage: ssh macmini 'cd ~/claudecode/line-oss-crm && bash scripts/deploy-production.sh'

set -e
cd apps/worker

echo "🔨 Building with Vite..."
npx vite build

echo "🚀 Deploying..."
npx wrangler deploy --name line-crm-worker

echo "✅ Deploy complete!"
