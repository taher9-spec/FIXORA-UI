import { NextResponse } from "next/server"
import { getOrigin } from "@/lib/utils/environment"
import { createConnection } from "@/lib/connections-service"
import { encryptSecret } from "@/lib/utils/encryption"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")

    const origin = getOrigin()

    if (error) {
      // Create an HTML page that will post a message to the parent window
      const html = createCallbackPage({
        origin,
        provider: "google",
        error: errorDescription || error,
      })

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }

    if (!code || !state) {
      const html = createCallbackPage({
        origin,
        provider: "google",
        error: "Missing authorization code or state",
      })

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }

    try {
      // In a real implementation, you would exchange the code for an access token
      // For this demo, we'll simulate a successful OAuth flow with mock data
      const mockAccessToken = `ya29.${generateMockToken()}`

      // Create the Google connection
      const connection = await createConnection({
        type: "google",
        name: "Google",
        status: "active",
        credentials: {
          accessToken: encryptSecret(mockAccessToken),
          scope: "profile,email",
        },
        metadata: {
          oauthConnected: true,
          connectedAt: new Date().toISOString(),
        },
      })

      const html = createCallbackPage({
        origin,
        provider: "google",
        connectionId: connection.id,
      })

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    } catch (connectionError) {
      console.error("Google connection creation error:", connectionError)

      const html = createCallbackPage({
        origin,
        provider: "google",
        error: "Failed to create Google connection",
      })

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }
  } catch (error) {
    console.error("Google callback error:", error)

    const origin = getOrigin()
    const html = createCallbackPage({
      origin,
      provider: "google",
      error: "An unexpected error occurred",
    })

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  }
}

function createCallbackPage({
  origin,
  provider,
  connectionId,
  error,
}: {
  origin: string
  provider: string
  connectionId?: string
  error?: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${provider.charAt(0).toUpperCase() + provider.slice(1)} Authorization</title>
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
            color: ${error ? "#ef4444" : "#3b82f6"};
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
          ${!error ? '<div class="spinner"></div>' : ""}
          <h1>${error ? "Authorization Failed" : "Authorization Successful"}</h1>
          <p>${error || `Completing your ${provider} connection...`}</p>
        </div>
        <script>
          // Post a message to the parent window
          window.opener.postMessage(
            {
              type: 'oauth-callback',
              provider: '${provider}',
              ${connectionId ? `connectionId: '${connectionId}',` : ""}
              ${error ? `error: '${error}',` : ""}
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
}

function generateMockToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
