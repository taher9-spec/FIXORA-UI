"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getOrigin } from "@/lib/utils/environment"

interface SupabaseConnectorProps {
  onSuccess: (connectionId: string) => void
  onError: (error: string) => void
}

export function SupabaseConnector({ onSuccess, onError }: SupabaseConnectorProps) {
  const [url, setUrl] = useState("")
  const [anonKey, setAnonKey] = useState("")
  const [serviceRoleKey, setServiceRoleKey] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [connectionId, setConnectionId] = useState("")
  const { toast } = useToast()

  // Auto-detect the current origin for redirect URIs
  const origin = getOrigin()

  const validateInputs = () => {
    if (!url) {
      setErrorMessage("Supabase URL is required")
      return false
    }

    if (!url.startsWith("https://")) {
      setErrorMessage("Supabase URL must start with https://")
      return false
    }

    if (!anonKey) {
      setErrorMessage("Anon Key is required")
      return false
    }

    if (!serviceRoleKey) {
      setErrorMessage("Service Role Key is required")
      return false
    }

    return true
  }

  const connectToSupabase = async () => {
    if (!validateInputs()) {
      setStatus("error")
      return
    }

    setIsConnecting(true)
    setStatus("connecting")

    try {
      // First, try to discover Supabase configuration
      const discoverResponse = await fetch("/api/supabase/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          anonKey,
          serviceRoleKey,
        }),
      })

      if (!discoverResponse.ok) {
        throw new Error("Failed to discover Supabase configuration")
      }

      const discoverData = await discoverResponse.json()

      // Now create the connection
      const connectResponse = await fetch("/api/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "supabase",
          name: "Supabase",
          credentials: {
            url,
            anonKey,
            serviceRoleKey,
            projectId: discoverData.projectId,
            projectRef: discoverData.projectRef,
          },
        }),
      })

      if (!connectResponse.ok) {
        throw new Error("Failed to create Supabase connection")
      }

      const connectData = await connectResponse.json()

      // Verify the connection
      const verifyResponse = await fetch(`/api/connections/${connectData.id}/verify`)

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify Supabase connection")
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
        description: "Your Supabase project has been connected.",
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
        <div className="space-y-2">
          <Label htmlFor="supabase-url">Supabase URL</Label>
          <Input
            id="supabase-url"
            placeholder="https://your-project.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === "success"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="anon-key">Anon Key</Label>
          <Input
            id="anon-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            disabled={status === "success"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-role-key">Service Role Key</Label>
          <Input
            id="service-role-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={serviceRoleKey}
            onChange={(e) => setServiceRoleKey(e.target.value)}
            disabled={status === "success"}
          />
        </div>

        {status === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Connected Successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              Your Supabase project has been connected successfully.
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
        <Button onClick={connectToSupabase} disabled={isConnecting || status === "success"} className="w-full">
          {isConnecting
            ? "Connecting to Supabase..."
            : status === "success"
              ? "Connected to Supabase"
              : "Connect with Supabase"}
        </Button>
      </CardFooter>
    </Card>
  )
}
