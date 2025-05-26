"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database, ExternalLink, Loader2, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getOrigin } from "@/lib/utils/environment"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

interface SupabaseConnectorProps {
  onSuccess: (connectionId: string) => void
  onError: (error: string) => void
}

export function SupabaseConnector({ onSuccess, onError }: SupabaseConnectorProps) {
  const [url, setUrl] = useState("")
  const [anonKey, setAnonKey] = useState("")
  const [serviceRoleKey, setServiceRoleKey] = useState("")
  const [showAnonKey, setShowAnonKey] = useState(false)
  const [showServiceKey, setShowServiceKey] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [connectionId, setConnectionId] = useState("")
  const [activeTab, setActiveTab] = useState<string>("manual")
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  // Auto-detect the current origin for redirect URIs
  const origin = getOrigin()
  const redirectUri = `${origin}/api/supabase/callback`

  const validateInputs = () => {
    setErrorMessage("")

    if (!url.trim()) {
      setErrorMessage("Supabase URL is required")
      return false
    }

    if (!url.startsWith("https://")) {
      setErrorMessage("Supabase URL must start with https://")
      return false
    }

    if (!url.includes(".supabase.co")) {
      setErrorMessage("Please enter a valid Supabase project URL (e.g., https://your-project.supabase.co)")
      return false
    }

    if (!anonKey.trim()) {
      setErrorMessage("Anon Key is required")
      return false
    }

    if (anonKey.length < 100) {
      setErrorMessage("Anon Key appears to be invalid (too short)")
      return false
    }

    // Service role key is optional for basic connection
    if (serviceRoleKey && serviceRoleKey.length < 100) {
      setErrorMessage("Service Role Key appears to be invalid (too short)")
      return false
    }

    return true
  }

  const connectToSupabaseOAuth = async () => {
    setIsAuthenticating(true)
    setStatus("connecting")
    setProgress(10)
    setErrorMessage("")

    try {
      // Step 1: Initialize the OAuth flow
      const initResponse = await fetch("/api/supabase/oauth/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirectUri,
        }),
      })

      if (!initResponse.ok) {
        const error = await initResponse.json()
        throw new Error(error.error || "Failed to initialize Supabase OAuth")
      }

      setProgress(30)
      const { authUrl, state } = await initResponse.json()

      // Step 2: Open the Supabase OAuth window
      const authWindow = window.open(
        authUrl,
        "Supabase Authorization",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      )

      if (!authWindow) {
        throw new Error("Failed to open authorization window. Please allow popups for this site.")
      }

      setProgress(50)

      // Step 3: Listen for the callback message
      const handleCallback = async (event: MessageEvent) => {
        if (event.origin !== origin) return

        if (event.data.type === "supabase-callback") {
          window.removeEventListener("message", handleCallback)

          // Close the auth window
          if (authWindow && !authWindow.closed) {
            authWindow.close()
          }

          if (event.data.error) {
            setStatus("error")
            setErrorMessage(event.data.error)
            onError(event.data.error)
            toast({
              title: "Supabase Connection Failed",
              description: event.data.error,
              variant: "destructive",
            })
            setIsAuthenticating(false)
            return
          }

          setProgress(70)

          try {
            // Step 4: Complete the connection with the code and state
            const completeResponse = await fetch("/api/supabase/oauth/complete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code: event.data.code,
                state,
              }),
            })

            if (!completeResponse.ok) {
              const error = await completeResponse.json()
              throw new Error(error.error || "Failed to complete Supabase OAuth")
            }

            setProgress(90)
            const connectionData = await completeResponse.json()

            // Step 5: Verify the connection
            const verifyResponse = await fetch(`/api/connections/${connectionData.id}/verify`)
            setProgress(100)

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json()
              throw new Error(error.error || "Failed to verify Supabase connection")
            }

            const verifyData = await verifyResponse.json()

            if (!verifyData.success) {
              throw new Error(verifyData.error || "Failed to verify Supabase connection")
            }

            setStatus("success")
            setConnectionId(connectionData.id)
            onSuccess(connectionData.id)
            toast({
              title: "Supabase Connected Successfully",
              description: "Your Supabase project has been connected.",
            })
          } catch (error) {
            setStatus("error")
            setErrorMessage(error.message)
            onError(error.message)
            toast({
              title: "Supabase Connection Failed",
              description: error.message,
              variant: "destructive",
            })
          } finally {
            setIsAuthenticating(false)
          }
        }
      }

      window.addEventListener("message", handleCallback)

      // Set a timeout to clean up if the window is closed manually
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed)
          window.removeEventListener("message", handleCallback)
          if (isAuthenticating) {
            setIsAuthenticating(false)
            setStatus("idle")
            setProgress(0)
          }
        }
      }, 1000)
    } catch (error) {
      console.error("Supabase OAuth error:", error)
      setStatus("error")
      setErrorMessage(error.message || "Failed to connect to Supabase")
      onError(error.message || "Failed to connect to Supabase")
      toast({
        title: "Supabase Connection Failed",
        description: error.message || "Failed to connect to Supabase",
        variant: "destructive",
      })
      setIsAuthenticating(false)
    }
  }

  const connectToSupabaseManual = async () => {
    if (!validateInputs()) {
      setStatus("error")
      return
    }

    setIsConnecting(true)
    setStatus("connecting")
    setErrorMessage("")

    try {
      console.log("Starting manual Supabase connection...")

      // Step 1: Discover and validate Supabase configuration
      console.log("Discovering Supabase configuration...")
      const discoverResponse = await fetch("/api/supabase/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          anonKey: anonKey.trim(),
          serviceRoleKey: serviceRoleKey.trim() || undefined,
        }),
      })

      if (!discoverResponse.ok) {
        const errorData = await discoverResponse.json()
        console.error("Discovery failed:", errorData)
        throw new Error(errorData.error || "Failed to discover Supabase configuration")
      }

      const discoverData = await discoverResponse.json()
      console.log("Discovery successful:", discoverData)

      // Step 2: Create the connection
      console.log("Creating Supabase connection...")
      const connectResponse = await fetch("/api/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "supabase",
          name: `Supabase (${discoverData.projectRef})`,
          credentials: {
            url: url.trim(),
            anonKey: anonKey.trim(),
            serviceRoleKey: serviceRoleKey.trim() || undefined,
            projectId: discoverData.projectId,
            projectRef: discoverData.projectRef,
          },
        }),
      })

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json()
        console.error("Connection creation failed:", errorData)
        throw new Error(errorData.error || "Failed to create Supabase connection")
      }

      const connectData = await connectResponse.json()
      console.log("Connection created successfully:", connectData.id)

      // Step 3: Verify the connection
      console.log("Verifying connection...")
      const verifyResponse = await fetch(`/api/connections/${connectData.id}/verify`)

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        console.error("Verification failed:", errorData)
        throw new Error(errorData.error || "Failed to verify Supabase connection")
      }

      const verifyData = await verifyResponse.json()
      console.log("Verification result:", verifyData)

      if (!verifyData.success) {
        throw new Error(verifyData.error || "Failed to verify Supabase connection")
      }

      setStatus("success")
      setConnectionId(connectData.id)
      onSuccess(connectData.id)
      toast({
        title: "Supabase Connected Successfully",
        description: `Your Supabase project (${discoverData.projectRef}) has been connected.`,
      })
    } catch (error) {
      console.error("Supabase connection error:", error)
      setStatus("error")
      setErrorMessage(error.message || "Failed to connect to Supabase")
      onError(error.message || "Failed to connect to Supabase")
      toast({
        title: "Supabase Connection Failed",
        description: error.message || "Failed to connect to Supabase",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const resetForm = () => {
    setStatus("idle")
    setErrorMessage("")
    setConnectionId("")
    setProgress(0)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Connect with Supabase
        </CardTitle>
        <CardDescription>Connect your Supabase project to enable database access and authentication.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Configuration</TabsTrigger>
            <TabsTrigger value="oauth">One-Click Connect</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="supabase-url">Supabase Project URL *</Label>
              <Input
                id="supabase-url"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status === "success" || isConnecting}
              />
              <p className="text-sm text-muted-foreground">Find this in your Supabase project settings under "API"</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anon-key">Anon Key *</Label>
              <div className="relative">
                <Input
                  id="anon-key"
                  type={showAnonKey ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  disabled={status === "success" || isConnecting}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  disabled={status === "success" || isConnecting}
                >
                  {showAnonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Your public anon key (safe to use in client-side code)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-role-key">Service Role Key (Optional)</Label>
              <div className="relative">
                <Input
                  id="service-role-key"
                  type={showServiceKey ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={serviceRoleKey}
                  onChange={(e) => setServiceRoleKey(e.target.value)}
                  disabled={status === "success" || isConnecting}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowServiceKey(!showServiceKey)}
                  disabled={status === "success" || isConnecting}
                >
                  {showServiceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">For admin operations (keep this secret!)</p>
            </div>

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Connected Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your Supabase project has been connected successfully. Connection ID: {connectionId}
                </AlertDescription>
              </Alert>
            )}

            {status === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="oauth" className="space-y-4 pt-4">
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Simplified Connection</AlertTitle>
              <AlertDescription className="text-blue-700">
                Connect to Supabase with a single click. We'll automatically retrieve your project's credentials.
              </AlertDescription>
            </Alert>

            {isAuthenticating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Connecting to Supabase...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Connected Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your Supabase project has been connected successfully.
                </AlertDescription>
              </Alert>
            )}

            {status === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex gap-2">
        {activeTab === "manual" ? (
          <>
            <Button
              onClick={connectToSupabaseManual}
              disabled={isConnecting || status === "success"}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : status === "success" ? (
                "Connected to Supabase"
              ) : (
                "Connect with Supabase"
              )}
            </Button>
            {status === "success" && (
              <Button variant="outline" onClick={resetForm}>
                Connect Another
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              onClick={connectToSupabaseOAuth}
              disabled={isAuthenticating || status === "success"}
              className="flex-1"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : status === "success" ? (
                "Connected to Supabase"
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with Supabase
                </>
              )}
            </Button>
            {status === "success" && (
              <Button variant="outline" onClick={resetForm}>
                Connect Another
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}
