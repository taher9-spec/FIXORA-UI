"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Zap, ArrowRight, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { persistentStorage } from "@/lib/storage/persistent-storage"

interface Model {
  id: string
  name: string
  provider: string
  description: string
  capabilities: string[]
  free: boolean
}

interface SmartModelSelectorProps {
  onModelSelect: (model: Model) => void
  onNeedApiKey: () => void
  validProviders: string[]
}

export function SmartModelSelector({ onModelSelect, onNeedApiKey, validProviders }: SmartModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const { toast } = useToast()

  const allModels: Model[] = [
    // OpenRouter Models
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "openrouter",
      description: "OpenAI's most capable model via OpenRouter",
      capabilities: ["Text", "Vision", "Code", "Reasoning"],
      free: false,
    },
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openrouter",
      description: "Fast and efficient GPT-4 model",
      capabilities: ["Text", "Code", "Fast"],
      free: true,
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "openrouter",
      description: "Anthropic's most advanced model",
      capabilities: ["Text", "Code", "Analysis"],
      free: false,
    },
    {
      id: "meta-llama/llama-3.1-8b-instruct:free",
      name: "Llama 3.1 8B (Free)",
      provider: "openrouter",
      description: "Meta's open-source model, completely free",
      capabilities: ["Text", "Code", "Open source"],
      free: true,
    },

    // OpenAI Direct
    {
      id: "gpt-4o",
      name: "GPT-4o (Direct)",
      provider: "openai",
      description: "Direct access to OpenAI's flagship model",
      capabilities: ["Text", "Vision", "Code"],
      free: false,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini (Direct)",
      provider: "openai",
      description: "Direct access to OpenAI's efficient model",
      capabilities: ["Text", "Code", "Fast"],
      free: false,
    },

    // GROQ Models
    {
      id: "llama3-8b-8192",
      name: "Llama 3 8B",
      provider: "groq",
      description: "Ultra-fast inference with Llama 3",
      capabilities: ["Text", "Ultra-fast", "Free tier"],
      free: true,
    },
    {
      id: "llama3-70b-8192",
      name: "Llama 3 70B",
      provider: "groq",
      description: "Larger Llama 3 model with ultra-fast inference",
      capabilities: ["Text", "Ultra-fast", "High quality"],
      free: false,
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B",
      provider: "groq",
      description: "Mistral's mixture of experts model",
      capabilities: ["Text", "Code", "Multilingual"],
      free: false,
    },

    // Anthropic Direct
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      provider: "anthropic",
      description: "Anthropic's most powerful model",
      capabilities: ["Text", "Code", "Analysis"],
      free: false,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      provider: "anthropic",
      description: "Balanced performance and speed",
      capabilities: ["Text", "Code", "Balanced"],
      free: false,
    },
  ]

  useEffect(() => {
    // Load previously selected model
    const savedModel = persistentStorage.getSelectedModel()
    if (savedModel && validProviders.includes(savedModel.provider)) {
      setSelectedModel(savedModel)
    }
  }, [validProviders])

  const availableModels = allModels.filter((model) => validProviders.includes(model.provider))

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model)
    persistentStorage.saveSelectedModel(model)
    onModelSelect(model)

    toast({
      title: "🤖 Model Selected",
      description: `Ready to chat with ${model.name}!`,
    })
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "openrouter":
        return "🔀"
      case "openai":
        return "🤖"
      case "groq":
        return "⚡"
      case "anthropic":
        return "🧠"
      default:
        return "🔧"
    }
  }

  if (validProviders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configure API Key First</h3>
          <p className="text-gray-500 mb-4">You need to set up at least one API key to access AI models.</p>
          <Button onClick={onNeedApiKey}>
            <Zap className="h-4 w-4 mr-2" />
            Configure API Key
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your AI Model</h2>
        <p className="text-gray-600">Select a model to start chatting</p>
        {selectedModel && (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">Currently using: {selectedModel.name}</span>
          </div>
        )}
      </div>

      {selectedModel && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="text-center py-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-3xl">{getProviderIcon(selectedModel.provider)}</span>
              <h3 className="text-lg font-semibold text-green-800">{selectedModel.name} Ready!</h3>
            </div>
            <p className="text-green-700 mb-4">{selectedModel.description}</p>
            <Button onClick={() => onModelSelect(selectedModel)} className="bg-green-600 hover:bg-green-700">
              Start Chatting Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModels.map((model) => (
          <Card
            key={model.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedModel?.id === model.id ? "ring-2 ring-green-500 bg-green-50" : ""
            }`}
            onClick={() => handleModelSelect(model)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getProviderIcon(model.provider)}</span>
                  <div>
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <CardDescription className="capitalize">{model.provider}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {model.free ? (
                    <Badge className="bg-green-100 text-green-800">Free</Badge>
                  ) : (
                    <Badge variant="secondary">Paid</Badge>
                  )}
                  {selectedModel?.id === model.id && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{model.description}</p>

              <div className="flex flex-wrap gap-1">
                {model.capabilities.map((capability) => (
                  <Badge key={capability} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>

              {selectedModel?.id === model.id && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Currently Selected
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {availableModels.length === 0 && (
        <Alert>
          <AlertDescription>
            No models available for your configured providers. Please check your API key configuration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
