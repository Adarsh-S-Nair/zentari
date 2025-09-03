-- Update cron schedule to run at 5:00 PM EST (10:00 PM UTC) every day
-- Remove existing schedule
SELECT cron.unschedule('daily-portfolio-snapshots');

-- Add new schedule for 5:00 PM EST (10:00 PM UTC)
SELECT cron.schedule(
    'daily-portfolio-snapshots',
    '0 22 * * *',  -- 5:00 PM EST (10:00 PM UTC)
    'SELECT invoke_portfolio_snapshots_function();'
);
