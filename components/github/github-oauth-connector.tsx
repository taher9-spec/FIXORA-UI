"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GitHubOAuthConnectorProps {
  onConnectionSuccess?: (connectionId: string) => void
  onConnectionError?: (error: string) => void
}

export function GitHubOAuthConnector({ onConnectionSuccess, onConnectionError }: GitHubOAuthConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [userInfo, setUserInfo] = useState<any>(null)
  const { toast } = useToast()

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionStatus("connecting")

    try {
      // Initialize OAuth flow
      const response = await fetch("/api/oauth/github/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to initialize GitHub OAuth")
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to initialize OAuth")
      }

      // Open popup window for OAuth
      const popup = window.open(data.authUrl, "github-oauth", "width=600,height=700,scrollbars=yes,resizable=yes")

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.")
      }

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return
        }

        if (event.data.type === "github-oauth-callback") {
          window.removeEventListener("message", handleMessage)
          popup.close()

          if (event.data.error) {
            setConnectionStatus("error")
            setIsConnecting(false)
            onConnectionError?.(event.data.error)
            toast({
              title: "Connection Failed",
              description: event.data.error,
              variant: "destructive",
            })
          } else if (event.data.connectionId) {
            setConnectionStatus("connected")
            setUserInfo(event.data.userInfo)
            setIsConnecting(false)
            onConnectionSuccess?.(event.data.connectionId)
            toast({
              title: "GitHub Connected!",
              description: `Successfully connected to GitHub as ${event.data.userInfo?.login || "user"}`,
            })
          }
        }
      }

      window.addEventListener("message", handleMessage)

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener("message", handleMessage)
          setIsConnecting(false)
          setConnectionStatus("idle")
        }
      }, 1000)
    } catch (error) {
      console.error("GitHub OAuth error:", error)
      setIsConnecting(false)
      setConnectionStatus("error")
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to GitHub"
      onConnectionError?.(errorMessage)
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connecting":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Github className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connecting":
        return "Connecting..."
      case "connected":
        return "Connected"
      case "error":
        return "Connection Failed"
      default:
        return "Not Connected"
    }
  }

  const getStatusBadgeVariant = () => {
    switch (connectionStatus) {
      case "connected":
        return "default" as const
      case "error":
        return "destructive" as const
      case "connecting":
        return "secondary" as const
      default:
        return "outline" as const
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub</CardTitle>
          </div>
          <Badge variant={getStatusBadgeVariant()}>
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </Badge>
        </div>
        <CardDescription>
          Connect your GitHub account to enable repository access and user information tools.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === "connected" && userInfo && (
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <img
              src={userInfo.avatarUrl || "https://github.com/github.png"}
              alt="GitHub Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium text-green-900">{userInfo.name || userInfo.login}</p>
              <p className="text-sm text-green-700">@{userInfo.login}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Features:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Access user profile information</li>
            <li>• Fetch repository lists and details</li>
            <li>• Read repository contents and files</li>
            <li>• Get commit history and branch information</li>
          </ul>
        </div>

        <Button
          onClick={handleConnect}
          disabled={isConnecting || connectionStatus === "connected"}
          className="w-full"
          variant={connectionStatus === "connected" ? "outline" : "default"}
        >
          {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {connectionStatus === "connected" ? "Connected to GitHub" : "Connect with GitHub"}
        </Button>
      </CardContent>
    </Card>
  )
}
