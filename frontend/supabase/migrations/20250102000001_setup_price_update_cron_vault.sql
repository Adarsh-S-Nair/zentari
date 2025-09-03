-- Enable the required extensions for cron and http requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store secrets in the vault (you'll need to set these via the Supabase dashboard or CLI)
-- INSERT INTO vault.secrets (name, secret) VALUES 
-- ('EDGE_FN_SECRET', 'your-edge-function-secret-here'),
-- ('BACKEND_API_URL', 'https://your-backend-api-url.com');

-- Create a function to invoke the Edge Function for portfolio snapshots using vault secrets
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
    -- Get the function URL and secret from vault
    SELECT decrypted_secret INTO secret_token 
    FROM vault.decrypted_secrets 
    WHERE name = 'EDGE_FN_SECRET';
    
    -- Construct the function URL (replace with your actual project reference)
    function_url := 'https://mfkpufuxyrgrsjppllyo.supabase.co/functions/v1/update-portfolio-snapshots';
    
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
SELECT cron.schedule(
    'daily-portfolio-snapshots',
    '40 21 * * *',  -- 4:40 PM ET (21:40 UTC)
    'SELECT invoke_portfolio_snapshots_function();'
);

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
