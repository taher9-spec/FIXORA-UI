"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Key, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MultiProviderSetupProps {
  requiredProvider?: string
  onComplete: (provider: string) => void
}

export function MultiProviderSetup({ requiredProvider, onComplete }: MultiProviderSetupProps) {
  const [activeProvider, setActiveProvider] = useState(requiredProvider || "openrouter")
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [validationStatus, setValidationStatus] = useState<Record<string, "idle" | "validating" | "valid" | "invalid">>(
    {},
  )
  const [isValidating, setIsValidating] = useState(false)
  const { toast } = useToast()

  const providers = [
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Access 100+ models through one API",
      icon: "🔀",
      website: "https://openrouter.ai",
      keyFormat: "sk-or-v1-...",
      benefits: ["100+ models", "Free tier available", "Best value"],
      setupSteps: [
        "Go to openrouter.ai",
        "Sign up for a free account",
        "Navigate to Keys section",
        "Create a new API key",
        "Copy and paste it below",
      ],
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Direct access to GPT models",
      icon: "🤖",
      website: "https://platform.openai.com",
      keyFormat: "sk-...",
      benefits: ["Latest GPT models", "Direct access", "Official API"],
      setupSteps: [
        "Go to platform.openai.com",
        "Sign in to your account",
        "Navigate to API Keys",
        "Create a new secret key",
        "Copy and paste it below",
      ],
    },
    {
      id: "groq",
      name: "GROQ",
      description: "Ultra-fast inference for LLMs",
      icon: "⚡",
      website: "https://console.groq.com",
      keyFormat: "gsk_...",
      benefits: ["Ultra-fast inference", "Free tier", "Open source models"],
      setupSteps: [
        "Go to console.groq.com",
        "Create a free account",
        "Navigate to API Keys",
        "Generate a new API key",
        "Copy and paste it below",
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude models for safe AI",
      icon: "🧠",
      website: "https://console.anthropic.com",
      keyFormat: "sk-ant-...",
      benefits: ["Claude models", "Long context", "Safe AI"],
      setupSteps: [
        "Go to console.anthropic.com",
        "Sign up for an account",
        "Navigate to API Keys",
        "Create a new key",
        "Copy and paste it below",
      ],
    },
  ]

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }))
    // Reset validation status when key changes
    setValidationStatus((prev) => ({ ...prev, [provider]: "idle" }))
  }

  const validateApiKey = async (provider: string) => {
    const apiKey = apiKeys[provider]
    if (!apiKey) return

    setValidationStatus((prev) => ({ ...prev, [provider]: "validating" }))
    setIsValidating(true)

    try {
      const response = await fetch("/api/config/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      })

      const data = await response.json()

      if (data.valid) {
        setValidationStatus((prev) => ({ ...prev, [provider]: "valid" }))
        toast({
          title: "API Key Valid",
          description: `${providers.find((p) => p.id === provider)?.name} API key validated successfully!`,
        })
      } else {
        setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
        toast({
          title: "Invalid API Key",
          description: data.error || "The API key is not valid",
          variant: "destructive",
        })
      }
    } catch (error) {
      setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }))
      toast({
        title: "Validation Error",
        description: "Failed to validate API key",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
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
          title: "API Key Saved",
          description: `${providers.find((p) => p.id === provider)?.name} API key saved successfully!`,
        })
        onComplete(provider)
      } else {
        throw new Error("Failed to save API key")
      }
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save API key",
        variant: "destructive",
      })
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

  return (
    <div className="space-y-6">
      {requiredProvider && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Key Required</AlertTitle>
          <AlertDescription>
            You need to configure your {providers.find((p) => p.id === requiredProvider)?.name} API key to use the
            selected model.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeProvider} onValueChange={setActiveProvider}>
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
          {providers.map((provider) => (
            <TabsTrigger key={provider.id} value={provider.id} className="flex items-center gap-2">
              <span>{provider.icon}</span>
              <span className="hidden sm:inline">{provider.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {providers.map((provider) => (
          <TabsContent key={provider.id} value={provider.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <CardTitle>{provider.name}</CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={provider.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get API Key
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Benefits */}
                <div>
                  <h4 className="font-medium mb-2">Benefits:</h4>
                  <div className="flex flex-wrap gap-2">
                    {provider.benefits.map((benefit) => (
                      <Badge key={benefit} variant="secondary">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Setup Steps */}
                <div>
                  <h4 className="font-medium mb-2">Setup Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {provider.setupSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* API Key Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${provider.id}-key`}>API Key</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(provider.id)}
                      <span className="text-sm text-gray-500">Format: {provider.keyFormat}</span>
                    </div>
                  </div>
                  <Input
                    id={`${provider.id}-key`}
                    type="password"
                    placeholder={`Enter your ${provider.name} API key`}
                    value={apiKeys[provider.id] || ""}
                    onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => validateApiKey(provider.id)}
                      disabled={!apiKeys[provider.id] || isValidating}
                    >
                      {validationStatus[provider.id] === "validating" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        "Validate Key"
                      )}
                    </Button>

                    <Button
                      onClick={() => saveApiKey(provider.id)}
                      disabled={validationStatus[provider.id] !== "valid"}
                    >
                      Save & Continue
                    </Button>
                  </div>

                  {validationStatus[provider.id] === "valid" && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        API key validated successfully! You can now use {provider.name} models.
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationStatus[provider.id] === "invalid" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Invalid API key. Please check the key format and try again.</AlertDescription>
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
