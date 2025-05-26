"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Cpu, DollarSign, Gift, CheckCircle, AlertCircle, Loader2, Key, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Model {
  id: string
  name: string
  provider: string
  type: "free" | "paid"
  contextLength: number
  description: string
  pricing?: string
  capabilities: string[]
  requiresApiKey: boolean
  apiKeyConfigured: boolean
}

interface ComprehensiveModelSelectorProps {
  onModelSelect: (model: Model) => void
  onApiKeyRequired: (provider: string) => void
  currentModel?: Model
}

export function ComprehensiveModelSelector({
  onModelSelect,
  onApiKeyRequired,
  currentModel,
}: ComprehensiveModelSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  // Comprehensive model database
  const allModels: Model[] = [
    // OpenRouter Models (Free & Paid)
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "OpenRouter",
      type: "paid",
      contextLength: 128000,
      description: "OpenAI's most capable multimodal model via OpenRouter",
      pricing: "$5/1M input tokens",
      capabilities: ["Text", "Vision", "Code", "Reasoning"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenRouter",
      type: "free",
      contextLength: 128000,
      description: "Fast and efficient GPT-4 model via OpenRouter",
      pricing: "Free tier available",
      capabilities: ["Text", "Code", "Fast responses"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "OpenRouter",
      type: "paid",
      contextLength: 200000,
      description: "Anthropic's most advanced model via OpenRouter",
      pricing: "$3/1M input tokens",
      capabilities: ["Text", "Code", "Analysis", "Long context"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "meta-llama/llama-3.1-8b-instruct:free",
      name: "Llama 3.1 8B (Free)",
      provider: "OpenRouter",
      type: "free",
      contextLength: 131072,
      description: "Meta's open-source model, free tier",
      pricing: "Free",
      capabilities: ["Text", "Code", "Open source"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "google/gemini-pro-1.5",
      name: "Gemini Pro 1.5",
      provider: "OpenRouter",
      type: "paid",
      contextLength: 2000000,
      description: "Google's multimodal model with massive context",
      pricing: "$2.50/1M input tokens",
      capabilities: ["Text", "Vision", "Massive context", "Multimodal"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },

    // Direct OpenAI Models
    {
      id: "gpt-4o",
      name: "GPT-4o (Direct)",
      provider: "OpenAI",
      type: "paid",
      contextLength: 128000,
      description: "Direct access to OpenAI's flagship model",
      pricing: "$5/1M input tokens",
      capabilities: ["Text", "Vision", "Code", "Reasoning"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini (Direct)",
      provider: "OpenAI",
      type: "paid",
      contextLength: 128000,
      description: "Direct access to OpenAI's efficient model",
      pricing: "$0.15/1M input tokens",
      capabilities: ["Text", "Code", "Fast responses"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      provider: "OpenAI",
      type: "paid",
      contextLength: 16385,
      description: "OpenAI's fast and cost-effective model",
      pricing: "$0.50/1M input tokens",
      capabilities: ["Text", "Code", "Cost-effective"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },

    // GROQ Models (Ultra-fast inference)
    {
      id: "llama3-8b-8192",
      name: "Llama 3 8B",
      provider: "GROQ",
      type: "free",
      contextLength: 8192,
      description: "Ultra-fast inference with Llama 3",
      pricing: "Free tier available",
      capabilities: ["Text", "Ultra-fast", "Open source"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "llama3-70b-8192",
      name: "Llama 3 70B",
      provider: "GROQ",
      type: "paid",
      contextLength: 8192,
      description: "Larger Llama 3 model with ultra-fast inference",
      pricing: "$0.59/1M input tokens",
      capabilities: ["Text", "Ultra-fast", "High quality"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B",
      provider: "GROQ",
      type: "paid",
      contextLength: 32768,
      description: "Mistral's mixture of experts model",
      pricing: "$0.24/1M input tokens",
      capabilities: ["Text", "Code", "Multilingual", "Fast"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "gemma-7b-it",
      name: "Gemma 7B",
      provider: "GROQ",
      type: "free",
      contextLength: 8192,
      description: "Google's open-source model on GROQ",
      pricing: "Free",
      capabilities: ["Text", "Open source", "Ultra-fast"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },

    // Anthropic Direct
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      provider: "Anthropic",
      type: "paid",
      contextLength: 200000,
      description: "Anthropic's most powerful model",
      pricing: "$15/1M input tokens",
      capabilities: ["Text", "Code", "Analysis", "Long context"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      provider: "Anthropic",
      type: "paid",
      contextLength: 200000,
      description: "Balanced performance and speed",
      pricing: "$3/1M input tokens",
      capabilities: ["Text", "Code", "Balanced"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      provider: "Anthropic",
      type: "paid",
      contextLength: 200000,
      description: "Fast and cost-effective Claude model",
      pricing: "$0.25/1M input tokens",
      capabilities: ["Text", "Fast", "Cost-effective"],
      requiresApiKey: true,
      apiKeyConfigured: false,
    },
  ]

  useEffect(() => {
    loadModels()
    checkApiKeyStatus()
  }, [])

  const loadModels = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll use the static model list
      setModels(allModels)
    } catch (error) {
      console.error("Failed to load models:", error)
      toast({
        title: "Error",
        description: "Failed to load available models",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkApiKeyStatus = async () => {
    try {
      const providers = ["openrouter", "openai", "groq", "anthropic"]
      const status: Record<string, boolean> = {}

      for (const provider of providers) {
        try {
          const response = await fetch(`/api/config/check-api-key?provider=${provider}`)
          const data = await response.json()
          status[provider] = data.configured || false
        } catch {
          status[provider] = false
        }
      }

      setApiKeyStatus(status)

      // Update model configurations
      setModels((prevModels) =>
        prevModels.map((model) => ({
          ...model,
          apiKeyConfigured: status[model.provider.toLowerCase()] || false,
        })),
      )
    } catch (error) {
      console.error("Failed to check API key status:", error)
    }
  }

  const filteredModels = models.filter((model) => {
    const matchesProvider = selectedProvider === "all" || model.provider.toLowerCase() === selectedProvider
    const matchesType = selectedType === "all" || model.type === selectedType
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesProvider && matchesType && matchesSearch
  })

  const handleModelSelect = async (model: Model) => {
    if (!model.apiKeyConfigured && model.requiresApiKey) {
      // Navigate to API key configuration
      onApiKeyRequired(model.provider.toLowerCase())
      toast({
        title: "API Key Required",
        description: `Please configure your ${model.provider} API key to use this model.`,
        variant: "destructive",
      })
      return
    }

    try {
      onModelSelect(model)
      toast({
        title: "Model Selected",
        description: `Switched to ${model.name} (${model.provider})`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to select model",
        variant: "destructive",
      })
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
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

  const getTypeIcon = (type: string) => {
    return type === "free" ? (
      <Gift className="h-4 w-4 text-green-600" />
    ) : (
      <DollarSign className="h-4 w-4 text-blue-600" />
    )
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading models...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Model Selection
          </CardTitle>
          <CardDescription>Choose from a wide range of AI models including free and paid options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Models</Label>
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="groq">GROQ</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Pricing</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="free">Free Models</SelectItem>
                  <SelectItem value="paid">Paid Models</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card
            key={model.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              currentModel?.id === model.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
            }`}
            onClick={() => handleModelSelect(model)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getProviderIcon(model.provider)}</span>
                  <div>
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <CardDescription className="text-sm">{model.provider}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getTypeIcon(model.type)}
                  {model.apiKeyConfigured ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{model.description}</p>

              <div className="flex flex-wrap gap-1">
                {model.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Context Length:</span>
                  <span>{model.contextLength.toLocaleString()} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Pricing:</span>
                  <span>{model.pricing}</span>
                </div>
              </div>

              {!model.apiKeyConfigured && model.requiresApiKey && (
                <Alert className="mt-3">
                  <Key className="h-4 w-4" />
                  <AlertDescription className="text-xs">API key required for {model.provider}</AlertDescription>
                </Alert>
              )}

              {currentModel?.id === model.id && (
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Currently Selected
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No models found matching your criteria.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setSelectedProvider("all")
                setSelectedType("all")
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Key Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(apiKeyStatus).map(([provider, configured]) => (
              <div key={provider} className="flex items-center gap-2">
                <span className="text-2xl">{getProviderIcon(provider)}</span>
                <div>
                  <div className="font-medium capitalize">{provider}</div>
                  <div className={`text-sm ${configured ? "text-green-600" : "text-orange-500"}`}>
                    {configured ? "Configured" : "Not configured"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
