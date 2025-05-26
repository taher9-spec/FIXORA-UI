import { NextResponse } from "next/server"

// In a real app, you'd use a database or secure storage
// For demo purposes, we'll use in-memory storage
const apiKeyStorage = new Map<string, string>()

export async function POST(request: Request) {
  try {
    const { provider, apiKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 },
      )
    }

    // In production, encrypt the API key before storing
    apiKeyStorage.set(provider, apiKey)

    return NextResponse.json({
      success: true,
      message: "API key saved successfully",
    })
  } catch (error) {
    console.error("Save API key error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save API key",
      },
      { status: 500 },
    )
  }
}
