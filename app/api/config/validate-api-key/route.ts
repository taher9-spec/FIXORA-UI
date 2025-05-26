import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { provider, apiKey, testConnection } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        {
          valid: false,
          error: "Missing required parameters",
        },
        { status: 400 },
      )
    }

    // Validate the API key based on the provider
    const validationResult = await validateProviderKey(provider, apiKey, testConnection)

    return NextResponse.json(validationResult)
  } catch (error) {
    console.error("API key validation error:", error)
    return NextResponse.json(
      {
        valid: false,
        error: "Validation service error",
      },
      { status: 500 },
    )
  }
}

async function validateProviderKey(provider: string, apiKey: string, testConnection = false) {
  switch (provider) {
    case "openrouter":
      return await validateOpenRouterKey(apiKey, testConnection)
    case "openai":
      return await validateOpenAIKey(apiKey, testConnection)
    case "groq":
      return await validateGroqKey(apiKey, testConnection)
    case "anthropic":
      return await validateAnthropicKey(apiKey, testConnection)
    default:
      return {
        valid: false,
        error: `Validation not implemented for provider: ${provider}`,
      }
  }
}

async function validateOpenRouterKey(apiKey: string, testConnection: boolean) {
  try {
    // Format validation
    if (!apiKey.startsWith("sk-or-v1-")) {
      return {
        valid: false,
        error: "OpenRouter API key must start with 'sk-or-v1-'",
      }
    }

    if (testConnection) {
      // Test actual API connection
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://fixora.vercel.app",
          "X-Title": "Fixora UI",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: errorData.error?.message || `OpenRouter API error: ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        valid: true,
        testResults: {
          modelCount: data.data?.length || 0,
          models: data.data?.slice(0, 5).map((m: any) => m.id) || [],
        },
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("OpenRouter validation error:", error)
    return {
      valid: false,
      error: "Failed to validate OpenRouter API key - check your internet connection",
    }
  }
}

async function validateOpenAIKey(apiKey: string, testConnection: boolean) {
  try {
    // Format validation
    if (!apiKey.startsWith("sk-")) {
      return {
        valid: false,
        error: "OpenAI API key must start with 'sk-'",
      }
    }

    if (testConnection) {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: errorData.error?.message || `OpenAI API error: ${response.status}`,
        }
      }

      const data = await response.json()
      const gptModels = data.data?.filter((m: any) => m.id.includes("gpt")) || []

      return {
        valid: true,
        testResults: {
          modelCount: gptModels.length,
          models: gptModels.slice(0, 5).map((m: any) => m.id),
        },
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("OpenAI validation error:", error)
    return {
      valid: false,
      error: "Failed to validate OpenAI API key - check your internet connection",
    }
  }
}

async function validateGroqKey(apiKey: string, testConnection: boolean) {
  try {
    // Format validation
    if (!apiKey.startsWith("gsk_")) {
      return {
        valid: false,
        error: "GROQ API key must start with 'gsk_'",
      }
    }

    if (testConnection) {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: errorData.error?.message || `GROQ API error: ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        valid: true,
        testResults: {
          modelCount: data.data?.length || 0,
          models: data.data?.slice(0, 5).map((m: any) => m.id) || [],
        },
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("GROQ validation error:", error)
    return {
      valid: false,
      error: "Failed to validate GROQ API key - check your internet connection",
    }
  }
}

async function validateAnthropicKey(apiKey: string, testConnection: boolean) {
  try {
    // Format validation
    if (!apiKey.startsWith("sk-ant-")) {
      return {
        valid: false,
        error: "Anthropic API key must start with 'sk-ant-'",
      }
    }

    if (testConnection) {
      // For Anthropic, we'll test with a simple message request
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: errorData.error?.message || `Anthropic API error: ${response.status}`,
        }
      }

      return {
        valid: true,
        testResults: {
          modelCount: 3, // Claude models
          models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
        },
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("Anthropic validation error:", error)
    return {
      valid: false,
      error: "Failed to validate Anthropic API key - check your internet connection",
    }
  }
}
