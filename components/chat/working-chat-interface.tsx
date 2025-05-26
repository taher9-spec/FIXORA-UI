"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Loader2, CheckCircle, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { persistentStorage } from "@/lib/storage/persistent-storage"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  model?: string
}

interface WorkingChatInterfaceProps {
  selectedModel: any
  onNeedConfiguration: () => void
}

export function WorkingChatInterface({ selectedModel, onNeedConfiguration }: WorkingChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    initializeChat()
  }, [selectedModel])

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  useEffect(() => {
    // Focus input when ready
    if (isReady && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isReady])

  const initializeChat = async () => {
    if (!selectedModel) {
      onNeedConfiguration()
      return
    }

    // Check if we have a valid API key for this model's provider
    const apiKey = persistentStorage.getApiKey(selectedModel.provider)
    const validationStatus = persistentStorage.getValidationStatus()

    if (!apiKey || !validationStatus[selectedModel.provider]) {
      toast({
        title: "API Key Required",
        description: `Please configure your ${selectedModel.provider} API key first.`,
        variant: "destructive",
      })
      onNeedConfiguration()
      return
    }

    setIsReady(true)

    // Add welcome message
    const welcomeMessage: Message = {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm ready to chat using ${selectedModel.name}. How can I help you today?`,
      timestamp: new Date(),
      model: selectedModel.name,
    }

    setMessages([welcomeMessage])

    toast({
      title: "🎉 Chat Ready!",
      description: `Connected to ${selectedModel.name}`,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading || !isReady) {
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

    try {
      // Get API key for the selected model's provider
      const apiKey = persistentStorage.getApiKey(selectedModel.provider)

      if (!apiKey) {
        throw new Error("API key not found")
      }

      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          model: selectedModel,
          apiKey: apiKey,
          provider: selectedModel.provider,
          history: messages.slice(-10), // Last 10 messages for context
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        model: selectedModel.name,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error("Chat error:", error)

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `I apologize, but I encountered an error: ${error.message}. Please try again or check your API key configuration.`,
        timestamp: new Date(),
        model: selectedModel.name,
      }

      setMessages((prev) => [...prev, errorMessage])

      toast({
        title: "Chat Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (!selectedModel) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Model Selected</h3>
          <p className="text-gray-500 mb-4">Please select a model to start chatting.</p>
          <Button onClick={onNeedConfiguration}>Select Model</Button>
        </CardContent>
      </Card>
    )
  }

  if (!isReady) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing Chat...</h3>
          <p className="text-gray-500">Setting up connection to {selectedModel.name}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px] w-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">AI Chat</CardTitle>
              <p className="text-sm text-gray-500">Powered by {selectedModel.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex items-start gap-3 max-w-[85%]">
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 bg-blue-600">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`rounded-lg p-3 ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                  >
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {message.model && <span className="ml-2">{message.model}</span>}
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

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-blue-600">
                    <AvatarFallback>
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg p-3 bg-gray-100">
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
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
