import { NextResponse } from "next/server"
import { generateSecureToken } from "@/lib/utils/encryption"

// In-memory store for OAuth state (in a real app, this would be in a database)
const oauthStateStore: Record<string, { createdAt: number; redirectUri: string }> = {}

export async function POST(request: Request) {
  try {
    const { redirectUri, scopes = ["read:user", "user:email"] } = await request.json()

    if (!redirectUri) {
      return NextResponse.json({ error: "Redirect URI is required" }, { status: 400 })
    }

    // Generate a secure state token to prevent CSRF
    const state = generateSecureToken(32)

    // Store the state token with an expiration
    oauthStateStore[state] = {
      createdAt: Date.now(),
      redirectUri,
    }

    // Clean up expired state tokens
    Object.keys(oauthStateStore).forEach((key) => {
      if (Date.now() - oauthStateStore[key].createdAt > 1000 * 60 * 10) {
        // 10 minutes
        delete oauthStateStore[key]
      }
    })

    // For demo purposes, we'll use a mock client ID
    // In a real implementation, you would register a GitHub OAuth app
    const clientId = "mock-github-client-id"

    // For demo purposes, we'll simulate the OAuth flow entirely
    // Instead of redirecting to GitHub, we'll redirect directly to our callback
    const authUrl = `${redirectUri}?code=mock_auth_code_${Date.now()}&state=${state}`

    return NextResponse.json({
      clientId,
      authUrl,
      state,
    })
  } catch (error) {
    console.error("GitHub OAuth credentials error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
