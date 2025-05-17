"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Key } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [provider, setProvider] = useState<string>(initialSettings?.provider || "openai")
  const [apiKey, setApiKey] = useState<string>(initialSettings?.apiKey || "")
  const [modelId, setModelId] = useState<string>(initialSettings?.modelId || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [status, setStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const { toast } = useToast()

  const providerOptions = [
    { value: "openai", label: "OpenAI" },
    { value: "groq", label: "Groq" },
    { value: "openroute", label: "OpenRoute" },
    { value: "anthropic", label: "Anthropic" },
  ]

  const modelOptions = {
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
    openroute: [
      { value: "openai/gpt-4o", label: "GPT-4o" },
      { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
      { value: "meta-llama/llama-3-70b-instruct", label: "Llama 3 70B" },
    ],
    anthropic: [
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
  }

  useEffect(() => {
    // Reset model when provider changes
    setModelId("")
  }, [provider])

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
    const isValid = await validateApiKey()

    if (!isValid) {
      return
    }

    setIsSaving(true)

    try {
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
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={provider} onValueChange={setProvider} disabled={isSaving}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isSaving}
          />
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
        <Button variant="outline" onClick={validateApiKey} disabled={isValidating || isSaving || !apiKey}>
          {isValidating ? "Validating..." : "Validate Key"}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || status === "invalid" || !apiKey} className="flex-1">
          {isSaving ? "Saving..." : "Save API Key"}
        </Button>
      </CardFooter>
    </Card>
  )
}
