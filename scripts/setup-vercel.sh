#!/bin/bash
set -e

echo "=== Setting up Vercel for API Documentation ==="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Error: vercel CLI is not installed. Please install it with: npm i -g vercel"
    exit 1
fi

cd docs

echo ""
echo "Installing documentation dependencies..."
npm install

echo ""
echo "Building documentation..."
npm run build

echo ""
echo "Deploying to Vercel..."
vercel --prod

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Add custom domain in Vercel dashboard:"
echo "   gs-webhook-2-events-docs.grand-shooting.com"
echo ""
echo "2. Update DNS to point to Vercel"
