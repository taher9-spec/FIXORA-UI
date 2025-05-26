import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { message, model, apiKey, provider, history } = await request.json()

    if (!message || !model || !apiKey || !provider) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Build conversation context
    const messages = [
      {
        role: "system",
        content: "You are a helpful AI assistant. Provide clear, concise, and accurate responses.",
      },
      // Add recent history for context (last 5 messages)
      ...history.slice(-5).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: message,
      },
    ]

    let response: any

    // Route to appropriate provider
    switch (provider) {
      case "openrouter":
        response = await callOpenRouter(messages, model, apiKey)
        break
      case "openai":
        response = await callOpenAI(messages, model, apiKey)
        break
      case "groq":
        response = await callGroq(messages, model, apiKey)
        break
      case "anthropic":
        response = await callAnthropic(messages, model, apiKey)
        break
      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 })
    }

    return NextResponse.json({
      response: response.content,
      model: model.name,
      provider: provider,
      usage: response.usage || null,
    })
  } catch (error: any) {
    console.error("Chat API error:", error)

    // Handle specific error types
    if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
      return NextResponse.json({ error: "Invalid API key. Please check your configuration." }, { status: 401 })
    }

    if (error.message?.includes("429") || error.message?.includes("rate limit")) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 })
    }

    if (error.message?.includes("quota") || error.message?.includes("billing")) {
      return NextResponse.json({ error: "API quota exceeded. Please check your billing settings." }, { status: 402 })
    }

    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}

async function callOpenRouter(messages: any[], model: any, apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Fixora AI Assistant",
    },
    body: JSON.stringify({
      model: model.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid response from OpenRouter API")
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  }
}

async function callOpenAI(messages: any[], model: any, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid response from OpenAI API")
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  }
}

async function callGroq(messages: any[], model: any, apiKey: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Groq API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid response from Groq API")
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  }
}

async function callAnthropic(messages: any[], model: any, apiKey: string) {
  // Convert OpenAI format to Anthropic format
  const systemMessage = messages.find((m) => m.role === "system")?.content || ""
  const conversationMessages = messages.filter((m) => m.role !== "system")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model.id,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.content?.[0]?.text) {
    throw new Error("Invalid response from Anthropic API")
  }

  return {
    content: data.content[0].text,
    usage: data.usage,
  }
}
