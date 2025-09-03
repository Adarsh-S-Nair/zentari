# Portfolio Snapshots Cron Job Setup

This directory contains the setup for a Supabase Edge Function that runs as a cron job to update stock prices and create portfolio snapshots in your database.

## Overview

The system consists of:
1. **Edge Function** (`functions/update-portfolio-snapshots/index.ts`) - Calls your backend API to update prices and create snapshots
2. **Backend API** (`/market/update-portfolio-snapshots`) - Updates prices and creates portfolio snapshots using yfinance
3. **Cron Schedule** - Runs the Edge Function daily at 4:40 PM ET

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# From the frontend directory
supabase functions deploy update-portfolio-snapshots
```

### 2. Set Environment Variables

Set these environment variables in your Supabase project:

```bash
# Set the backend API URL
supabase secrets set BACKEND_API_URL="https://your-backend-api-url.com"

# Set the bearer token (if your backend requires authentication)
supabase secrets set BACKEND_BEARER_TOKEN="your-bearer-token"
```

### 3. Set Up Vault Secrets

In your Supabase dashboard, go to Settings → Vault and add these secrets:

- `EDGE_FN_SECRET`: Your Edge Function secret (found in Settings → API)
- `BACKEND_API_URL`: Your backend API URL

### 4. Run the Migration

```bash
# Apply the cron setup migration
supabase db push
```

### 5. Test the Setup

You can test the Edge Function manually:

```bash
# Test the Edge Function directly
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/update-portfolio-snapshots' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Or test the manual trigger function in your database:

```sql
SELECT manual_portfolio_snapshots();
```

## Configuration

### Cron Schedule

The default schedule runs daily at 4:40 PM ET (21:40 UTC). To modify:

```sql
-- Remove existing schedule
SELECT cron.unschedule('daily-portfolio-snapshots');

-- Add new schedule (example: every 4 hours during market hours)
SELECT cron.schedule(
    'market-hours-portfolio-snapshots',
    '0 13,17,21 * * 1-5',  -- 9 AM, 1 PM, 5 PM ET on weekdays
    'SELECT invoke_portfolio_snapshots_function();'
);
```

### Backend API Endpoint

The Edge Function calls `POST /market/update-portfolio-snapshots` on your backend. Make sure this endpoint:
- Updates the `latest_price`, `latest_price_as_of`, `latest_price_currency`, and `latest_price_source` fields for companies
- Creates new records in the `portfolio_snapshots` table with `portfolio_id`, `recorded_at`, and `total_value`
- Returns a JSON response with `success`, `updated_prices_count`, and `created_snapshots_count` fields
- Handles errors gracefully

## Monitoring

### View Cron Jobs

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details 
WHERE jobname = 'daily-portfolio-snapshots' 
ORDER BY start_time DESC 
LIMIT 10;
```

### View Logs

Check the Supabase Edge Function logs in the dashboard under Functions → update-portfolio-snapshots → Logs.

## Troubleshooting

### Common Issues

1. **Function not being called**: Check that the cron job is scheduled and the Edge Function is deployed
2. **Backend API errors**: Verify the BACKEND_API_URL is correct and the endpoint is accessible
3. **Authentication errors**: Check that the EDGE_FN_SECRET is set correctly in the vault

### Manual Testing

```sql
-- Test the database function directly
SELECT invoke_portfolio_snapshots_function();

-- Check if secrets are set correctly
SELECT name FROM vault.secrets;
```

## Cost Considerations

- Edge Function invocations: Free tier includes 500,000 invocations/month
- Overages: ~$2 per 1M invocations
- Cron jobs: Free with Supabase Pro plan

## Security Notes

- The Edge Function uses environment variables for sensitive data
- Database functions use SECURITY DEFINER for proper permissions
- Secrets are stored in Supabase Vault for encryption
