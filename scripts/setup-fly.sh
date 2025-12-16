#!/bin/bash
set -e

echo "=== Setting up Fly.io apps and databases ==="

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "Error: flyctl is not installed. Please install it first."
    exit 1
fi

# Check if logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "Error: Not logged in to Fly.io. Please run 'flyctl auth login' first."
    exit 1
fi

echo ""
echo "=== Creating Staging Environment ==="

# Create staging app
echo "Creating staging app..."
flyctl apps create gs-webhook-2-events-staging --org personal || echo "App may already exist"

# Create staging database
echo "Creating staging database..."
flyctl postgres create \
    --name gs-webhook-2-events-staging-db \
    --region cdg \
    --vm-size shared-cpu-1x \
    --initial-cluster-size 1 \
    --volume-size 1 \
    || echo "Database may already exist"

# Attach database to staging app
echo "Attaching database to staging app..."
flyctl postgres attach gs-webhook-2-events-staging-db \
    --app gs-webhook-2-events-staging \
    || echo "Database may already be attached"

echo ""
echo "=== Creating Production Environment ==="

# Create production app
echo "Creating production app..."
flyctl apps create gs-webhook-2-events --org personal || echo "App may already exist"

# Create production database
echo "Creating production database..."
flyctl postgres create \
    --name gs-webhook-2-events-db \
    --region cdg \
    --vm-size shared-cpu-1x \
    --initial-cluster-size 1 \
    --volume-size 10 \
    || echo "Database may already exist"

# Attach database to production app
echo "Attaching database to production app..."
flyctl postgres attach gs-webhook-2-events-db \
    --app gs-webhook-2-events \
    || echo "Database may already be attached"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Set secrets for STAGING:"
echo "   flyctl secrets set --app gs-webhook-2-events-staging \\"
echo "       WEBHOOK_SECRET_KEY=your-staging-webhook-key \\"
echo "       ADMIN_API_KEY=your-staging-admin-key \\"
echo "       GS_STREAM_API_TOKEN=your-staging-stream-token"
echo ""
echo "2. Set secrets for PRODUCTION:"
echo "   flyctl secrets set --app gs-webhook-2-events \\"
echo "       WEBHOOK_SECRET_KEY=your-production-webhook-key \\"
echo "       ADMIN_API_KEY=your-production-admin-key \\"
echo "       GS_STREAM_API_TOKEN=your-production-stream-token"
echo ""
echo "3. Add custom domains:"
echo "   flyctl certs create gs-webhook-2-events-staging.grand-shooting.com --app gs-webhook-2-events-staging"
echo "   flyctl certs create gs-webhook-2-events.grand-shooting.com --app gs-webhook-2-events"
echo ""
echo "4. Add FLY_API_TOKEN to GitHub secrets for CI/CD"
echo "   Get your token with: flyctl tokens create deploy -x 999999h"
