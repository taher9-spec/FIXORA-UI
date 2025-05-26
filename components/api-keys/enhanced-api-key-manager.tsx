"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy, TestTube, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ApiKeyManagerProps {
  onKeyValidated: (provider: string, isValid: boolean) => void
  onTestComplete: (provider: string, results: any) => void
}

export function EnhancedApiKeyManager({ onKeyValidated, onTestComplete }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [validationStatus, setValidationStatus] = useState<Record<string, "idle" | "validating" | "valid" | "invalid">>(
    {},
  )
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const providers = [
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Access 100+ models through one unified API",
      icon: "🔀",
      website: "https://openrouter.ai/keys",
      keyFormat: "sk-or-v1-",
      keyLength: 64,
      testEndpoint: "https://openrouter.ai/api/v1/models",
      benefits: ["100+ models", "Free tier", "Best value", "Unified API"],
      quickStart: "Get $5 free credits",
      setupSteps: [
        "Visit openrouter.ai and sign up",
        "Go to the Keys section",
        "Click 'Create Key'",
        "Copy the generated key",
        "Paste it below and test",
      ],
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Direct access to GPT-4o and latest models",
      icon: "🤖",
      website: "https://platform.openai.com/api-keys",
      keyFormat: "sk-",
      keyLength: 51,
      testEndpoint: "https://api.openai.com/v1/models",
      benefits: ["Latest GPT models", "Official API", "High quality"],
      quickStart: "$5 free trial",
      setupSteps: [
        "Go to platform.openai.com",
        "Navigate to API Keys",
        "Create new secret key",
        "Copy the key immediately",
        "Paste and validate below",
      ],
    },
    {
      id: "groq",
      name: "GROQ",
      description: "Ultra-fast inference for open-source models",
      icon: "⚡",
      website: "https://console.groq.com/keys",
      keyFormat: "gsk_",
      keyLength: 56,
      testEndpoint: "https://api.groq.com/openai/v1/models",
      benefits: ["Ultra-fast", "Free tier", "Open source models"],
      quickStart: "Free forever tier",
      setupSteps: [
        "Visit console.groq.com",
        "Create free account",
        "Go to API Keys",
        "Generate new key",
        "Test the connection",
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude models for advanced reasoning",
      icon: "🧠",
      website: "https://console.anthropic.com/settings/keys",
      keyFormat: "sk-ant-",
      keyLength: 108,
      testEndpoint: "https://api.anthropic.com/v1/messages",
      benefits: ["Claude models", "200K context", "Safe AI"],
      quickStart: "$5 free credits",
      setupSteps: [
        "Go to console.anthropic.com",
        "Navigate to API Keys",
        "Create new key",
        "Copy the full key",
        "Validate below",
      ],
    },
  ]

  useEffect(() => {
    loadSavedKeys()
  }, [])

  const loadSavedKeys = async () => {
    try {
      const response = await fetch("/api/config/get-api-keys")
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.keys || {})

        // Auto-validate saved keys
        Object.keys(data.keys || {}).forEach((provider) => {
          if (data.keys[provider]) {
            validateApiKey(provider, data.keys[provider], false)
          }
        })
      }
    } catch (error) {
      console.error("Failed to load saved keys:", error)
    }
  }

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }))
    setValidationStatus((prev) => ({ ...prev, [provider]: "idle" }))
    setValidationErrors((prev) => ({ ...prev, [provider]: "" }))
  }

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const validateKeyFormat = (provider: string, key: string): { valid: boolean; error?: string } => {
    const providerConfig = providers.find((p) => p.id === provider)
    if (!providerConfig) return { valid: false, error: "Unknown provider" }

    if (!key) return { valid: false, error: "API key is required" }

    if (!key.startsWith(providerConfig.keyFormat)) {
      return {
        valid: false,
        error: `Key must start with "${providerConfig.keyFormat}"`,
      }
    }

    if (key.length < providerConfig.keyLength - 10 || key.length > providerConfig.keyLength + 10) {
      return {
        valid: false,
        error: `Key length should be around ${providerConfig.keyLength} characters`,
      }
    }

    return { valid: true }
  }

  const validateApiKey = async (provider: string, key?: string, showToast = true) => {
    const apiKey = key || apiKeys[provider]
    if (!apiKey) return

    // First validate format
    const formatCheck = validateKeyFormat(provider, apiKey)
    if (!formatCheck.valid) {
      setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
      setValidationErrors((prev) => ({ ...prev, [provider]: formatCheck.error || "Invalid format" }))
      if (showToast) {
        toast({
          title: "Invalid Format",
          description: formatCheck.error,
          variant: "destructive",
        })
      }
      return
    }

    setValidationStatus((prev) => ({ ...prev, [provider]: "validating" }))
    setValidationErrors((prev) => ({ ...prev, [provider]: "" }))

    try {
      const response = await fetch("/api/config/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, testConnection: true }),
      })

      const data = await response.json()

      if (data.valid) {
        setValidationStatus((prev) => ({ ...prev, [provider]: "valid" }))
        setTestResults((prev) => ({ ...prev, [provider]: data.testResults }))
        onKeyValidated(provider, true)

        if (showToast) {
          toast({
            title: "✅ API Key Valid",
            description: `${providers.find((p) => p.id === provider)?.name} connected successfully!`,
          })
        }
      } else {
        setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
        setValidationErrors((prev) => ({ ...prev, [provider]: data.error || "Invalid API key" }))
        onKeyValidated(provider, false)

        if (showToast) {
          toast({
            title: "❌ Invalid API Key",
            description: data.error || "Please check your API key",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
      setValidationErrors((prev) => ({ ...prev, [provider]: "Network error - please try again" }))
      onKeyValidated(provider, false)

      if (showToast) {
        toast({
          title: "Connection Error",
          description: "Could not validate API key - check your internet connection",
          variant: "destructive",
        })
      }
    }
  }

  const saveApiKey = async (provider: string) => {
    const apiKey = apiKeys[provider]
    if (!apiKey || validationStatus[provider] !== "valid") return

    try {
      const response = await fetch("/api/config/save-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      })

      if (response.ok) {
        toast({
          title: "🎉 Saved Successfully",
          description: `${providers.find((p) => p.id === provider)?.name} API key saved!`,
        })
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save API key",
        variant: "destructive",
      })
    }
  }

  const testConnection = async (provider: string) => {
    if (validationStatus[provider] !== "valid") return

    setIsLoading(true)
    try {
      const response = await fetch("/api/config/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })

      const data = await response.json()
      setTestResults((prev) => ({ ...prev, [provider]: data }))
      onTestComplete(provider, data)

      toast({
        title: data.success ? "🚀 Connection Test Passed" : "❌ Connection Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Test Error",
        description: "Failed to test connection",
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

  const getStatusBadge = (provider: string) => {
    const status = validationStatus[provider]
    switch (status) {
      case "validating":
        return <Badge variant="secondary">Validating...</Badge>
      case "valid":
        return <Badge className="bg-green-100 text-green-800">✅ Connected</Badge>
      case "invalid":
        return <Badge variant="destructive">❌ Invalid</Badge>
      default:
        return <Badge variant="outline">Not configured</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">API Key Configuration</h2>
        <p className="text-gray-600">Configure your AI provider API keys to access models</p>
      </div>

      <Tabs defaultValue="openrouter" className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
          {providers.map((provider) => (
            <TabsTrigger key={provider.id} value={provider.id} className="flex items-center gap-2">
              <span>{provider.icon}</span>
              <span className="hidden sm:inline">{provider.name}</span>
              {validationStatus[provider.id] === "valid" && <CheckCircle className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
          ))}
        </TabsList>

        {providers.map((provider) => (
          <TabsContent key={provider.id} value={provider.id}>
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                        {getStatusBadge(provider.id)}
                      </CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={provider.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Get API Key
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`${provider.website}`, "_blank")}>
                      <Zap className="h-4 w-4 mr-2" />
                      {provider.quickStart}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Benefits */}
                <div>
                  <h4 className="font-medium mb-2">Why choose {provider.name}?</h4>
                  <div className="flex flex-wrap gap-2">
                    {provider.benefits.map((benefit) => (
                      <Badge key={benefit} variant="secondary" className="bg-blue-50 text-blue-700">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Setup Steps */}
                <div>
                  <h4 className="font-medium mb-2">Quick Setup:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {provider.setupSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* API Key Input */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${provider.id}-key`} className="text-base font-medium">
                      API Key
                    </Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(provider.id)}
                      <span className="text-sm text-gray-500">Format: {provider.keyFormat}...</span>
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      id={`${provider.id}-key`}
                      type={showKeys[provider.id] ? "text" : "password"}
                      placeholder={`Enter your ${provider.name} API key`}
                      value={apiKeys[provider.id] || ""}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleKeyVisibility(provider.id)}
                        className="h-8 w-8 p-0"
                      >
                        {showKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {apiKeys[provider.id] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKeys[provider.id])}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => validateApiKey(provider.id)}
                      disabled={!apiKeys[provider.id] || validationStatus[provider.id] === "validating"}
                      className="flex-1"
                    >
                      {validationStatus[provider.id] === "validating" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Validate Key
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => saveApiKey(provider.id)}
                      disabled={validationStatus[provider.id] !== "valid"}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save & Continue
                    </Button>

                    {validationStatus[provider.id] === "valid" && (
                      <Button variant="outline" onClick={() => testConnection(provider.id)} disabled={isLoading}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                    )}
                  </div>

                  {/* Status Messages */}
                  {validationStatus[provider.id] === "valid" && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">✅ API Key Valid!</AlertTitle>
                      <AlertDescription className="text-green-700">
                        Your {provider.name} API key is working correctly.
                        {testResults[provider.id] && (
                          <span className="block mt-1">
                            Available models: {testResults[provider.id].modelCount || 0}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationStatus[provider.id] === "invalid" && validationErrors[provider.id] && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>❌ Validation Failed</AlertTitle>
                      <AlertDescription>
                        {validationErrors[provider.id]}
                        <div className="mt-2 text-sm">
                          <strong>Troubleshooting:</strong>
                          <ul className="list-disc list-inside mt-1">
                            <li>Check that you copied the complete API key</li>
                            <li>Ensure the key starts with "{provider.keyFormat}"</li>
                            <li>Verify your account has API access enabled</li>
                            <li>Try generating a new API key</li>
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
