"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Play, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface ConnectionTestSuiteProps {
  connectionId: string
  connectionType: string
}

interface TestResult {
  name: string
  success: boolean
  message: string
  details?: any
  duration?: number
}

export function ConnectionTestSuite({ connectionId, connectionType }: ConnectionTestSuiteProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [overallSuccess, setOverallSuccess] = useState<boolean | null>(null)
  const { toast } = useToast()

  const runTests = async () => {
    if (!connectionId || isRunning) {
      return
    }

    setIsRunning(true)
    setProgress(0)
    setResults([])
    setOverallSuccess(null)

    try {
      // Get the test suite for this connection type
      const tests = getTestsForConnectionType(connectionType)
      const totalTests = tests.length
      let passedTests = 0

      // Run each test
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i]
        const startTime = Date.now()

        // Update progress
        setProgress(Math.round((i / totalTests) * 100))

        try {
          // Run the test
          const result = await test.run(connectionId)

          const duration = Date.now() - startTime

          // Add the result
          const testResult: TestResult = {
            name: test.name,
            success: result.success,
            message: result.message,
            details: result.details,
            duration,
          }

          setResults((prev) => [...prev, testResult])

          if (result.success) {
            passedTests++
          }
        } catch (error) {
          console.error(`Test "${test.name}" error:`, error)

          const testResult: TestResult = {
            name: test.name,
            success: false,
            message: error.message || "Test failed with an error",
            duration: Date.now() - startTime,
          }

          setResults((prev) => [...prev, testResult])
        }
      }

      // Update final progress
      setProgress(100)

      // Set overall success
      const success = passedTests === totalTests
      setOverallSuccess(success)

      toast({
        title: success ? "All Tests Passed" : "Some Tests Failed",
        description: `${passedTests} of ${totalTests} tests passed`,
        variant: success ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Test suite error:", error)

      toast({
        title: "Test Suite Failed",
        description: error.message || "An error occurred while running tests",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getTestsForConnectionType = (type: string) => {
    switch (type) {
      case "github":
        return [
          {
            name: "Connection Verification",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/verify`)

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Verification failed")
              }

              return await response.json()
            },
          },
          {
            name: "User Profile Fetch",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "fetchUserProfile",
                }),
              })

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "User profile fetch failed")
              }

              return await response.json()
            },
          },
          {
            name: "Repository List Fetch",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "fetchRepositories",
                }),
              })

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Repository list fetch failed")
              }

              return await response.json()
            },
          },
        ]
      case "google":
        return [
          {
            name: "Connection Verification",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/verify`)

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Verification failed")
              }

              return await response.json()
            },
          },
          {
            name: "User Profile Fetch",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "fetchUserProfile",
                }),
              })

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "User profile fetch failed")
              }

              return await response.json()
            },
          },
        ]
      case "supabase":
        return [
          {
            name: "Connection Verification",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/verify`)

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Verification failed")
              }

              return await response.json()
            },
          },
          {
            name: "Database Query Test",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "queryDatabase",
                }),
              })

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Database query failed")
              }

              return await response.json()
            },
          },
        ]
      case "mcp":
        return [
          {
            name: "Connection Verification",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/verify`)

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Verification failed")
              }

              return await response.json()
            },
          },
          {
            name: "Context Creation Test",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "createContext",
                  params: {
                    content: "Test context content",
                    metadata: {
                      test: true,
                      timestamp: new Date().toISOString(),
                    },
                  },
                }),
              })

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Context creation failed")
              }

              return await response.json()
            },
          },
          {
            name: "Context Retrieval Test",
            run: async (connectionId: string) => {
              // First create a context
              const createResponse = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "createContext",
                  params: {
                    content: "Test context for retrieval",
                    metadata: {
                      test: true,
                      timestamp: new Date().toISOString(),
                    },
                  },
                }),
              })

              if (!createResponse.ok) {
                const error = await createResponse.json()
                throw new Error(error.error || "Context creation failed")
              }

              const createData = await createResponse.json()
              const contextId = createData.details?.id

              if (!contextId) {
                throw new Error("No context ID returned from creation")
              }

              // Now retrieve the context
              const response = await fetch(`/api/connections/${connectionId}/test`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  test: "getContext",
                  params: {
                    contextId,
                  },
                }),
              })

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Context retrieval failed")
              }

              return await response.json()
            },
          },
        ]
      default:
        return [
          {
            name: "Connection Verification",
            run: async (connectionId: string) => {
              const response = await fetch(`/api/connections/${connectionId}/verify`)

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Verification failed")
              }

              return await response.json()
            },
          },
        ]
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Connection Test Suite</CardTitle>
        <CardDescription>Run comprehensive tests to ensure the connection is working properly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Running tests...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <Alert className={overallSuccess ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              {overallSuccess ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle className={overallSuccess ? "text-green-800" : "text-red-800"}>
                {overallSuccess ? "All Tests Passed" : "Some Tests Failed"}
              </AlertTitle>
              <AlertDescription className={overallSuccess ? "text-green-700" : "text-red-700"}>
                {`${results.filter((r) => r.success).length} of ${results.length} tests passed`}
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full">
              {results.map((result, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-left">{result.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.duration ? `${result.duration}ms` : ""}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 p-2">
                      <p className={result.success ? "text-green-700" : "text-red-700"}>{result.message}</p>
                      {result.details && (
                        <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={runTests} disabled={isRunning || !connectionId} className="w-full">
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Test Suite
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
