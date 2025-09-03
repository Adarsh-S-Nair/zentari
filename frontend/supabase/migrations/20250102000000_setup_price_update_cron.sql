-- Enable the required extensions for cron and http requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to invoke the Edge Function for portfolio snapshots
CREATE OR REPLACE FUNCTION invoke_portfolio_snapshots_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    function_url text;
    secret_token text;
    response_id bigint;
BEGIN
    -- Get the function URL and secret from environment variables
    -- You'll need to set these in your Supabase project settings
    function_url := current_setting('app.settings.edge_function_url', true);
    secret_token := current_setting('app.settings.edge_function_secret', true);
    
    -- If not set via settings, use hardcoded values (replace with your actual values)
    IF function_url IS NULL THEN
        function_url := 'https://mfkpufuxyrgrsjppllyo.supabase.co/functions/v1/update-portfolio-snapshots';
    END IF;
    
    IF secret_token IS NULL THEN
        secret_token := 'your-edge-function-secret';
    END IF;
    
    -- Make the HTTP request to the Edge Function using pg_net
    SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || secret_token,
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) INTO response_id;
    
    -- Log the response (optional)
    RAISE NOTICE 'Portfolio snapshots function called, response ID: %', response_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to invoke price update function: %', SQLERRM;
END;
$$;

-- Schedule the portfolio snapshots update to run daily at 4:40 PM ET (21:40 UTC)
-- You can adjust the cron expression as needed
SELECT cron.schedule(
    'daily-portfolio-snapshots',
    '40 21 * * *',  -- 4:40 PM ET (21:40 UTC)
    'SELECT invoke_portfolio_snapshots_function();'
);

-- Alternative: Run every 4 hours during market hours (9 AM - 4 PM ET)
-- Uncomment the following lines if you want more frequent updates
/*
SELECT cron.schedule(
    'market-hours-price-update',
    '0 13,17,21 * * 1-5',  -- 9 AM, 1 PM, 5 PM ET on weekdays
    'SELECT invoke_price_update_function();'
);
*/

-- Create a function to manually trigger portfolio snapshots (for testing)
CREATE OR REPLACE FUNCTION manual_portfolio_snapshots()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM invoke_portfolio_snapshots_function();
    RETURN 'Portfolio snapshots triggered successfully';
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION invoke_portfolio_snapshots_function() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_portfolio_snapshots() TO authenticated;
