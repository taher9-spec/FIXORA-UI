import { NextResponse } from "next/server"
import { GitHubOAuthFix } from "@/lib/github/oauth-fix"
import crypto from "crypto"

// Enhanced state store with better error handling
export const oauthStateStore: Record<
  string,
  {
    clientId: string
    clientSecret: string
    redirectUri: string
    createdAt: number
    attempts: number
  }
> = {}

// Cleanup expired states every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    const expiredStates = Object.keys(oauthStateStore).filter(
      (state) => now - oauthStateStore[state].createdAt > 10 * 60 * 1000, // 10 minutes
    )
    expiredStates.forEach((state) => delete oauthStateStore[state])

    if (expiredStates.length > 0) {
      console.log(`Cleaned up ${expiredStates.length} expired OAuth states`)
    }
  },
  5 * 60 * 1000,
)

export async function POST(request: Request) {
  try {
    const oauthFix = GitHubOAuthFix.getInstance()

    // Get OAuth configuration
    const config = oauthFix.getOAuthConfig()

    // Validate configuration
    const validation = oauthFix.validateConfig(config)
    if (!validation.valid) {
      console.error("OAuth configuration invalid:", validation.errors)
      return NextResponse.json(
        {
          success: false,
          error: "OAuth configuration invalid",
          details: validation.errors,
          troubleshooting: {
            message: "The GitHub OAuth application is not properly configured.",
            steps: [
              "Check that GITHUB_CLIENT_ID environment variable is set",
              "Check that GITHUB_CLIENT_SECRET environment variable is set",
              "Verify the redirect URI in your GitHub OAuth app settings",
              `Expected redirect URI: ${config.redirectUri}`,
            ],
          },
        },
        { status: 400 },
      )
    }

    // Generate secure state token
    const state = crypto.randomBytes(32).toString("hex")

    // Store state with configuration
    oauthStateStore[state] = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      createdAt: Date.now(),
      attempts: 0,
    }

    // Create authorization URL using the fix
    const authUrl = oauthFix.createOAuthUrl(config.clientId, state)

    console.log("GitHub OAuth Init Success:", {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state,
      authUrl,
    })

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      config: {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      },
      debug: {
        origin: new URL(authUrl).origin,
        redirectPath: "/api/oauth/github/callback",
      },
    })
  } catch (error) {
    console.error("GitHub OAuth init error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize GitHub OAuth flow",
        details: error instanceof Error ? error.message : "Unknown error",
        troubleshooting: {
          message: "There was an error setting up the GitHub connection.",
          steps: [
            "Check your internet connection",
            "Verify GitHub OAuth app configuration",
            "Try refreshing the page and attempting again",
            "Contact support if the issue persists",
          ],
        },
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const autoRedirect = url.searchParams.get("redirect") === "true"

    const oauthFix = GitHubOAuthFix.getInstance()
    const config = oauthFix.getOAuthConfig()

    const state = crypto.randomBytes(32).toString("hex")

    oauthStateStore[state] = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      createdAt: Date.now(),
      attempts: 0,
    }

    const authUrl = oauthFix.createOAuthUrl(config.clientId, state)

    if (autoRedirect) {
      return NextResponse.redirect(authUrl)
    }

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      config: {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      },
    })
  } catch (error) {
    console.error("GitHub OAuth GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize GitHub OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
