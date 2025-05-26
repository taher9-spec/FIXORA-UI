import { NextResponse } from "next/server"
import { getOrigin } from "@/lib/utils/environment"
import { createConnection } from "@/lib/connections-service"
import { storeGitHubTokens, validateGitHubToken } from "@/lib/github/token-manager"
import { oauthStateStore } from "../init/route"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")

    const origin = getOrigin()

    if (error) {
      return createCallbackPage({
        origin,
        error: errorDescription || error,
      })
    }

    if (!code || !state) {
      return createCallbackPage({
        origin,
        error: "Missing authorization code or state parameter",
      })
    }

    // Verify state token
    const stateData = oauthStateStore[state]
    if (!stateData) {
      return createCallbackPage({
        origin,
        error: "Invalid or expired state token",
      })
    }

    // Clean up used state token
    delete oauthStateStore[state]

    try {
      // Exchange code for access token
      const tokenResponse = await exchangeCodeForToken(
        code,
        stateData.clientId,
        stateData.clientSecret,
        stateData.redirectUri,
      )

      if (!tokenResponse) {
        throw new Error("Failed to exchange code for access token")
      }

      // Validate the token and get user info
      const userInfo = await validateGitHubToken(tokenResponse.accessToken)

      if (!userInfo) {
        throw new Error("Failed to validate GitHub token")
      }

      // Create the GitHub connection
      const connection = await createConnection({
        type: "github",
        name: `GitHub (${userInfo.login})`,
        status: "active",
        credentials: {
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          scope: tokenResponse.scope,
          tokenType: tokenResponse.tokenType,
        },
        metadata: {
          userId: userInfo.id,
          username: userInfo.login,
          name: userInfo.name,
          email: userInfo.email,
          avatarUrl: userInfo.avatarUrl,
          oauthConnected: true,
          connectedAt: new Date().toISOString(),
        },
      })

      // Store tokens securely
      await storeGitHubTokens(connection.id, tokenResponse)

      return createCallbackPage({
        origin,
        connectionId: connection.id,
        userInfo,
      })
    } catch (connectionError) {
      console.error("GitHub connection creation error:", connectionError)
      return createCallbackPage({
        origin,
        error: connectionError.message || "Failed to create GitHub connection",
      })
    }
  } catch (error) {
    console.error("GitHub callback error:", error)
    const origin = getOrigin()
    return createCallbackPage({
      origin,
      error: "An unexpected error occurred during GitHub authorization",
    })
  }
}

async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  // For demo purposes, we'll simulate a successful token exchange
  // In production, this would make a real request to GitHub's token endpoint

  const mockAccessToken = `gho_${generateMockToken(40)}`
  const mockRefreshToken = `ghr_${generateMockToken(40)}`

  return {
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    scope: "read:user,user:email,repo",
    tokenType: "bearer",
  }
}

function generateMockToken(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function createCallbackPage({
  origin,
  connectionId,
  userInfo,
  error,
}: {
  origin: string
  connectionId?: string
  userInfo?: any
  error?: string
}) {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GitHub Authorization</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .card {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            padding: 30px;
            max-width: 400px;
            width: 100%;
            animation: slideIn 0.5s ease-out;
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          h1 {
            color: ${error ? "#dc2626" : "#059669"};
            margin-bottom: 16px;
            font-size: 24px;
            font-weight: 600;
          }
          p {
            color: #4b5563;
            margin-bottom: 20px;
            line-height: 1.5;
          }
          .user-info {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            margin: 0 auto 12px;
            display: block;
          }
          .spinner {
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 3px solid #059669;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .success-icon {
            color: #059669;
            font-size: 48px;
            margin-bottom: 16px;
          }
          .error-icon {
            color: #dc2626;
            font-size: 48px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          ${
            error
              ? `
            <div class="error-icon">✗</div>
            <h1>Authorization Failed</h1>
            <p>${error}</p>
          `
              : `
            ${!userInfo ? '<div class="spinner"></div>' : '<div class="success-icon">✓</div>'}
            <h1>${userInfo ? "Successfully Connected!" : "Completing Authorization..."}</h1>
            ${
              userInfo
                ? `
              <div class="user-info">
                <img src="https://github.com/github.png" alt="Avatar" class="avatar" />
                <strong>${userInfo.name || userInfo.login}</strong><br>
                <small>@${userInfo.login}</small>
              </div>
              <p>Your GitHub account has been successfully connected to Fixora UI.</p>
            `
                : `<p>Please wait while we complete your GitHub connection...</p>`
            }
          `
          }
        </div>
        <script>
          // Post a message to the parent window
          window.opener?.postMessage(
            {
              type: 'github-oauth-callback',
              ${connectionId ? `connectionId: '${connectionId}',` : ""}
              ${userInfo ? `userInfo: ${JSON.stringify(userInfo)},` : ""}
              ${error ? `error: '${error}',` : ""}
            },
            '${origin}'
          );
          
          // Close this window after a delay
          setTimeout(() => {
            window.close();
          }, ${error ? 5000 : 3000});
        </script>
      </body>
    </html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  )
}
