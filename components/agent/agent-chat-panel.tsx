"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, User, Bot } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { groq } from "@ai-sdk/groq"
import { anthropic } from "@ai-sdk/anthropic"
import { getConfigValue } from "@/lib/config/config-manager"
import { decryptSecret } from "@/lib/utils/encryption"
import { getConnectionById } from "@/lib/connections-service"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

interface AgentChatPanelProps {
  initialMessages?: Message[]
  tools?: any[]
}

export function AgentChatPanel({ initialMessages = [], tools = [] }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, currentAssistantMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) {
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsStreaming(true)
    setCurrentAssistantMessage("")

    try {
      // Get the AI provider and API key from config
      const provider = (await getConfigValue("ai_provider")) || "openai"
      const apiKeyEncrypted = await getConfigValue(`${provider}_api_key`)
      const modelId = (await getConfigValue(`${provider}_model_id`)) || getDefaultModelId(provider)

      if (!apiKeyEncrypted) {
        throw new Error(`No API key found for ${provider}`)
      }

      const apiKey = decryptSecret(apiKeyEncrypted)

      if (!apiKey) {
        throw new Error(`Failed to decrypt API key for ${provider}`)
      }

      // Get available connections for tools
      const connections = await getAvailableConnections()

      // Create the model based on the provider
      const model = createModel(provider, apiKey, modelId)

      // Stream the response
      const { textStream } = streamText({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        tools: tools.concat(await createConnectionTools(connections)),
      })

      let fullText = ""

      for await (const delta of textStream) {
        fullText += delta
        setCurrentAssistantMessage(fullText)
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: fullText,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setCurrentAssistantMessage("")
    } catch (error) {
      console.error("Chat error:", error)
      toast({
        title: "Error",
        description: error.message || "An error occurred while processing your message.",
        variant: "destructive",
      })

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${error.message || "An error occurred while processing your message."}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const createModel = (provider: string, apiKey: string, modelId: string) => {
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

  const getDefaultModelId = (provider: string) => {
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

  const getAvailableConnections = async () => {
    try {
      const response = await fetch("/api/connections")

      if (!response.ok) {
        throw new Error("Failed to fetch connections")
      }

      const data = await response.json()
      return data.connections || []
    } catch (error) {
      console.error("Error fetching connections:", error)
      return []
    }
  }

  const createConnectionTools = async (connections: any[]) => {
    const tools = []

    for (const connection of connections) {
      if (connection.type === "github") {
        tools.push({
          name: "fetchGitHubUserProfile",
          description: "Fetch the GitHub user profile",
          parameters: {
            type: "object",
            properties: {
              username: {
                type: "string",
                description: "The GitHub username",
              },
            },
            required: ["username"],
          },
          execute: async ({ username }: { username: string }) => {
            const conn = await getConnectionById(connection.id)
            const accessToken = conn?.credentials?.accessToken ? decryptSecret(conn.credentials.accessToken) : null

            if (!accessToken) {
              return { error: "GitHub access token not found" }
            }

            const response = await fetch(`https://api.github.com/users/${username}`, {
              headers: {
                Authorization: `token ${accessToken}`,
              },
            })

            if (!response.ok) {
              return { error: `GitHub API error: ${response.status}` }
            }

            return await response.json()
          },
        })
      } else if (connection.type === "mcp") {
        tools.push({
          name: "storeContext",
          description: "Store context in the MCP server",
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The content to store",
              },
              metadata: {
                type: "object",
                description: "Optional metadata",
              },
            },
            required: ["content"],
          },
          execute: async ({ content, metadata }: { content: string; metadata?: any }) => {
            const response = await fetch("/api/mcp/context", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                connectionId: connection.id,
                content,
                metadata,
              }),
            })

            if (!response.ok) {
              const error = await response.json()
              return { error: error.error || "Failed to store context" }
            }

            return await response.json()
          },
        })

        tools.push({
          name: "retrieveContext",
          description: "Retrieve context from the MCP server",
          parameters: {
            type: "object",
            properties: {
              contextId: {
                type: "string",
                description: "The ID of the context to retrieve",
              },
            },
            required: ["contextId"],
          },
          execute: async ({ contextId }: { contextId: string }) => {
            const response = await fetch(`/api/mcp/context/${connection.id}:${contextId}`)

            if (!response.ok) {
              const error = await response.json()
              return { error: error.error || "Failed to retrieve context" }
            }

            return await response.json()
          },
        })
      }
    }

    return tools
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle>Agent Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Start a conversation with the agent
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="flex items-start gap-2 max-w-[80%]">
                    {message.role !== "user" && (
                      <Avatar className="h-8 w-8 bg-primary">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </Avatar>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-50 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 bg-primary">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && currentAssistantMessage && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <Avatar className="h-8 w-8 bg-primary">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </Avatar>
                    <div className="rounded-lg p-3 bg-muted">
                      <div className="whitespace-pre-wrap">{currentAssistantMessage}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
