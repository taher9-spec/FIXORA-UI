import { NextResponse } from "next/server"
import { getOrigin } from "@/lib/utils/environment"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")

    const origin = getOrigin()

    // Create an HTML page that will post a message to the parent window
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supabase Authorization</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f9fafb;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 0 20px;
              text-align: center;
            }
            .card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              padding: 20px;
              max-width: 400px;
              width: 100%;
            }
            h1 {
              color: #3b82f6;
              margin-bottom: 16px;
            }
            p {
              color: #4b5563;
              margin-bottom: 24px;
            }
            .spinner {
              border: 3px solid rgba(0, 0, 0, 0.1);
              border-radius: 50%;
              border-top: 3px solid #3b82f6;
              width: 24px;
              height: 24px;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h1>${error ? "Authorization Failed" : "Authorization Successful"}</h1>
            <p>${error ? errorDescription || "An error occurred during authorization." : "Completing your Supabase connection..."}</p>
          </div>
          <script>
            // Post a message to the parent window
            window.opener.postMessage(
              {
                type: 'supabase-callback',
                ${code ? `code: '${code}',` : ""}
                ${state ? `state: '${state}',` : ""}
                ${error ? `error: '${errorDescription || error}',` : ""}
              },
              '${origin}'
            );
            
            // Close this window after a short delay
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("Supabase callback error:", error)

    // Return an error page
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f9fafb;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 0 20px;
              text-align: center;
            }
            .card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              padding: 20px;
              max-width: 400px;
              width: 100%;
            }
            h1 {
              color: #ef4444;
              margin-bottom: 16px;
            }
            p {
              color: #4b5563;
              margin-bottom: 24px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Error</h1>
            <p>An unexpected error occurred. Please try again.</p>
          </div>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  }
}
