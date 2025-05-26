import { NextResponse } from "next/server"

// In a real app, you'd use a database or secure storage
// For demo purposes, we'll use in-memory storage
const apiKeyStorage = new Map<string, string>()

export async function GET() {
  try {
    const keys: Record<string, string> = {}

    // Convert Map to object (in production, decrypt keys here)
    for (const [provider, key] of apiKeyStorage.entries()) {
      keys[provider] = key
    }

    return NextResponse.json({
      success: true,
      keys,
    })
  } catch (error) {
    console.error("Get API keys error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve API keys",
      },
      { status: 500 },
    )
  }
}
