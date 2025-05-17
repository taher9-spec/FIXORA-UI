"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Server } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { validateMCPServer } from "@/lib/mcp/official-protocol"

interface MCPConnectorProps {
  onSuccess: (connectionId: string) => void
  onError: (error: string) => void
}

export function MCPConnector({ onSuccess, onError }: MCPConnectorProps) {
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [status, setStatus] = useState<"idle" | "validating" | "connecting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [connectionId, setConnectionId] = useState("")
  const { toast } = useToast()

  const validateInputs = () => {
    if (!baseUrl) {
      setErrorMessage("MCP server URL is required")
      return false
    }

    if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://localhost")) {
      setErrorMessage("MCP server URL must start with https:// (or http://localhost for development)")
      return false
    }

    // Remove trailing slash if present
    if (baseUrl.endsWith("/")) {
      setBaseUrl(baseUrl.slice(0, -1))
    }

    return true
  }

  const validateServer = async () => {
    if (!validateInputs()) {
      setStatus("error")
      return false
    }

    setIsValidating(true)
    setStatus("validating")

    try {
      // Validate the MCP server
      const validationResult = await validateMCPServer(baseUrl, apiKey || undefined)

      if (!validationResult.valid) {
        setErrorMessage(validationResult.error || "Invalid MCP server")
        setStatus("error")
        return false
      }

      toast({
        title: "MCP Server Validated",
        description: "The MCP server implements the official protocol.",
      })

      return true
    } catch (error) {
      console.error("MCP server validation error:", error)
      setErrorMessage(error.message || "Failed to validate MCP server")
      setStatus("error")
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const connectToMCP = async () => {
    const isValid = await validateServer()

    if (!isValid) {
      return
    }

    setIsConnecting(true)
    setStatus("connecting")

    try {
      // Create the MCP connection
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "mcp",
          name: "MCP Server",
          credentials: {
            baseUrl,
            apiKey: apiKey || undefined,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create MCP connection")
      }

      const data = await response.json()

      // Verify the connection
      const verifyResponse = await fetch(`/api/connections/${data.id}/verify`)

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json()
        throw new Error(error.error || "Failed to verify MCP connection")
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.error || "Failed to verify MCP connection")
      }

      setStatus("success")
      setConnectionId(data.id)
      onSuccess(data.id)
      toast({
        title: "MCP Server Connected",
        description: "Your MCP server has been connected successfully.",
      })
    } catch (error) {
      console.error("MCP connection error:", error)
      setErrorMessage(error.message || "Failed to connect to MCP server")
      setStatus("error")
      onError(error.message || "Failed to connect to MCP server")
      toast({
        title: "MCP Connection Failed",
        description: error.message || "Failed to connect to MCP server",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Connect MCP Server
        </CardTitle>
        <CardDescription>
          Connect to a Model Context Protocol (MCP) server to enable context storage and retrieval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mcp-url">MCP Server URL</Label>
          <Input
            id="mcp-url"
            placeholder="https://mcp.example.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={status === "success"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key">API Key (Optional)</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter API key if required"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={status === "success"}
          />
        </div>

        {status === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Connected Successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              Your MCP server has been connected successfully.
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={validateServer}
          disabled={isValidating || isConnecting || status === "success" || !baseUrl}
        >
          {isValidating ? "Validating..." : "Validate Server"}
        </Button>
        <Button onClick={connectToMCP} disabled={isConnecting || status === "success" || !baseUrl} className="flex-1">
          {isConnecting ? "Connecting..." : "Connect MCP Server"}
        </Button>
      </CardFooter>
    </Card>
  )
}
