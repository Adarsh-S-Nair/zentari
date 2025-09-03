// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface UpdatePortfolioSnapshotsResponse {
  success: boolean;
  updated_prices_count?: number;
  created_snapshots_count?: number;
  skipped_snapshots_count?: number;
  total_companies?: number;
  total_portfolios?: number;
  price_errors?: string[];
  snapshot_errors?: string[];
  error?: string;
  message?: string;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log("🚀 Portfolio Snapshots Edge Function started");
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`🔗 Request method: ${req.method}`);
  
  try {
    // Get the backend API URL from environment variables
    const backendUrl = Deno.env.get("BACKEND_API_URL");
    const bearerToken = Deno.env.get("BACKEND_BEARER_TOKEN");
    
    console.log("🔧 Environment check:");
    console.log(`   BACKEND_API_URL: ${backendUrl ? '✅ Set' : '❌ Not set'}`);
    console.log(`   BACKEND_BEARER_TOKEN: ${bearerToken ? '✅ Set' : '⚠️  Not set (optional)'}`);
    
    if (!backendUrl) {
      console.error("❌ BACKEND_API_URL environment variable is not set");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "BACKEND_API_URL environment variable is not set",
          timestamp: timestamp
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`🌐 Calling backend API: ${backendUrl}/market/update-portfolio-snapshots`);
    
    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Add bearer token if provided
    if (bearerToken) {
      headers["Authorization"] = `Bearer ${bearerToken}`;
      console.log("🔐 Using bearer token authentication");
    } else {
      console.log("⚠️  No bearer token provided - using unauthenticated request");
    }

    const requestBody = {
      source: "cron_job",
      timestamp: timestamp,
      edge_function_version: "1.0.0"
    };

    console.log("📤 Sending request to backend...");
    const requestStartTime = Date.now();

    // Call the backend API to update prices and create portfolio snapshots
    const response = await fetch(`${backendUrl}/market/update-portfolio-snapshots`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    const requestDuration = Date.now() - requestStartTime;
    console.log(`⏱️  Backend request completed in ${requestDuration}ms`);
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Backend API error: ${response.status}`,
          details: errorText,
          request_duration_ms: requestDuration,
          timestamp: timestamp
        }),
        { 
          status: response.status,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    const result: UpdatePortfolioSnapshotsResponse = await response.json();
    
    console.log("📋 Backend response summary:");
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   📈 Companies updated: ${result.updated_prices_count || 0}`);
    console.log(`   💾 Snapshots created: ${result.created_snapshots_count || 0}`);
    console.log(`   ⏭️  Snapshots skipped: ${result.skipped_snapshots_count || 0}`);
    console.log(`   📊 Total companies: ${result.total_companies || 0}`);
    console.log(`   📊 Total portfolios: ${result.total_portfolios || 0}`);
    console.log(`   ❌ Price errors: ${result.price_errors?.length || 0}`);
    console.log(`   ❌ Snapshot errors: ${result.snapshot_errors?.length || 0}`);

    if (result.price_errors && result.price_errors.length > 0) {
      console.log("❌ Price update errors:");
      result.price_errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (result.snapshot_errors && result.snapshot_errors.length > 0) {
      console.log("❌ Snapshot creation errors:");
      result.snapshot_errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    const totalDuration = Date.now() - startTime;
    console.log(`⏱️  Total function execution time: ${totalDuration}ms`);
    console.log("✅ Portfolio snapshots update completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Portfolio snapshots update completed successfully",
        summary: {
          companies_updated: result.updated_prices_count || 0,
          snapshots_created: result.created_snapshots_count || 0,
          snapshots_skipped: result.skipped_snapshots_count || 0,
          total_companies: result.total_companies || 0,
          total_portfolios: result.total_portfolios || 0,
          price_errors: result.price_errors?.length || 0,
          snapshot_errors: result.snapshot_errors?.length || 0
        },
        backend_response: result,
        execution_time_ms: totalDuration,
        request_duration_ms: requestDuration,
        timestamp: timestamp
      }),
      { 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("❌ Error in update-portfolio-snapshots function:", error);
    console.error(`⏱️  Function failed after ${totalDuration}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message,
        execution_time_ms: totalDuration,
        timestamp: timestamp
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-portfolio-snapshots' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{}'

*/