"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Key, Info, Copy, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getConfigValue, setConfigValue } from "@/lib/config/config-manager"

interface ApiKeySettingsProps {
  onSave: (settings: ApiKeySettings) => Promise<void>
  initialSettings?: ApiKeySettings
}

export interface ApiKeySettings {
  provider: string
  apiKey: string
  modelId?: string
}

export function ApiKeySettings({ onSave, initialSettings }: ApiKeySettingsProps) {
  const [provider, setProvider] = useState<string>(initialSettings?.provider || "openroute")
  const [apiKey, setApiKey] = useState<string>(initialSettings?.apiKey || "")
  const [modelId, setModelId] = useState<string>(initialSettings?.modelId || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [status, setStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [activeTab, setActiveTab] = useState<string>("preconfigured") // Default to preconfigured
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  // Load initial settings from config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true)
        const savedProvider = await getConfigValue("ai_provider")
        const savedModelId = await getConfigValue(`${savedProvider || "openroute"}_model_id`)

        if (savedProvider) {
          setProvider(savedProvider)
        }

        if (savedModelId) {
          setModelId(savedModelId)
        }

        // Check if we have a saved API key
        const hasApiKey = await getConfigValue(`${savedProvider || "openroute"}_api_key`)
        if (hasApiKey) {
          // Don't show the actual key, just indicate we have one
          setApiKey("••••••••••••••••••••••••••••••••")
          setStatus("valid")
        }

        // Determine which tab should be active based on saved provider
        if (savedProvider === "openroute") {
          setActiveTab("preconfigured")
        } else if (savedProvider) {
          setActiveTab("manual")
        }
      } catch (error) {
        console.error("Error loading config:", error)
        toast({
          title: "Configuration Error",
          description: "Failed to load saved API settings. Using defaults.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [toast])

  const providerOptions = [
    { value: "openroute", label: "OpenRouter", description: "Access multiple AI models through a single API" },
    { value: "openai", label: "OpenAI", description: "Direct access to GPT models" },
    { value: "groq", label: "Groq", description: "Ultra-fast inference for LLMs" },
    { value: "anthropic", label: "Anthropic", description: "Claude models for safe, helpful AI" },
  ]

  const modelOptions = {
    openroute: [
      { value: "openai/gpt-4o", label: "GPT-4o" },
      { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
      { value: "meta-llama/llama-3-70b-instruct", label: "Llama 3 70B" },
    ],
    openai: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    groq: [
      { value: "llama3-8b-8192", label: "Llama 3 8B" },
      { value: "llama3-70b-8192", label: "Llama 3 70B" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
    anthropic: [
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
  }

  useEffect(() => {
    // Reset model when provider changes
    if (!isLoading) {
      setModelId(modelOptions[provider]?.[0]?.value || "")
    }
  }, [provider, isLoading])

  const validateApiKey = async () => {
    if (!apiKey) {
      setErrorMessage("API key is required")
      setStatus("invalid")
      return false
    }

    if (!provider) {
      setErrorMessage("Provider is required")
      setStatus("invalid")
      return false
    }

    setIsValidating(true)
    setStatus("validating")

    try {
      // Call the API to validate the key
      const response = await fetch("/api/config/validate-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          apiKey,
          modelId: modelId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        setErrorMessage(data.error || "Invalid API key")
        setStatus("invalid")
        return false
      }

      setStatus("valid")
      return true
    } catch (error) {
      console.error("API key validation error:", error)
      setErrorMessage(error.message || "Failed to validate API key")
      setStatus("invalid")
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    // If using the pre-configured OpenRouter key, set it directly
    if (activeTab === "preconfigured") {
      const openRouterKey = "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"
      setApiKey(openRouterKey)
      setProvider("openroute")
      setModelId("openai/gpt-4o")

      setIsSaving(true)
      try {
        // Save to config
        await setConfigValue("ai_provider", "openroute", false)
        await setConfigValue("openroute_api_key", openRouterKey, true)
        await setConfigValue("openroute_model_id", "openai/gpt-4o", false)

        setStatus("valid")

        // Call the onSave callback
        await onSave({
          provider: "openroute",
          apiKey: openRouterKey,
          modelId: "openai/gpt-4o",
        })

        toast({
          title: "API Key Saved",
          description: "Pre-configured OpenRouter API key has been saved successfully.",
        })
      } catch (error) {
        console.error("Error saving API key:", error)
        toast({
          title: "Failed to Save API Key",
          description: error.message || "An error occurred while saving the API key.",
          variant: "destructive",
        })
      } finally {
        setIsSaving(false)
      }
      return
    }

    // For manual configuration, validate the key first
    const isValid = await validateApiKey()

    if (!isValid) {
      return
    }

    setIsSaving(true)

    try {
      // Save to config
      await setConfigValue("ai_provider", provider, false)
      await setConfigValue(`${provider}_api_key`, apiKey, true)

      if (modelId) {
        await setConfigValue(`${provider}_model_id`, modelId, false)
      }

      // Call the onSave callback
      await onSave({
        provider,
        apiKey,
        modelId: modelId || undefined,
      })

      toast({
        title: "API Key Saved",
        description: "Your API key has been saved successfully.",
      })
    } catch (error) {
      console.error("API key save error:", error)
      toast({
        title: "Failed to Save API Key",
        description: error.message || "An error occurred while saving your API key.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The API key has been copied to your clipboard.",
    })
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Settings
          </CardTitle>
          <CardDescription>Loading saved configuration...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key Settings
        </CardTitle>
        <CardDescription>Configure your AI provider API key to enable the assistant.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preconfigured">Use Pre-configured Key</TabsTrigger>
            <TabsTrigger value="manual">Configure Manually</TabsTrigger>
          </TabsList>

          <TabsContent value="preconfigured" className="space-y-4 pt-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Pre-configured OpenRouter API Key</AlertTitle>
              <AlertDescription className="text-blue-700">
                Use the provided OpenRouter API key for testing. This key gives access to multiple AI models including
                GPT-4o.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
              <code className="text-sm flex-1 overflow-x-auto">
                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
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard("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")
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Selected Model</Label>
              <div className="p-2 bg-gray-50 rounded-md">
                <div className="font-medium">GPT-4o (via OpenRouter)</div>
                <div className="text-sm text-gray-500">OpenAI's most capable multimodal model</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={isSaving}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="api-key">API Key</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        {provider === "openroute" && "Get your API key from openrouter.ai"}
                        {provider === "openai" && "Get your API key from platform.openai.com"}
                        {provider === "groq" && "Get your API key from console.groq.com"}
                        {provider === "anthropic" && "Get your API key from console.anthropic.com"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  // Reset validation status when key changes
                  if (status === "valid" || status === "invalid") {
                    setStatus("idle")
                  }
                }}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                {provider === "openroute" && "Format: sk-or-v1-..."}
                {provider === "openai" && "Format: sk-..."}
                {provider === "groq" && "Format: gsk_..."}
                {provider === "anthropic" && "Format: sk-ant-..."}
              </p>
            </div>

            {provider && modelOptions[provider] && (
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={modelId} onValueChange={setModelId} disabled={isSaving}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions[provider].map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {status === "valid" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">API Key Validated</AlertTitle>
            <AlertDescription className="text-green-700">
              Your API key has been validated successfully.
            </AlertDescription>
          </Alert>
        )}

        {status === "invalid" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        {activeTab === "manual" && (
          <Button variant="outline" onClick={validateApiKey} disabled={isValidating || isSaving || !apiKey}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Validate Key"
            )}
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={activeTab === "manual" ? isSaving || status === "invalid" || !apiKey : isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save API Key"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
