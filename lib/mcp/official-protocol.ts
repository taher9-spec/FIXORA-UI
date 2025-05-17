/**
 * Implementation of the official Model Context Protocol (MCP)
 *
 * This file implements the official MCP specification for context storage and retrieval.
 *
 * MCP Protocol Endpoints:
 * - POST /v1/context - Store context
 * - GET /v1/context/{id} - Retrieve context
 */

export interface MCPContext {
  id?: string
  content: string
  metadata?: Record<string, any>
  created_at?: string
  expires_at?: string
}

export interface MCPContextResponse {
  id: string
  content: string
  metadata: Record<string, any>
  created_at: string
  expires_at?: string
}

export interface MCPError {
  error: {
    message: string
    type: string
    code: number
  }
}

/**
 * Creates a new context in the MCP server
 * @param baseUrl The base URL of the MCP server
 * @param context The context to store
 * @param apiKey Optional API key for authentication
 * @returns The created context with ID and timestamps
 */
export async function createContext(
  baseUrl: string,
  context: MCPContext,
  apiKey?: string,
): Promise<MCPContextResponse> {
  try {
    const url = `${baseUrl}/v1/context`

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(context),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as MCPError
      throw new Error(errorData.error?.message || `MCP server error: ${response.status}`)
    }

    return (await response.json()) as MCPContextResponse
  } catch (error) {
    console.error("Error creating MCP context:", error)
    throw error
  }
}

/**
 * Retrieves a context from the MCP server by ID
 * @param baseUrl The base URL of the MCP server
 * @param contextId The ID of the context to retrieve
 * @param apiKey Optional API key for authentication
 * @returns The retrieved context
 */
export async function getContext(baseUrl: string, contextId: string, apiKey?: string): Promise<MCPContextResponse> {
  try {
    const url = `${baseUrl}/v1/context/${contextId}`

    const headers: HeadersInit = {
      Accept: "application/json",
    }

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      const errorData = (await response.json()) as MCPError
      throw new Error(errorData.error?.message || `MCP server error: ${response.status}`)
    }

    return (await response.json()) as MCPContextResponse
  } catch (error) {
    console.error("Error retrieving MCP context:", error)
    throw error
  }
}

/**
 * Validates an MCP server by checking if it implements the required endpoints
 * @param baseUrl The base URL of the MCP server
 * @param apiKey Optional API key for authentication
 * @returns A validation result object
 */
export async function validateMCPServer(baseUrl: string, apiKey?: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if the server has the required endpoints
    const endpoints = [
      { method: "HEAD", path: "/v1/context" },
      { method: "OPTIONS", path: "/v1/context" },
    ]

    const headers: HeadersInit = {}

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    // Test each endpoint
    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers,
      })

      // If any endpoint fails, the server is not valid
      if (!response.ok) {
        return {
          valid: false,
          error: `MCP server does not implement ${endpoint.method} ${endpoint.path} (status: ${response.status})`,
        }
      }
    }

    // Test creating and retrieving a context
    const testContext: MCPContext = {
      content: "MCP validation test",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    }

    const createdContext = await createContext(baseUrl, testContext, apiKey)

    if (!createdContext.id) {
      return {
        valid: false,
        error: "MCP server did not return a valid context ID",
      }
    }

    // Try to retrieve the created context
    const retrievedContext = await getContext(baseUrl, createdContext.id, apiKey)

    if (retrievedContext.content !== testContext.content) {
      return {
        valid: false,
        error: "MCP server did not correctly store and retrieve context",
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("Error validating MCP server:", error)
    return {
      valid: false,
      error: error.message || "Unknown error validating MCP server",
    }
  }
}
