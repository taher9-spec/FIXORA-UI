import { NextResponse } from "next/server"
import { getConfigValue } from "@/lib/config/config-manager"

export async function GET() {
  try {
    // Check if AI provider is configured
    const provider = await getConfigValue("ai_provider")
    if (!provider) {
      return NextResponse.json({
        configured: false,
        error: "No AI provider configured. Please set up your API key in the API Keys tab.",
      })
    }

    // Check if API key exists for the provider
    const apiKey = await getConfigValue(`${provider}_api_key`)
    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        error: `No API key found for ${provider}. Please configure your API key.`,
      })
    }

    // Check if model is selected
    const modelId = await getConfigValue(`${provider}_model_id`)
    if (!modelId) {
      return NextResponse.json({
        configured: false,
        error: `No model selected for ${provider}. Please select a model.`,
      })
    }

    return NextResponse.json({
      configured: true,
      provider,
      modelId,
    })
  } catch (error) {
    console.error("Error checking configuration:", error)
    return NextResponse.json(
      {
        configured: false,
        error: "Failed to check configuration",
      },
      { status: 500 },
    )
  }
}
