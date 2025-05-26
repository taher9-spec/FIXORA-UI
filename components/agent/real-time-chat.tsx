"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, User, Bot, AlertCircle, Github, Database, Server } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  typing?: boolean
  toolCalls?: any[]
  metadata?: any
}

interface Connection {
  id: string
  type: string
  name: string
  status: string
  metadata?: any
}

interface RealTimeChatProps {
  initialMessages?: Message[]
  connections?: Connection[]
}

export function RealTimeChat({ initialMessages = [], connections = [] }: RealTimeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [configError, setConfigError] = useState<string | null>(null)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)
  const [availableTools, setAvailableTools] = useState<string[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  // Check configuration and available tools on mount
  useEffect(() => {
    checkConfiguration()
    loadAvailableTools()
  }, [connections])

  // Add welcome message
  useEffect(() => {
    if (initialMessages.length === 0 && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm your AI assistant with access to your connected services. How can I help you today?",
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [initialMessages.length, messages.length])

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

  const checkConfiguration = async () => {
    try {
      const response = await fetch("/api/config/check")
      if (response.ok) {
        const data = await response.json()
        if (data.configured) {
          setIsConfigLoaded(true)
          setConfigError(null)
        } else {
          setConfigError(data.error || "Configuration incomplete")
        }
      } else {
        setConfigError("Failed to check configuration")
      }
    } catch (error) {
      console.error("Error checking configuration:", error)
      setConfigError("Failed to load configuration")
    }
  }

  const loadAvailableTools = () => {
    const tools: string[] = []

    connections.forEach((connection) => {
      switch (connection.type) {
        case "github":
          tools.push("GitHub Repository Access", "Issue Management", "Pull Requests")
          break
        case "supabase":
          tools.push("Database Queries", "Real-time Data", "Authentication")
          break
        case "mcp":
          tools.push("Context Storage", "Memory Management")
          break
      }
    })

    setAvailableTools(tools)
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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

      // Create abort controller for this request
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
          throw new Error(errorData.error || "Failed to get response from agent")
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

        // Add the complete assistant message
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullResponse,
          timestamp: new Date(),
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
    [input, isLoading, isConfigLoaded, configError, messages, connections, toast],
  )

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setIsTyping(false)
      setCurrentResponse("")
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

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            {connections.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {connections.slice(0, 3).map((connection) => (
                        <Badge key={connection.id} variant="secondary" className="text-xs px-2 py-1">
                          {getConnectionIcon(connection.type)}
                          <span className="ml-1">{connection.type}</span>
                        </Badge>
                      ))}
                      {connections.length > 3 && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          +{connections.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Connected Services:</p>
                      {connections.map((connection) => (
                        <p key={connection.id} className="text-xs">
                          {connection.name} ({connection.type})
                        </p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isLoading && (
              <Button variant="outline" size="sm" onClick={stopGeneration}>
                Stop
              </Button>
            )}
          </div>
        </div>
        {availableTools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {availableTools.slice(0, 4).map((tool) => (
              <Badge key={tool} variant="outline" className="text-xs">
                {tool}
              </Badge>
            ))}
            {availableTools.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{availableTools.length - 4} more
              </Badge>
            )}
          </div>
        )}
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
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex items-start gap-3 max-w-[85%]">
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    <div className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</div>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 bg-secondary">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}

            {isTyping && currentResponse && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <Avatar className="h-8 w-8 bg-primary">
                    <AvatarFallback>
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg p-3 bg-muted">
                    <div className="whitespace-pre-wrap break-words">{currentResponse}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs opacity-70">Typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoading && !currentResponse && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-primary">
                    <AvatarFallback>
                      <Bot className="h-4 w-4 text-primary-foreground" />
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
            placeholder={isConfigLoaded ? "Type your message..." : "Please configure API key first..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || !isConfigLoaded}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim() || !isConfigLoaded} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
