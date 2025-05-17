"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

interface ConnectionVerificationProps {
  connectionId: string
  onVerified?: (result: VerificationResult) => void
}

interface VerificationResult {
  success: boolean
  message: string
  details?: any
}

export function ConnectionVerification({ connectionId, onVerified }: ConnectionVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const verifyConnection = async () => {
    if (!connectionId || isVerifying) {
      return
    }

    setIsVerifying(true)
    setProgress(0)
    setVerificationResult(null)

    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // Verify the connection
      const response = await fetch(`/api/connections/${connectionId}/verify`)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Verification failed")
      }

      const result = await response.json()

      const verificationResult: VerificationResult = {
        success: result.success,
        message: result.message || (result.success ? "Verification successful" : "Verification failed"),
        details: result,
      }

      setVerificationResult(verificationResult)

      if (onVerified) {
        onVerified(verificationResult)
      }

      toast({
        title: verificationResult.success ? "Verification Successful" : "Verification Failed",
        description: verificationResult.message,
        variant: verificationResult.success ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Connection verification error:", error)

      const errorResult: VerificationResult = {
        success: false,
        message: error.message || "Verification failed",
      }

      setVerificationResult(errorResult)

      if (onVerified) {
        onVerified(errorResult)
      }

      toast({
        title: "Verification Failed",
        description: error.message || "An error occurred during verification",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  // Verify on mount
  useEffect(() => {
    if (connectionId) {
      verifyConnection()
    }
  }, [connectionId])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Connection Verification</CardTitle>
        <CardDescription>Verify that the connection is working properly.</CardDescription>
      </CardHeader>
      <CardContent>
        {isVerifying && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Verifying connection...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {!isVerifying && verificationResult && (
          <Alert className={verificationResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            {verificationResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle className={verificationResult.success ? "text-green-800" : "text-red-800"}>
              {verificationResult.success ? "Verification Successful" : "Verification Failed"}
            </AlertTitle>
            <AlertDescription className={verificationResult.success ? "text-green-700" : "text-red-700"}>
              {verificationResult.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={verifyConnection} disabled={isVerifying || !connectionId} variant="outline" className="w-full">
          {isVerifying ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Verify Connection
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
