"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, User, Bot, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { groq } from "@ai-sdk/groq"
import { anthropic } from "@ai-sdk/anthropic"
import { getConfigValue } from "@/lib/config/config-manager"
import { decryptSecret } from "@/lib/utils/encryption"
import { getConnectionById } from "@/lib/connections-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  const [configError, setConfigError] = useState<string | null>(null)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Check configuration on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        // Get the AI provider and API key from config
        const provider = await getConfigValue("ai_provider")
        if (!provider) {
          setConfigError("No AI provider configured. Please set up your API key in the API Keys tab.")
          return
        }

        const apiKeyEncrypted = await getConfigValue(`${provider}_api_key`)
        if (!apiKeyEncrypted) {
          setConfigError(`No API key found for ${provider}. Please set up your API key in the API Keys tab.`)
          return
        }

        const modelId = await getConfigValue(`${provider}_model_id`)
        if (!modelId) {
          setConfigError(`No model selected for ${provider}. Please select a model in the Models tab.`)
          return
        }

        setIsConfigLoaded(true)
      } catch (error) {
        console.error("Error checking configuration:", error)
        setConfigError("Failed to load configuration. Please check your settings.")
      }
    }

    checkConfig()
  }, [])

  // Add a welcome message when the component mounts
  useEffect(() => {
    if (initialMessages.length === 0 && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm your AI assistant. How can I help you today?",
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [initialMessages.length, messages.length])

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

    if (!isConfigLoaded) {
      toast({
        title: "Configuration Error",
        description: configError || "Please configure your API key and model before using the chat.",
        variant: "destructive",
      })
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
        throw new Error(`No API key found for ${provider}. Please configure your API key in the API Keys tab.`)
      }

      const apiKey = decryptSecret(apiKeyEncrypted)

      if (!apiKey) {
        throw new Error(`Failed to decrypt API key for ${provider}. Please reconfigure your API key.`)
      }

      // Get available connections for tools
      const connections = await getAvailableConnections()

      // Create the model based on the provider
      const model = createModel(provider, apiKey, modelId)

      // Prepare messages array with a system message
      const formattedMessages = [
        {
          role: "system",
          content: "You are a helpful AI assistant that can answer questions and use tools when necessary.",
        },
        ...messages
          .filter((msg) => msg.role !== "system") // Filter out any existing system messages
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        {
          role: "user",
          content: input,
        },
      ]

      // Stream the response
      const { textStream } = streamText({
        model,
        messages: formattedMessages,
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

  const getDefaultModelId = (provider: string) => {
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
        {configError && (
          <Alert variant="destructive" className="mx-4 mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        )}

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
            disabled={isLoading || !isConfigLoaded}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim() || !isConfigLoaded}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
