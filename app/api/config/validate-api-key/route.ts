import { NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-keys/validation"

export async function POST(request: Request) {
  try {
    const { provider, apiKey, modelId } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ valid: false, error: "Missing required parameters" }, { status: 400 })
    }

    const result = await validateApiKey(provider, apiKey, modelId)

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      models: result.models,
    })
  } catch (error) {
    console.error("API key validation error:", error)
    return NextResponse.json({ valid: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
