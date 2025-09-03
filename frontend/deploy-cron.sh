#!/bin/bash

# Deploy Portfolio Snapshots Cron Job
# This script sets up the Supabase Edge Function and cron job for updating stock prices and creating portfolio snapshots

set -e

echo "🚀 Deploying Portfolio Snapshots Cron Job..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Deploy the Edge Function
echo "📦 Deploying Edge Function..."
supabase functions deploy update-portfolio-snapshots

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

# Apply database migrations
echo "🗄️  Applying database migrations..."
supabase db push

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo "✅ Database migrations applied successfully"
else
    echo "❌ Failed to apply database migrations"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Supabase:"
echo "   - BACKEND_API_URL: Your backend API URL"
echo "   - BACKEND_BEARER_TOKEN: Your bearer token (if needed)"
echo ""
echo "2. Set vault secrets in Supabase dashboard:"
echo "   - EDGE_FN_SECRET: Your Edge Function secret"
echo ""
echo "3. Test the setup:"
echo "   - Run: SELECT manual_portfolio_snapshots(); in your database"
echo "   - Or test the Edge Function directly via the API"
echo ""
echo "📊 The cron job is scheduled to run daily at 4:40 PM ET"
echo "📈 Check the Supabase dashboard for logs and monitoring"
echo "💾 Portfolio snapshots will be created in the portfolio_snapshots table"
