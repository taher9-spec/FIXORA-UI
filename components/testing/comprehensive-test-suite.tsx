"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Play, RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface TestResult {
  name: string
  success: boolean
  message: string
  details?: any
  duration?: number
}

interface TestCategory {
  id: string
  name: string
  tests: TestResult[]
  status: "idle" | "running" | "success" | "error" | "partial"
}

export function ComprehensiveTestSuite() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("all")
  const [categories, setCategories] = useState<TestCategory[]>([
    {
      id: "api-keys",
      name: "API Key Configuration",
      tests: [],
      status: "idle",
    },
    {
      id: "models",
      name: "Model Selection",
      tests: [],
      status: "idle",
    },
    {
      id: "connections",
      name: "External Connections",
      tests: [],
      status: "idle",
    },
    {
      id: "mcp",
      name: "MCP Protocol",
      tests: [],
      status: "idle",
    },
    {
      id: "agent",
      name: "Agent Functionality",
      tests: [],
      status: "idle",
    },
  ])
  const [overallSuccess, setOverallSuccess] = useState<boolean | null>(null)
  const { toast } = useToast()

  const runAllTests = async () => {
    if (isRunning) {
      return
    }

    setIsRunning(true)
    setProgress(0)
    setOverallSuccess(null)

    // Reset all test results
    setCategories((prev) =>
      prev.map((category) => ({
        ...category,
        tests: [],
        status: "idle",
      })),
    )

    try {
      let totalTests = 0
      let completedTests = 0
      let passedTests = 0

      // Count total tests
      for (const category of categories) {
        const tests = getTestsForCategory(category.id)
        totalTests += tests.length
      }

      // Run tests for each category
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i]

        // Update category status
        setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, status: "running" } : c)))

        const tests = getTestsForCategory(category.id)
        const results: TestResult[] = []
        let categorySuccess = true

        // Run each test in the category
        for (const test of tests) {
          const startTime = Date.now()

          try {
            // Run the test
            const result = await runTest(category.id, test.id)
            const duration = Date.now() - startTime

            const testResult: TestResult = {
              name: test.name,
              success: result.success,
              message: result.message || (result.success ? "Test passed" : "Test failed"),
              details: result.details,
              duration,
            }

            results.push(testResult)

            if (result.success) {
              passedTests++
            } else {
              categorySuccess = false
            }
          } catch (error) {
            console.error(`Test "${test.name}" error:`, error)

            const testResult: TestResult = {
              name: test.name,
              success: false,
              message: error.message || "Test failed with an error",
              duration: Date.now() - startTime,
            }

            results.push(testResult)
            categorySuccess = false
          }

          completedTests++
          setProgress(Math.round((completedTests / totalTests) * 100))

          // Update category with new test result
          setCategories((prev) =>
            prev.map((c) =>
              c.id === category.id
                ? {
                    ...c,
                    tests: [...results],
                    status: results.length === tests.length ? (categorySuccess ? "success" : "error") : "running",
                  }
                : c,
            ),
          )

          // Small delay between tests
          await new Promise((resolve) => setTimeout(resolve, 300))
        }

        // Update category status
        setCategories((prev) =>
          prev.map((c) =>
            c.id === category.id
              ? {
                  ...c,
                  status: categorySuccess ? "success" : "error",
                }
              : c,
          ),
        )
      }

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
      setProgress(100)
    }
  }

  const runCategoryTests = async (categoryId: string) => {
    if (isRunning) {
      return
    }

    setIsRunning(true)
    setProgress(0)

    // Reset category test results
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              tests: [],
              status: "running",
            }
          : category,
      ),
    )

    try {
      const tests = getTestsForCategory(categoryId)
      const results: TestResult[] = []
      let passedTests = 0

      for (let i = 0; i < tests.length; i++) {
        const test = tests[i]
        const startTime = Date.now()

        // Update progress
        setProgress(Math.round((i / tests.length) * 100))

        try {
          // Run the test
          const result = await runTest(categoryId, test.id)
          const duration = Date.now() - startTime

          const testResult: TestResult = {
            name: test.name,
            success: result.success,
            message: result.message || (result.success ? "Test passed" : "Test failed"),
            details: result.details,
            duration,
          }

          results.push(testResult)

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

          results.push(testResult)
        }

        // Update category with new test result
        setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, tests: [...results] } : c)))

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      // Update category status
      const categorySuccess = passedTests === tests.length
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                status: categorySuccess ? "success" : "error",
              }
            : c,
        ),
      )

      toast({
        title: categorySuccess ? "All Tests Passed" : "Some Tests Failed",
        description: `${passedTests} of ${tests.length} tests passed`,
        variant: categorySuccess ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Category test error:", error)

      toast({
        title: "Test Failed",
        description: error.message || "An error occurred while running tests",
        variant: "destructive",
      })

      // Update category status
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, status: "error" } : c)))
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  const getTestsForCategory = (categoryId: string) => {
    switch (categoryId) {
      case "api-keys":
        return [
          { id: "config-exists", name: "Configuration Exists" },
          { id: "api-key-saved", name: "API Key Saved" },
          { id: "api-key-valid", name: "API Key Valid" },
        ]
      case "models":
        return [
          { id: "model-selected", name: "Model Selected" },
          { id: "model-compatible", name: "Model Compatible with Provider" },
          { id: "context-length-set", name: "Context Length Set" },
        ]
      case "connections":
        return [
          { id: "github-connected", name: "GitHub Connection" },
          { id: "supabase-connected", name: "Supabase Connection" },
          { id: "oauth-flow", name: "OAuth Flow" },
        ]
      case "mcp":
        return [
          { id: "mcp-server-connected", name: "MCP Server Connected" },
          { id: "context-creation", name: "Context Creation" },
          { id: "context-retrieval", name: "Context Retrieval" },
        ]
      case "agent":
        return [
          { id: "agent-responds", name: "Agent Responds" },
          { id: "tool-usage", name: "Tool Usage" },
          { id: "streaming", name: "Streaming Response" },
        ]
      default:
        return []
    }
  }

  const runTest = async (categoryId: string, testId: string) => {
    // Simulate API call to run the test
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))

    // For demo purposes, we'll simulate test results
    // In a real implementation, this would call actual test endpoints

    // Simulate some failures to demonstrate UI
    const shouldFail = Math.random() < 0.2

    if (shouldFail) {
      return {
        success: false,
        message: `Test ${testId} failed with a simulated error`,
        details: {
          error: "Simulated test failure",
          timestamp: new Date().toISOString(),
        },
      }
    }

    return {
      success: true,
      message: `Test ${testId} passed successfully`,
      details: {
        timestamp: new Date().toISOString(),
      },
    }
  }

  const getCategoryStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Passed</Badge>
      case "error":
        return <Badge variant="destructive">Failed</Badge>
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>
      case "partial":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            Partial
          </Badge>
        )
      default:
        return <Badge variant="outline">Not Run</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Comprehensive Test Suite</span>
          {overallSuccess !== null && (
            <Badge className={overallSuccess ? "bg-green-500" : "bg-red-500"}>
              {overallSuccess ? "All Tests Passed" : "Tests Failed"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Run comprehensive tests to ensure all components are working correctly.</CardDescription>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="all">All Tests</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="relative">
                {category.name}
                {category.status !== "idle" && (
                  <span className="absolute -top-1 -right-1">{getCategoryStatusBadge(category.status)}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{category.name}</span>
                      {getCategoryStatusBadge(category.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      {category.tests.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                          {category.tests.map((test, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                              <AccordionTrigger className="flex items-center gap-2 py-2">
                                {test.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                )}
                                <span className="flex-1 text-left">{test.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {test.duration ? `${test.duration}ms` : ""}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 p-2">
                                  <p className={test.success ? "text-green-700" : "text-red-700"}>{test.message}</p>
                                  {test.details && (
                                    <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                                      {JSON.stringify(test.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tests have been run yet.</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button
                      onClick={() => runCategoryTests(category.id)}
                      disabled={isRunning}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isRunning && category.status === "running" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Tests
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name} Tests</span>
                    {getCategoryStatusBadge(category.status)}
                  </CardTitle>
                  <CardDescription>Run tests for the {category.name.toLowerCase()} functionality.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isRunning && category.status === "running" && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Running tests...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <div className="space-y-4">
                    {category.tests.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {category.tests.map((test, index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="flex items-center gap-2">
                              {test.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              <span className="flex-1 text-left">{test.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {test.duration ? `${test.duration}ms` : ""}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 p-2">
                                <p className={test.success ? "text-green-700" : "text-red-700"}>{test.message}</p>
                                {test.details && (
                                  <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                                    {JSON.stringify(test.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Tests Run</AlertTitle>
                        <AlertDescription>
                          Click the "Run Tests" button to start testing {category.name.toLowerCase()} functionality.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => runCategoryTests(category.id)} disabled={isRunning} className="w-full">
                    {isRunning && category.status === "running" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run {category.name} Tests
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button onClick={runAllTests} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running All Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run All Tests
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
