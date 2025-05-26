"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Send, Bot, User, Loader2, StopCircle, Github, Database, Server, Sparkles, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  typing?: boolean
  model?: string
  tokens?: number
}

interface ModelOption {
  id: string
  name: string
  provider: string
  description: string
  maxTokens: number
}

interface Connection {
  id: string
  type: string
  name: string
  status: string
  metadata?: any
}

interface EnhancedChatInterfaceProps {
  connections?: Connection[]
  initialMessages?: Message[]
  onModelChange?: (model: ModelOption) => void
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Most capable multimodal model",
    maxTokens: 128000,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and efficient model",
    maxTokens: 128000,
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Advanced reasoning and analysis",
    maxTokens: 200000,
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    description: "Powerful multimodal capabilities",
    maxTokens: 32000,
  },
]

export function EnhancedChatInterface({
  connections = [],
  initialMessages = [],
  onModelChange,
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[0])
  const [showModelSelector, setShowModelSelector] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, currentResponse, isTyping])

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: `Hello! I'm your AI assistant powered by ${selectedModel.name}. I have access to your connected services and can help you with various tasks. How can I assist you today?`,
        timestamp: new Date(),
        model: selectedModel.name,
      }
      setMessages([welcomeMessage])
    }
  }, [selectedModel.name, messages.length])

  const handleModelChange = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
    if (model) {
      setSelectedModel(model)
      setShowModelSelector(false) // Close selector immediately
      onModelChange?.(model)

      // Add system message about model change with enhanced styling
      const systemMessage: Message = {
        id: `model-change-${Date.now()}`,
        role: "system",
        content: `🔄 Switched to ${model.name} (${model.provider}) - ${model.description}`,
        timestamp: new Date(),
        model: model.name,
      }
      setMessages((prev) => [...prev, systemMessage])

      toast({
        title: "Model Changed",
        description: `Now using ${model.name} by ${model.provider}`,
        duration: 3000,
      })
    }
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!input.trim() || isLoading) {
        return
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setIsLoading(true)
      setIsTyping(true)
      setCurrentResponse("")

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch("/api/agent/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            model: selectedModel.id,
            connections: connections.map((conn) => ({
              id: conn.id,
              type: conn.type,
              name: conn.name,
            })),
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to get response from assistant")
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ""

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.type === "text-delta") {
                    fullResponse += data.text
                    setCurrentResponse(fullResponse)
                  } else if (data.type === "tool-call") {
                    // Handle tool calls
                    console.log("Tool call:", data)
                  } else if (data.type === "done") {
                    break
                  }
                } catch (parseError) {
                  console.error("Error parsing streaming data:", parseError)
                }
              }
            }
          }
        }

        // Add complete assistant message
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullResponse,
          timestamp: new Date(),
          model: selectedModel.name,
          tokens: fullResponse.split(" ").length,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setCurrentResponse("")
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Request was aborted")
          return
        }

        console.error("Chat error:", error)

        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
          timestamp: new Date(),
          model: selectedModel.name,
        }

        setMessages((prev) => [...prev, errorMessage])

        toast({
          title: "Error",
          description: error.message || "An error occurred while processing your message.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setIsTyping(false)
        abortControllerRef.current = null
      }
    },
    [input, isLoading, messages, selectedModel, connections, toast],
  )

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setIsTyping(false)
      setCurrentResponse("")

      toast({
        title: "Generation Stopped",
        description: "The response generation has been stopped.",
      })
    }
  }

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "github":
        return <Github className="h-3 w-3" />
      case "supabase":
        return <Database className="h-3 w-3" />
      case "mcp":
        return <Server className="h-3 w-3" />
      default:
        return null
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Keyboard shortcut for model switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "m") {
        event.preventDefault()
        setShowModelSelector(!showModelSelector)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showModelSelector])

  return (
    <Card className="flex flex-col h-[700px] w-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">AI Assistant</CardTitle>
            </div>

            {/* Model Selector */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className={`h-8 transition-all duration-200 ${
                      showModelSelector ? "bg-blue-100 border-blue-300" : ""
                    }`}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {selectedModel.name}
                    <span className="ml-1 text-xs opacity-60">({selectedModel.provider})</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-medium">{selectedModel.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedModel.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max tokens: {selectedModel.maxTokens.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Press Ctrl+M to switch models</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            {/* Connected Services */}
            {connections.length > 0 && (
              <div className="flex items-center gap-1">
                {connections.slice(0, 3).map((connection) => (
                  <TooltipProvider key={connection.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          {getConnectionIcon(connection.type)}
                          <span className="ml-1 capitalize">{connection.type}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{connection.name}</p>
                        <p className="text-xs text-muted-foreground">Status: {connection.status}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {connections.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    +{connections.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Stop Generation Button */}
            {isLoading && (
              <Button variant="outline" size="sm" onClick={stopGeneration}>
                <StopCircle className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Model Selector Dropdown */}
        {showModelSelector && (
          <div className="mt-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm">
            <h4 className="text-sm font-medium mb-3 text-gray-700">Choose AI Model</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_MODELS.map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModel.id === model.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModelChange(model.id)}
                  className={`justify-start h-auto p-4 transition-all duration-200 ${
                    selectedModel.id === model.id
                      ? "bg-blue-600 text-white shadow-md scale-105"
                      : "hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <div className="text-left w-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{model.name}</span>
                      {selectedModel.id === model.id && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <div className="text-xs opacity-80 mb-1">{model.provider}</div>
                    <div className="text-xs opacity-70">{model.description}</div>
                    <div className="text-xs opacity-60 mt-1">Max tokens: {model.maxTokens.toLocaleString()}</div>
                  </div>
                </Button>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              💡 You can switch models anytime during your conversation
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex items-start gap-3 max-w-[85%]">
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8 bg-blue-600">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : message.role === "system"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {message.model && <span className="ml-2">{message.model}</span>}
                      {message.tokens && <span className="ml-2">{message.tokens} tokens</span>}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 bg-gray-600">
                      <AvatarFallback>
                        <User className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && currentResponse && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <Avatar className="h-8 w-8 bg-blue-600">
                    <AvatarFallback>
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg p-3 bg-muted">
                    <div className="whitespace-pre-wrap break-words">{currentResponse}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs opacity-70">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !currentResponse && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-blue-600">
                    <AvatarFallback>
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg p-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            placeholder={`Message ${selectedModel.name}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
