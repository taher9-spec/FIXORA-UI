"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Cpu } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ModelSelectorProps {
  onSelect: (model: ModelSelection) => Promise<void>
  initialSelection?: ModelSelection
}

export interface ModelSelection {
  provider: string
  modelId: string
  contextLength?: number
}

export function ModelSelector({ onSelect, initialSelection }: ModelSelectorProps) {
  const [provider, setProvider] = useState<string>(initialSelection?.provider || "openai")
  const [modelId, setModelId] = useState<string>(initialSelection?.modelId || "")
  const [contextLength, setContextLength] = useState<number>(initialSelection?.contextLength || 4096)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const { toast } = useToast()

  const providerOptions = [
    { value: "openai", label: "OpenAI" },
    { value: "groq", label: "Groq" },
    { value: "openroute", label: "OpenRoute" },
    { value: "anthropic", label: "Anthropic" },
  ]

  // Default models for each provider
  const defaultModels = {
    openai: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
    groq: [
      { id: "llama3-8b-8192", name: "Llama 3 8B" },
      { id: "llama3-70b-8192", name: "Llama 3 70B" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    ],
    openroute: [
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" },
      { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3 70B" },
    ],
    anthropic: [
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    ],
  }

  useEffect(() => {
    // Reset model when provider changes
    setModelId("")

    // Load available models for the selected provider
    loadAvailableModels()
  }, [provider])

  const loadAvailableModels = async () => {
    setIsLoading(true)
    setStatus("loading")

    try {
      // Try to fetch available models from the API
      const response = await fetch(`/api/models/${provider}`)

      if (!response.ok) {
        // If API fails, use default models
        setAvailableModels(defaultModels[provider] || [])
        return
      }

      const data = await response.json()

      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models)
      } else {
        // Fallback to default models
        setAvailableModels(defaultModels[provider] || [])
      }

      setStatus("success")
    } catch (error) {
      console.error("Failed to load models:", error)
      // Fallback to default models
      setAvailableModels(defaultModels[provider] || [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!provider || !modelId) {
      setErrorMessage("Please select a provider and model")
      setStatus("error")
      return
    }

    setIsSaving(true)

    try {
      await onSelect({
        provider,
        modelId,
        contextLength,
      })

      toast({
        title: "Model Selected",
        description: "Your model selection has been saved successfully.",
      })

      setStatus("success")
    } catch (error) {
      console.error("Model selection error:", error)
      setErrorMessage(error.message || "Failed to save model selection")
      setStatus("error")

      toast({
        title: "Failed to Save Model Selection",
        description: error.message || "An error occurred while saving your model selection.",
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
          <Cpu className="h-5 w-5" />
          Model Selection
        </CardTitle>
        <CardDescription>Select the AI model to use for your assistant.</CardDescription>
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
          <Label htmlFor="model">Model</Label>
          <Select
            value={modelId}
            onValueChange={setModelId}
            disabled={isSaving || isLoading || availableModels.length === 0}
          >
            <SelectTrigger id="model">
              <SelectValue placeholder={isLoading ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Context Length</Label>
          <RadioGroup
            value={contextLength.toString()}
            onValueChange={(value) => setContextLength(Number.parseInt(value))}
            disabled={isSaving}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="4096" id="context-4k" />
              <Label htmlFor="context-4k">4K (4,096 tokens)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="8192" id="context-8k" />
              <Label htmlFor="context-8k">8K (8,192 tokens)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="16384" id="context-16k" />
              <Label htmlFor="context-16k">16K (16,384 tokens)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="32768" id="context-32k" />
              <Label htmlFor="context-32k">32K (32,768 tokens)</Label>
            </div>
          </RadioGroup>
        </div>

        {status === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Model Selected</AlertTitle>
            <AlertDescription className="text-green-700">
              Your model selection has been saved successfully.
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Selection Failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving || !modelId} className="w-full">
          {isSaving ? "Saving..." : "Save Model Selection"}
        </Button>
      </CardFooter>
    </Card>
  )
}
