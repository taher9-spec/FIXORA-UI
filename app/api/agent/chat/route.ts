import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { groq } from "@ai-sdk/groq"
import { anthropic } from "@ai-sdk/anthropic"
import { getConfigValue } from "@/lib/config/config-manager"
import { decryptSecret } from "@/lib/utils/encryption"

export async function POST(request: Request) {
  try {
    const { messages, tools = [] } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required and must be an array" }, { status: 400 })
    }

    // Get the AI provider and API key from config
    const provider = (await getConfigValue("ai_provider")) || "openai"
    const apiKeyEncrypted = await getConfigValue(`${provider}_api_key`)
    const modelId = (await getConfigValue(`${provider}_model_id`)) || getDefaultModelId(provider)

    if (!apiKeyEncrypted) {
      return NextResponse.json({ error: `No API key found for ${provider}` }, { status: 400 })
    }

    const apiKey = decryptSecret(apiKeyEncrypted)

    if (!apiKey) {
      return NextResponse.json({ error: `Failed to decrypt API key for ${provider}` }, { status: 400 })
    }

    // Create the model based on the provider
    const model = createModel(provider, apiKey, modelId)

    // Generate the response
    const { text, toolCalls } = await generateText({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    })

    return NextResponse.json({
      text,
      toolCalls,
    })
  } catch (error) {
    console.error("Agent chat error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}

function createModel(provider: string, apiKey: string, modelId: string) {
  switch (provider) {
    case "openai":
      return openai(modelId, { apiKey })
    case "groq":
      return groq(modelId, { apiKey })
    case "anthropic":
      return anthropic(modelId, { apiKey })
    default:
      return openai(modelId, { apiKey })
  }
}

function getDefaultModelId(provider: string) {
  switch (provider) {
    case "openai":
      return "gpt-4o"
    case "groq":
      return "llama3-70b-8192"
    case "anthropic":
      return "claude-3-opus-20240229"
    default:
      return "gpt-4o"
  }
}
