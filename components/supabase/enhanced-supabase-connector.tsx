"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database, Loader2, Eye, EyeOff, Zap, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getOrigin } from "@/lib/utils/environment"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface SupabaseConnectorProps {
  onSuccess: (connectionId: string) => void
  onError: (error: string) => void
}

interface SupabaseStatus {
  supabase: {
    configured: boolean
    url?: string
    hasAnonKey: boolean
    hasServiceKey: boolean
    clientReady: boolean
    adminReady: boolean
    connectionTest?: string
    error?: string
  }
  postgres: {
    configured: boolean
    host?: string
    database?: string
    user?: string
    connectionTest?: string
    error?: string
  }
}

export function EnhancedSupabaseConnector({ onSuccess, onError }: SupabaseConnectorProps) {
  const [url, setUrl] = useState("")
  const [anonKey, setAnonKey] = useState("")
  const [serviceRoleKey, setServiceRoleKey] = useState("")
  const [showAnonKey, setShowAnonKey] = useState(false)
  const [showServiceKey, setShowServiceKey] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [connectionId, setConnectionId] = useState("")
  const [activeTab, setActiveTab] = useState<string>("auto")
  const [progress, setProgress] = useState(0)
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const { toast } = useToast()

  // Auto-detect the current origin for redirect URIs
  const origin = getOrigin()

  // Load Supabase status on component mount
  useEffect(() => {
    loadSupabaseStatus()
  }, [])

  const loadSupabaseStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch("/api/supabase/status")
      if (response.ok) {
        const data = await response.json()
        setSupabaseStatus(data)

        // If Supabase is configured, default to auto-connect tab
        if (data.supabase.configured) {
          setActiveTab("auto")
        } else {
          setActiveTab("manual")
        }
      }
    } catch (error) {
      console.error("Failed to load Supabase status:", error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

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

    if (serviceRoleKey && serviceRoleKey.length < 100) {
      setErrorMessage("Service Role Key appears to be invalid (too short)")
      return false
    }

    return true
  }

  const connectWithEnvironmentVariables = async () => {
    setIsAutoConnecting(true)
    setStatus("connecting")
    setErrorMessage("")

    try {
      console.log("Connecting with environment variables...")

      const response = await fetch("/api/supabase/auto-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to auto-connect to Supabase")
      }

      const connectionData = await response.json()
      console.log("Auto-connection successful:", connectionData.id)

      // Verify the connection
      const verifyResponse = await fetch(`/api/connections/${connectionData.id}/verify`)

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        console.error("Verification failed:", errorData)
        throw new Error(errorData.error || "Failed to verify Supabase connection")
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
        description: "Connected using environment variables.",
      })
    } catch (error) {
      console.error("Auto-connect error:", error)
      setStatus("error")
      setErrorMessage(error.message || "Failed to auto-connect to Supabase")
      onError(error.message || "Failed to auto-connect to Supabase")
      toast({
        title: "Supabase Auto-Connect Failed",
        description: error.message || "Failed to auto-connect to Supabase",
        variant: "destructive",
      })
    } finally {
      setIsAutoConnecting(false)
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
        throw new Error(errorData.error || "Failed to discover Supabase configuration")
      }

      const discoverData = await discoverResponse.json()

      // Step 2: Create the connection
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
            source: "manual",
          },
        }),
      })

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json()
        throw new Error(errorData.error || "Failed to create Supabase connection")
      }

      const connectData = await connectResponse.json()

      // Step 3: Verify the connection
      const verifyResponse = await fetch(`/api/connections/${connectData.id}/verify`)

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || "Failed to verify Supabase connection")
      }

      const verifyData = await verifyResponse.json()

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

  if (isLoadingStatus) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Supabase status...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Connect with Supabase
        </CardTitle>
        <CardDescription>Connect your Supabase project to enable database access and authentication.</CardDescription>

        {supabaseStatus && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={supabaseStatus.supabase.configured ? "default" : "secondary"}>
              {supabaseStatus.supabase.configured ? "Environment Configured" : "Not Configured"}
            </Badge>
            {supabaseStatus.postgres.configured && <Badge variant="outline">Postgres Available</Badge>}
            {supabaseStatus.supabase.connectionTest === "success" && (
              <Badge variant="default" className="bg-green-600">
                Connection Tested
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto" disabled={!supabaseStatus?.supabase.configured}>
              <Zap className="h-4 w-4 mr-2" />
              Auto-Connect
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Settings className="h-4 w-4 mr-2" />
              Manual Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-4 pt-4">
            {supabaseStatus?.supabase.configured ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Environment Variables Detected</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Supabase is configured via environment variables. Click below to connect automatically.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Configuration Details:</h4>
                  <div className="text-sm space-y-1">
                    <div>URL: {supabaseStatus.supabase.url}</div>
                    <div>Anon Key: {supabaseStatus.supabase.hasAnonKey ? "✓ Available" : "✗ Missing"}</div>
                    <div>Service Key: {supabaseStatus.supabase.hasServiceKey ? "✓ Available" : "✗ Missing"}</div>
                    {supabaseStatus.supabase.connectionTest && (
                      <div>
                        Connection Test:{" "}
                        {supabaseStatus.supabase.connectionTest === "success" ? "✓ Passed" : "✗ Failed"}
                      </div>
                    )}
                  </div>
                </div>

                {status === "success" && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Connected Successfully</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Supabase has been connected using environment variables. Connection ID: {connectionId}
                    </AlertDescription>
                  </Alert>
                )}

                {status === "error" && errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Auto-Connect Failed</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Environment Variables Missing</AlertTitle>
                <AlertDescription>
                  Supabase environment variables are not configured. Please use manual setup or configure the following
                  variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

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
        </Tabs>
      </CardContent>

      <CardFooter className="flex gap-2">
        {activeTab === "auto" ? (
          <>
            <Button
              onClick={connectWithEnvironmentVariables}
              disabled={isAutoConnecting || status === "success" || !supabaseStatus?.supabase.configured}
              className="flex-1"
            >
              {isAutoConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Auto-Connecting...
                </>
              ) : status === "success" ? (
                "Connected via Environment"
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Auto-Connect Supabase
                </>
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
        )}
      </CardFooter>
    </Card>
  )
}
