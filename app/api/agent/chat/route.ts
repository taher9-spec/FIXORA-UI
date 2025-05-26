import { NextResponse } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { groq } from "@ai-sdk/groq"
import { anthropic } from "@ai-sdk/anthropic"
import { getConfigValue } from "@/lib/config/config-manager"
import { decryptSecret } from "@/lib/utils/encryption"
import { getConnectionById } from "@/lib/connections-service"
import { getGitHubTokens } from "@/lib/github/token-manager"

export async function POST(request: Request) {
  try {
    const { messages, connections = [], stream = false } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required and must be a non-empty array" }, { status: 400 })
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

    // Create tools based on available connections
    const tools = await createToolsFromConnections(connections)

    // Ensure we have a system message
    const systemMessage = {
      role: "system",
      content: `You are a helpful AI assistant with access to various tools and services. You can help users with:

${
  connections.length > 0
    ? `Connected Services:
${connections.map((conn) => `- ${conn.name} (${conn.type}): Available for ${getServiceCapabilities(conn.type)}`).join("\n")}

`
    : ""
}Available Tools:
${tools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")}

Always be helpful, accurate, and use the appropriate tools when needed to assist the user.`,
    }

    const formattedMessages = [systemMessage, ...messages.filter((msg: any) => msg.role !== "system")]

    if (stream) {
      // Return streaming response
      const { textStream, toolCalls } = streamText({
        model,
        messages: formattedMessages,
        tools: tools.length > 0 ? Object.fromEntries(tools.map((tool) => [tool.name, tool])) : undefined,
      })

      // Create a readable stream
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const delta of textStream) {
              const chunk = encoder.encode(`data: ${JSON.stringify({ type: "text-delta", text: delta })}\n\n`)
              controller.enqueue(chunk)
            }

            const doneChunk = encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            controller.enqueue(doneChunk)
            controller.close()
          } catch (error) {
            console.error("Streaming error:", error)
            controller.error(error)
          }
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } else {
      // Return regular response
      const { text, toolCalls } = await streamText({
        model,
        messages: formattedMessages,
        tools: tools.length > 0 ? Object.fromEntries(tools.map((tool) => [tool.name, tool])) : undefined,
      })

      return NextResponse.json({
        text,
        toolCalls,
      })
    }
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
    case "openroute":
      return openai(modelId, {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        defaultHeaders: {
          "HTTP-Referer": "https://fixora.vercel.app",
          "X-Title": "Fixora UI",
        },
      })
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
    case "openroute":
      return "openai/gpt-4o"
    default:
      return "gpt-4o"
  }
}

function getServiceCapabilities(type: string): string {
  switch (type) {
    case "github":
      return "repository management, code analysis, issue tracking"
    case "supabase":
      return "database operations, real-time data, authentication"
    case "mcp":
      return "context storage, memory management"
    default:
      return "various operations"
  }
}

async function createToolsFromConnections(connections: any[]) {
  const tools: any[] = []

  for (const connection of connections) {
    try {
      const fullConnection = await getConnectionById(connection.id)
      if (!fullConnection) continue

      switch (connection.type) {
        case "github":
          const githubTools = await createGitHubTools(fullConnection)
          tools.push(...githubTools)
          break
        case "supabase":
          const supabaseTools = await createSupabaseTools(fullConnection)
          tools.push(...supabaseTools)
          break
        case "mcp":
          const mcpTools = await createMCPTools(fullConnection)
          tools.push(...mcpTools)
          break
      }
    } catch (error) {
      console.error(`Error creating tools for connection ${connection.id}:`, error)
    }
  }

  return tools
}

async function createGitHubTools(connection: any) {
  const tokens = await getGitHubTokens(connection.id)
  if (!tokens) return []

  return [
    {
      name: "fetchGitHubUser",
      description: "Fetch GitHub user profile information",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "GitHub username (optional, defaults to authenticated user)",
          },
        },
      },
      execute: async ({ username }: { username?: string }) => {
        const url = username ? `https://api.github.com/users/${username}` : "https://api.github.com/user"

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Fixora-UI/1.0",
          },
        })

        if (!response.ok) {
          return { error: `GitHub API error: ${response.status}` }
        }

        return await response.json()
      },
    },
    {
      name: "fetchGitHubRepos",
      description: "Fetch GitHub repositories for the authenticated user",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["all", "owner", "member"],
            description: "Repository type to fetch",
          },
          sort: {
            type: "string",
            enum: ["created", "updated", "pushed", "full_name"],
            description: "Sort repositories by",
          },
          per_page: {
            type: "number",
            description: "Number of repositories to fetch (max 100)",
          },
        },
      },
      execute: async ({ type = "owner", sort = "updated", per_page = 10 }: any) => {
        const response = await fetch(
          `https://api.github.com/user/repos?type=${type}&sort=${sort}&per_page=${per_page}`,
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Fixora-UI/1.0",
            },
          },
        )

        if (!response.ok) {
          return { error: `GitHub API error: ${response.status}` }
        }

        return await response.json()
      },
    },
  ]
}

async function createSupabaseTools(connection: any) {
  // Implement Supabase tools
  return []
}

async function createMCPTools(connection: any) {
  // Implement MCP tools
  return []
}
