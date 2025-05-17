import { getConfigValue } from "@/lib/config/config-manager"
import { decryptSecret } from "@/lib/utils/encryption"

interface Model {
  id: string
  name: string
  contextLength?: number
}

export async function getModelsForProvider(provider: string): Promise<Model[]> {
  // Try to get the API key for the provider from the config
  const apiKeyConfig = await getConfigValue(`${provider}_api_key`)

  if (!apiKeyConfig) {
    // Return default models if no API key is configured
    return getDefaultModels(provider)
  }

  const apiKey = decryptSecret(apiKeyConfig)

  if (!apiKey) {
    // Return default models if API key decryption fails
    return getDefaultModels(provider)
  }

  // Fetch models from the provider's API
  try {
    switch (provider) {
      case "openai":
        return await fetchOpenAIModels(apiKey)
      case "groq":
        return await fetchGroqModels(apiKey)
      case "openroute":
        return await fetchOpenRouteModels(apiKey)
      case "anthropic":
        return await fetchAnthropicModels(apiKey)
      default:
        return getDefaultModels(provider)
    }
  } catch (error) {
    console.error(`Error fetching ${provider} models:`, error)
    // Fallback to default models
    return getDefaultModels(provider)
  }
}

function getDefaultModels(provider: string): Model[] {
  switch (provider) {
    case "openai":
      return [
        { id: "gpt-4o", name: "GPT-4o", contextLength: 128000 },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextLength: 128000 },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextLength: 16384 },
      ]
    case "groq":
      return [
        { id: "llama3-8b-8192", name: "Llama 3 8B", contextLength: 8192 },
        { id: "llama3-70b-8192", name: "Llama 3 70B", contextLength: 8192 },
        { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextLength: 32768 },
      ]
    case "openroute":
      return [
        { id: "openai/gpt-4o", name: "GPT-4o", contextLength: 128000 },
        { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", contextLength: 200000 },
        { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3 70B", contextLength: 8192 },
      ]
    case "anthropic":
      return [
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus", contextLength: 200000 },
        { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", contextLength: 200000 },
        { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", contextLength: 200000 },
      ]
    default:
      return []
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<Model[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()

  // Filter and map models
  return data.data
    .filter(
      (model: any) =>
        model.id.startsWith("gpt-") &&
        !model.id.includes("instruct") &&
        !model.id.includes("0301") &&
        !model.id.includes("0613"),
    )
    .map((model: any) => ({
      id: model.id,
      name: formatModelName(model.id),
      contextLength: getContextLengthForModel(model.id),
    }))
}

async function fetchGroqModels(apiKey: string): Promise<Model[]> {
  const response = await fetch("https://api.groq.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()

  // Map models
  return data.data.map((model: any) => ({
    id: model.id,
    name: formatModelName(model.id),
    contextLength: model.context_length || 4096,
  }))
}

async function fetchOpenRouteModels(apiKey: string): Promise<Model[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`OpenRoute API error: ${response.status}`)
  }

  const data = await response.json()

  // Map models
  return data.data.map((model: any) => ({
    id: model.id,
    name: formatModelName(model.id),
    contextLength: model.context_length || 4096,
  }))
}

async function fetchAnthropicModels(apiKey: string): Promise<Model[]> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json()

  // Map models
  return data.models.map((model: any) => ({
    id: model.id,
    name: formatModelName(model.id),
    contextLength: model.context_window || 4096,
  }))
}

function formatModelName(modelId: string): string {
  // Format model IDs to be more readable
  // e.g., "gpt-4-turbo" -> "GPT-4 Turbo"

  // Handle OpenRoute models which have provider prefix
  if (modelId.includes("/")) {
    const parts = modelId.split("/")
    const provider = parts[0]
    const model = parts[1]

    return `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${formatModelName(model)}`
  }

  // Remove date suffixes
  const withoutDate = modelId.replace(/-\d{8}$/, "")

  // Replace hyphens with spaces
  const withSpaces = withoutDate.replace(/-/g, " ")

  // Capitalize words
  return withSpaces
    .split(" ")
    .map((word) => {
      // Handle special cases
      if (word.toLowerCase() === "gpt") return "GPT"
      if (word.toLowerCase() === "3.5") return "3.5"
      if (word.toLowerCase() === "4o") return "4o"

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

function getContextLengthForModel(modelId: string): number {
  // Return known context lengths for common models
  const contextLengths: Record<string, number> = {
    "gpt-4o": 128000,
    "gpt-4-turbo": 128000,
    "gpt-4": 8192,
    "gpt-3.5-turbo": 16384,
    "gpt-3.5-turbo-16k": 16384,
  }

  // Check for exact matches
  if (contextLengths[modelId]) {
    return contextLengths[modelId]
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(contextLengths)) {
    if (modelId.startsWith(key)) {
      return value
    }
  }

  // Default context length
  return 4096
}
