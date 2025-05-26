import { NextResponse } from "next/server"
import { getConfigValue } from "@/lib/config/config-manager"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const provider = url.searchParams.get("provider")

    if (!provider) {
      return NextResponse.json({ error: "Provider parameter is required" }, { status: 400 })
    }

    // Check if API key exists for the provider
    const apiKey = await getConfigValue(`${provider}_api_key`)

    return NextResponse.json({
      provider,
      configured: !!apiKey,
      hasKey: !!apiKey,
    })
  } catch (error) {
    console.error("Error checking API key:", error)
    return NextResponse.json({ error: "Failed to check API key status" }, { status: 500 })
  }
}
