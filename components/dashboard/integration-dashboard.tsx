"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StreamlinedApiManager } from "@/components/api-keys/streamlined-api-manager"
import { SmartModelSelector } from "@/components/models/smart-model-selector"
import { WorkingChatInterface } from "@/components/chat/working-chat-interface"
import { EnhancedGitHubConnector } from "@/components/github/enhanced-github-connector"
import { EnhancedSupabaseConnector } from "@/components/supabase/enhanced-supabase-connector"
import { CheckCircle, Github, Database, Key, Bot } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { persistentStorage } from "@/lib/storage/persistent-storage"

export function IntegrationDashboard() {
  const [activeTab, setActiveTab] = useState("setup")
  const [connections, setConnections] = useState<any[]>([])
  const [validProviders, setValidProviders] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadPersistedData()
    loadConnections()
  }, [])

  const loadPersistedData = () => {
    // Load validation status
    const validationStatus = persistentStorage.getValidationStatus()
    const validProvidersList = Object.entries(validationStatus)
      .filter(([_, isValid]) => isValid)
      .map(([provider, _]) => provider)

    setValidProviders(validProvidersList)

    // Load selected model
    const savedModel = persistentStorage.getSelectedModel()
    if (savedModel && validProvidersList.includes(savedModel.provider)) {
      setSelectedModel(savedModel)
    }

    // Auto-navigate based on state
    if (validProvidersList.length > 0) {
      if (savedModel && validProvidersList.includes(savedModel.provider)) {
        setActiveTab("chat")
      } else {
        setActiveTab("models")
      }
    } else {
      setActiveTab("setup")
    }
  }

  const loadConnections = async () => {
    try {
      const response = await fetch("/api/connections")
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error("Error loading connections:", error)
    }
  }

  const handleKeyConfigured = (provider: string, isValid: boolean) => {
    if (isValid) {
      setValidProviders((prev) => [...prev.filter((p) => p !== provider), provider])
    } else {
      setValidProviders((prev) => prev.filter((p) => p !== provider))
    }
  }

  const handleReadyToChat = () => {
    if (validProviders.length > 0) {
      setActiveTab("models")
    }
  }

  const handleModelSelect = (model: any) => {
    setSelectedModel(model)
    setActiveTab("chat")
  }

  const handleNeedApiKey = () => {
    setActiveTab("setup")
  }

  const handleNeedConfiguration = () => {
    if (validProviders.length === 0) {
      setActiveTab("setup")
    } else {
      setActiveTab("models")
    }
  }

  const handleConnectionSuccess = (connectionId: string, userInfo?: any) => {
    loadConnections()
    toast({
      title: "Connection Successful",
      description: "Service connected successfully!",
    })
  }

  const handleConnectionError = (error: string) => {
    toast({
      title: "Connection Failed",
      description: error,
      variant: "destructive",
    })
  }

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "github":
        return <Github className="h-4 w-4" />
      case "supabase":
        return <Database className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Fixora AI Assistant</h1>
          <p className="text-lg text-gray-600">Your AI-powered assistant with real connections</p>
        </div>

        {/* Status Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">API Keys:</span>
              <Badge variant={validProviders.length > 0 ? "default" : "secondary"}>
                {validProviders.length} configured
              </Badge>
            </div>

            {selectedModel && (
              <>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Model:</span>
                  <Badge variant="outline">{selectedModel.name}</Badge>
                </div>
              </>
            )}

            {connections.length > 0 && (
              <>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Services:</span>
                  {connections.slice(0, 2).map((connection) => (
                    <div key={connection.id} className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                      {getConnectionIcon(connection.type)}
                      <span className="text-xs font-medium text-green-800">{connection.type}</span>
                    </div>
                  ))}
                  {connections.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{connections.length - 2}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-4 w-fit">
              <TabsTrigger value="setup" className="px-6">
                🔑 Setup
              </TabsTrigger>
              <TabsTrigger value="models" className="px-6" disabled={validProviders.length === 0}>
                🤖 Models
              </TabsTrigger>
              <TabsTrigger value="chat" className="px-6" disabled={!selectedModel}>
                💬 Chat
              </TabsTrigger>
              <TabsTrigger value="connections" className="px-6">
                🔗 Services
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="setup" className="space-y-4">
            <StreamlinedApiManager onKeyConfigured={handleKeyConfigured} onReadyToChat={handleReadyToChat} />
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <SmartModelSelector
              onModelSelect={handleModelSelect}
              onNeedApiKey={handleNeedApiKey}
              validProviders={validProviders}
            />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <WorkingChatInterface selectedModel={selectedModel} onNeedConfiguration={handleNeedConfiguration} />
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnhancedGitHubConnector onSuccess={handleConnectionSuccess} onError={handleConnectionError} />
              <EnhancedSupabaseConnector
                onSuccess={(id) => handleConnectionSuccess(id)}
                onError={handleConnectionError}
              />
            </div>

            {connections.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Connected Services</h3>
                  <div className="space-y-3">
                    {connections.map((connection) => (
                      <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getConnectionIcon(connection.type)}
                          <div>
                            <div className="font-medium">{connection.name}</div>
                            <div className="text-sm text-muted-foreground">{connection.type}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Connected</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
