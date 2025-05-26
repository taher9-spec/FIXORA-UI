"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Github, CheckCircle, AlertCircle, Loader2, RefreshCw, Shield, GitBranch } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EnhancedGitHubConnectorProps {
  onSuccess: (connectionId: string, userInfo?: any) => void
  onError: (error: string) => void
}

export function EnhancedGitHubConnector({ onSuccess, onError }: EnhancedGitHubConnectorProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [isConnecting, setIsConnecting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorDetails, setErrorDetails] = useState<{
    message: string
    action: string
    recoverable: boolean
  } | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const { toast } = useToast()

  // Reset progress when not connecting
  useEffect(() => {
    if (!isConnecting) {
      setProgress(0)
    }
  }, [isConnecting])

  const simulateProgress = () => {
    const intervals = [
      { delay: 500, progress: 20 },
      { delay: 1000, progress: 40 },
      { delay: 1500, progress: 60 },
      { delay: 2000, progress: 80 },
    ]

    intervals.forEach(({ delay, progress }) => {
      setTimeout(() => {
        if (isConnecting) {
          setProgress(progress)
        }
      }, delay)
    })
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setStatus("connecting")
    setErrorDetails(null)
    setProgress(10)
    setConnectionAttempts((prev) => prev + 1)

    try {
      simulateProgress()

      // Initialize OAuth flow with enhanced error handling
      const response = await fetch("/api/oauth/github/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize GitHub OAuth")
      }

      setProgress(90)

      // Open OAuth popup with better error handling
      const popup = window.open(
        data.authUrl,
        "github-oauth",
        "width=600,height=700,scrollbars=yes,resizable=yes,centerscreen=yes",
      )

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site and try again.")
      }

      setProgress(100)

      // Enhanced message listener
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return
        }

        if (event.data.type === "github-oauth-callback") {
          window.removeEventListener("message", handleMessage)
          popup.close()

          if (event.data.error) {
            setStatus("error")
            setErrorDetails({
              message: event.data.error,
              action: "Please try connecting again or check your GitHub OAuth app configuration.",
              recoverable: true,
            })
            onError(event.data.error)
            toast({
              title: "GitHub Connection Failed",
              description: event.data.error,
              variant: "destructive",
            })
          } else if (event.data.connectionId) {
            setStatus("connected")
            setUserInfo(event.data.userInfo)
            onSuccess(event.data.connectionId, event.data.userInfo)
            toast({
              title: "GitHub Connected Successfully!",
              description: `Welcome ${event.data.userInfo?.name || event.data.userInfo?.login}!`,
            })
          }

          setIsConnecting(false)
          setProgress(0)
        }
      }

      window.addEventListener("message", handleMessage)

      // Monitor popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener("message", handleMessage)

          if (status === "connecting") {
            setStatus("error")
            setErrorDetails({
              message: "Authorization window was closed before completing the connection.",
              action: "Please try again and complete the authorization process.",
              recoverable: true,
            })
            setIsConnecting(false)
            setProgress(0)
          }
        }
      }, 1000)

      // Timeout after 5 minutes
      setTimeout(
        () => {
          clearInterval(checkClosed)
          window.removeEventListener("message", handleMessage)
          if (popup && !popup.closed) {
            popup.close()
          }
          if (status === "connecting") {
            setStatus("error")
            setErrorDetails({
              message: "Authorization timeout. The connection process took too long.",
              action: "Please try again with a stable internet connection.",
              recoverable: true,
            })
            setIsConnecting(false)
            setProgress(0)
          }
        },
        5 * 60 * 1000,
      )
    } catch (error) {
      console.error("GitHub connection error:", error)
      setStatus("error")
      setIsConnecting(false)
      setProgress(0)

      const errorMessage = error instanceof Error ? error.message : "Failed to connect to GitHub"
      setErrorDetails({
        message: errorMessage,
        action: "Please check your internet connection and try again.",
        recoverable: true,
      })

      onError(errorMessage)
      toast({
        title: "GitHub Connection Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const resetConnection = () => {
    setStatus("idle")
    setErrorDetails(null)
    setUserInfo(null)
    setProgress(0)
    setConnectionAttempts(0)
  }

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "connecting":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "connecting":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Github className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Github className="h-5 w-5" />
            <CardTitle>GitHub Integration</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {status === "connecting" && "Connecting..."}
              {status === "connected" && "Connected"}
              {status === "error" && "Connection Failed"}
              {status === "idle" && "Not Connected"}
            </span>
          </div>
        </div>
        <CardDescription>
          Connect your GitHub account to enable repository access, user information, and collaboration tools.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Progress */}
        {isConnecting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Connecting to GitHub...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Connected User Info */}
        {status === "connected" && userInfo && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Successfully Connected!</AlertTitle>
            <AlertDescription className="text-green-700">
              <div className="flex items-center space-x-3 mt-3">
                <img
                  src={userInfo.avatarUrl || "https://github.com/github.png"}
                  alt="GitHub Avatar"
                  className="w-10 h-10 rounded-full border-2 border-green-200"
                />
                <div className="flex-1">
                  <div className="font-medium">{userInfo.name || userInfo.login}</div>
                  <div className="text-sm">@{userInfo.login}</div>
                  {userInfo.company && <div className="text-xs">{userInfo.company}</div>}
                </div>
                <div className="flex space-x-1">
                  <Badge variant="secondary" className="text-xs">
                    <GitBranch className="h-3 w-3 mr-1" />
                    {userInfo.publicRepos || 0} repos
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {status === "error" && errorDetails && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              <div className="space-y-3">
                <p>{errorDetails.message}</p>
                <p className="text-sm">{errorDetails.action}</p>
                {errorDetails.recoverable && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleConnect}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Try Again
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetConnection}>
                      Reset
                    </Button>
                  </div>
                )}
                {connectionAttempts > 2 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <p className="font-medium text-yellow-800">Need help?</p>
                    <p className="text-yellow-700">
                      If you continue having issues, please check your GitHub OAuth app configuration.
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Features List */}
        {status !== "connected" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Available Features:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Access user profile and account information</li>
              <li>• Fetch repository lists and details</li>
              <li>• Read repository contents and file structure</li>
              <li>• Get commit history and branch information</li>
              <li>• Manage issues and pull requests</li>
            </ul>
          </div>
        )}

        {/* Connection Button */}
        <Button
          onClick={handleConnect}
          disabled={isConnecting || status === "connected"}
          className="w-full"
          variant={status === "connected" ? "outline" : "default"}
        >
          {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === "connected" ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Connected to GitHub
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Connect with GitHub
            </>
          )}
        </Button>

        {/* Debug Info for Development */}
        {process.env.NODE_ENV === "development" && connectionAttempts > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Debug Information</summary>
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <p>Connection attempts: {connectionAttempts}</p>
              <p>Status: {status}</p>
              <p>Origin: {window.location.origin}</p>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
