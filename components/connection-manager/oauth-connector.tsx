"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Github, ChromeIcon as Google } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getOrigin } from "@/lib/utils/environment"

interface OAuthConnectorProps {
  provider: "github" | "google"
  onSuccess: (connectionId: string) => void
  onError: (error: string) => void
}

export function OAuthConnector({ provider, onSuccess, onError }: OAuthConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [connectionId, setConnectionId] = useState("")
  const { toast } = useToast()

  // Auto-detect the current origin for redirect URIs
  const origin = getOrigin()
  const redirectUri = `${origin}/api/oauth/${provider}/callback`

  const providerConfig = {
    github: {
      name: "GitHub",
      icon: Github,
      scopes: ["read:user", "user:email"],
    },
    google: {
      name: "Google",
      icon: Google,
      scopes: ["profile", "email"],
    },
  }

  const config = providerConfig[provider]

  const connectToProvider = async () => {
    setIsConnecting(true)
    setStatus("connecting")

    try {
      // Step 1: Register or fetch OAuth app credentials
      const credentialsResponse = await fetch(`/api/oauth/${provider}/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirectUri,
          scopes: config.scopes,
        }),
      })

      if (!credentialsResponse.ok) {
        throw new Error(`Failed to get ${config.name} credentials`)
      }

      const { clientId, authUrl } = await credentialsResponse.json()

      // Step 2: Open OAuth authorization window
      const authWindow = window.open(authUrl, `${config.name} Authorization`, "width=600,height=700")

      // Step 3: Listen for the callback message
      const handleCallback = async (event: MessageEvent) => {
        if (event.origin !== origin) return

        if (event.data.type === "oauth-callback" && event.data.provider === provider) {
          window.removeEventListener("message", handleCallback)

          if (authWindow) {
            authWindow.close()
          }

          if (event.data.error) {
            setStatus("error")
            setErrorMessage(event.data.error)
            onError(event.data.error)
            toast({
              title: `${config.name} Connection Failed`,
              description: event.data.error,
              variant: "destructive",
            })
          } else {
            setStatus("success")
            setConnectionId(event.data.connectionId)
            onSuccess(event.data.connectionId)
            toast({
              title: `${config.name} Connected Successfully`,
              description: `Your ${config.name} account has been connected.`,
            })
          }
        }
      }

      window.addEventListener("message", handleCallback)
    } catch (error) {
      console.error(`${config.name} connection error:`, error)
      setStatus("error")
      setErrorMessage(error.message || `Failed to connect to ${config.name}`)
      onError(error.message || `Failed to connect to ${config.name}`)
      toast({
        title: `${config.name} Connection Failed`,
        description: error.message || `Failed to connect to ${config.name}`,
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
          <config.icon className="h-5 w-5" />
          Connect with {config.name}
        </CardTitle>
        <CardDescription>
          Connect your {config.name} account to enable authentication and access to {config.name} resources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Connected Successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              Your {config.name} account has been connected successfully.
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
      <CardFooter>
        <Button onClick={connectToProvider} disabled={isConnecting || status === "success"} className="w-full">
          {isConnecting
            ? `Connecting to ${config.name}...`
            : status === "success"
              ? `Connected to ${config.name}`
              : `Connect with ${config.name}`}
        </Button>
      </CardFooter>
    </Card>
  )
}
