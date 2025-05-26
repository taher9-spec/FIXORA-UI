import { NextResponse } from "next/server"
import { generateSecureToken } from "@/lib/utils/encryption"

// In-memory store for OAuth state (in a real app, this would be in a database)
const oauthStateStore: Record<string, { createdAt: number }> = {}

export async function POST(request: Request) {
  try {
    const { redirectUri } = await request.json()

    if (!redirectUri) {
      return NextResponse.json({ error: "Redirect URI is required" }, { status: 400 })
    }

    // Generate a secure state token to prevent CSRF
    const state = generateSecureToken(32)

    // Store the state token with an expiration
    oauthStateStore[state] = {
      createdAt: Date.now(),
    }

    // Clean up expired state tokens
    Object.keys(oauthStateStore).forEach((key) => {
      if (Date.now() - oauthStateStore[key].createdAt > 1000 * 60 * 10) {
        // 10 minutes
        delete oauthStateStore[key]
      }
    })

    // Construct the Supabase OAuth URL
    // In a real implementation, this would use the Supabase OAuth API
    // For this demo, we'll simulate the OAuth flow
    const authUrl = `https://supabase.com/dashboard/sign-in?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`

    return NextResponse.json({
      authUrl,
      state,
    })
  } catch (error) {
    console.error("Supabase OAuth init error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
