"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, Loader2, ExternalLink, Zap, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { persistentStorage } from "@/lib/storage/persistent-storage"

interface StreamlinedApiManagerProps {
  onKeyConfigured: (provider: string, isValid: boolean) => void
  onReadyToChat: () => void
}

export function StreamlinedApiManager({ onKeyConfigured, onReadyToChat }: StreamlinedApiManagerProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [validationStatus, setValidationStatus] = useState<Record<string, "idle" | "validating" | "valid" | "invalid">>(
    {},
  )
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const providers = [
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "100+ models, best value, free tier",
      icon: "🔀",
      website: "https://openrouter.ai/keys",
      keyFormat: "sk-or-v1-",
      recommended: true,
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Official GPT-4o access",
      icon: "🤖",
      website: "https://platform.openai.com/api-keys",
      keyFormat: "sk-",
      recommended: false,
    },
    {
      id: "groq",
      name: "GROQ",
      description: "Ultra-fast inference, free tier",
      icon: "⚡",
      website: "https://console.groq.com/keys",
      keyFormat: "gsk_",
      recommended: false,
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude models, advanced reasoning",
      icon: "🧠",
      website: "https://console.anthropic.com/settings/keys",
      keyFormat: "sk-ant-",
      recommended: false,
    },
  ]

  useEffect(() => {
    loadPersistedData()
  }, [])

  const loadPersistedData = () => {
    // Load saved API keys
    const savedKeys = persistentStorage.getApiKeys()
    setApiKeys(savedKeys)

    // Load validation status
    const savedStatus = persistentStorage.getValidationStatus()
    const statusMap: Record<string, "idle" | "validating" | "valid" | "invalid"> = {}
    Object.entries(savedStatus).forEach(([provider, isValid]) => {
      statusMap[provider] = isValid ? "valid" : "idle"
    })
    setValidationStatus(statusMap)

    // Auto-validate saved keys
    Object.entries(savedKeys).forEach(([provider, key]) => {
      if (key && savedStatus[provider]) {
        // Key was previously valid, mark as valid
        setValidationStatus((prev) => ({ ...prev, [provider]: "valid" }))
        onKeyConfigured(provider, true)
      }
    })
  }

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }))
    setValidationStatus((prev) => ({ ...prev, [provider]: "idle" }))
    setValidationErrors((prev) => ({ ...prev, [provider]: "" }))

    // Save immediately to prevent data loss
    if (value) {
      persistentStorage.saveApiKey(provider, value)
    }
  }

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  const validateAndSaveKey = async (provider: string) => {
    const apiKey = apiKeys[provider]
    if (!apiKey) return

    setValidationStatus((prev) => ({ ...prev, [provider]: "validating" }))
    setIsLoading(true)

    try {
      const response = await fetch("/api/config/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, testConnection: true }),
      })

      const data = await response.json()

      if (data.valid) {
        setValidationStatus((prev) => ({ ...prev, [provider]: "valid" }))
        persistentStorage.saveApiKey(provider, apiKey)
        persistentStorage.saveValidationStatus(provider, true)
        onKeyConfigured(provider, true)

        toast({
          title: "🎉 Success!",
          description: `${providers.find((p) => p.id === provider)?.name} is ready to use!`,
        })

        // Auto-navigate to chat if this is the first valid key
        const validKeys = Object.values(validationStatus).filter((status) => status === "valid").length
        if (validKeys === 0) {
          setTimeout(() => {
            onReadyToChat()
          }, 1500)
        }
      } else {
        setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
        setValidationErrors((prev) => ({ ...prev, [provider]: data.error || "Invalid API key" }))
        persistentStorage.saveValidationStatus(provider, false)
        onKeyConfigured(provider, false)

        toast({
          title: "❌ Invalid Key",
          description: data.error || "Please check your API key",
          variant: "destructive",
        })
      }
    } catch (error) {
      setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
      setValidationErrors((prev) => ({ ...prev, [provider]: "Connection failed - please try again" }))
      onKeyConfigured(provider, false)

      toast({
        title: "Connection Error",
        description: "Could not validate API key - check your internet connection",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (provider: string) => {
    const status = validationStatus[provider]
    switch (status) {
      case "validating":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "invalid":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Key className="h-4 w-4 text-gray-400" />
    }
  }

  const getValidKeysCount = () => {
    return Object.values(validationStatus).filter((status) => status === "valid").length
  }

  const hasAnyValidKey = () => {
    return getValidKeysCount() > 0
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Configure API Key</h2>
        <p className="text-gray-600">Choose any provider to get started - you only need one!</p>
        {hasAnyValidKey() && (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">
              {getValidKeysCount()} provider{getValidKeysCount() > 1 ? "s" : ""} configured
            </span>
          </div>
        )}
      </div>

      {hasAnyValidKey() && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">Ready to Chat!</h3>
            <p className="text-green-700 mb-4">Your API key is configured and working perfectly.</p>
            <Button onClick={onReadyToChat} className="bg-green-600 hover:bg-green-700">
              Start Chatting Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className={`transition-all ${
              provider.recommended ? "border-blue-200 bg-blue-50" : ""
            } ${validationStatus[provider.id] === "valid" ? "border-green-200 bg-green-50" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {provider.name}
                      {provider.recommended && <Badge className="bg-blue-600">Recommended</Badge>}
                      {validationStatus[provider.id] === "valid" && (
                        <Badge className="bg-green-600">✅ Connected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                </div>
                {getStatusIcon(provider.id)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${provider.id}-key`}>API Key</Label>
                <div className="relative">
                  <Input
                    id={`${provider.id}-key`}
                    type={showKeys[provider.id] ? "text" : "password"}
                    placeholder={`${provider.keyFormat}...`}
                    value={apiKeys[provider.id] || ""}
                    onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKeyVisibility(provider.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    {showKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={provider.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get Key
                  </a>
                </Button>
                <Button
                  onClick={() => validateAndSaveKey(provider.id)}
                  disabled={!apiKeys[provider.id] || validationStatus[provider.id] === "validating"}
                  className="flex-1"
                >
                  {validationStatus[provider.id] === "validating" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : validationStatus[provider.id] === "valid" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </div>

              {validationStatus[provider.id] === "valid" && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">✅ Ready to use!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your {provider.name} API key is working perfectly.
                  </AlertDescription>
                </Alert>
              )}

              {validationStatus[provider.id] === "invalid" && validationErrors[provider.id] && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>❌ Connection Failed</AlertTitle>
                  <AlertDescription>{validationErrors[provider.id]}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
