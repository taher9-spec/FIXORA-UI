interface ValidationResult {
  valid: boolean
  error?: string
  models?: string[]
}

export async function validateApiKey(provider: string, apiKey: string, modelId?: string): Promise<ValidationResult> {
  switch (provider) {
    case "openai":
      return validateOpenAIKey(apiKey, modelId)
    case "groq":
      return validateGroqKey(apiKey, modelId)
    case "openroute":
      return validateOpenRouteKey(apiKey, modelId)
    case "anthropic":
      return validateAnthropicKey(apiKey, modelId)
    default:
      return {
        valid: false,
        error: `Validation not implemented for provider: ${provider}`,
      }
  }
}

async function validateOpenAIKey(apiKey: string, modelId?: string): Promise<ValidationResult> {
  try {
    // Test the API key by listing models
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        valid: false,
        error: error.error?.message || `OpenAI API error: ${response.status}`,
      }
    }

    const data = await response.json()

    // If a specific model was provided, check if it exists
    if (modelId) {
      const modelExists = data.data.some((model: any) => model.id === modelId)

      if (!modelExists) {
        return {
          valid: false,
          error: `Model ${modelId} not found or not available with your API key`,
        }
      }
    }

    // Extract available models
    const models = data.data.filter((model: any) => model.id.startsWith("gpt-")).map((model: any) => model.id)

    return {
      valid: true,
      models,
    }
  } catch (error) {
    console.error("OpenAI key validation error:", error)
    return {
      valid: false,
      error: error.message || "Failed to validate OpenAI API key",
    }
  }
}

async function validateGroqKey(apiKey: string, modelId?: string): Promise<ValidationResult> {
  try {
    // Test the API key by listing models
    const response = await fetch("https://api.groq.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        valid: false,
        error: error.error?.message || `Groq API error: ${response.status}`,
      }
    }

    const data = await response.json()

    // If a specific model was provided, check if it exists
    if (modelId) {
      const modelExists = data.data.some((model: any) => model.id === modelId)

      if (!modelExists) {
        return {
          valid: false,
          error: `Model ${modelId} not found or not available with your API key`,
        }
      }
    }

    // Extract available models
    const models = data.data.map((model: any) => model.id)

    return {
      valid: true,
      models,
    }
  } catch (error) {
    console.error("Groq key validation error:", error)
    return {
      valid: false,
      error: error.message || "Failed to validate Groq API key",
    }
  }
}

async function validateOpenRouteKey(apiKey: string, modelId?: string): Promise<ValidationResult> {
  try {
    // Test the API key by listing models
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        valid: false,
        error: error.error?.message || `OpenRoute API error: ${response.status}`,
      }
    }

    const data = await response.json()

    // If a specific model was provided, check if it exists
    if (modelId) {
      const modelExists = data.data.some((model: any) => model.id === modelId)

      if (!modelExists) {
        return {
          valid: false,
          error: `Model ${modelId} not found or not available with your API key`,
        }
      }
    }

    // Extract available models
    const models = data.data.map((model: any) => model.id)

    return {
      valid: true,
      models,
    }
  } catch (error) {
    console.error("OpenRoute key validation error:", error)
    return {
      valid: false,
      error: error.message || "Failed to validate OpenRoute API key",
    }
  }
}

async function validateAnthropicKey(apiKey: string, modelId?: string): Promise<ValidationResult> {
  try {
    // Test the API key by listing models
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        valid: false,
        error: error.error?.message || `Anthropic API error: ${response.status}`,
      }
    }

    const data = await response.json()

    // If a specific model was provided, check if it exists
    if (modelId) {
      const modelExists = data.models.some((model: any) => model.id === modelId)

      if (!modelExists) {
        return {
          valid: false,
          error: `Model ${modelId} not found or not available with your API key`,
        }
      }
    }

    // Extract available models
    const models = data.models.map((model: any) => model.id)

    return {
      valid: true,
      models,
    }
  } catch (error) {
    console.error("Anthropic key validation error:", error)
    return {
      valid: false,
      error: error.message || "Failed to validate Anthropic API key",
    }
  }
}
