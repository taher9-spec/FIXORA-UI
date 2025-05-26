import { NextResponse } from "next/server"
import { decryptSecret } from "@/lib/utils/encryption"
import type { Connection } from "@/lib/connections/types"

// GitHub verification
export async function verifyGitHubConnection(connection: Connection) {
  try {
    let accessToken

    try {
      accessToken = connection.credentials?.accessToken ? decryptSecret(connection.credentials.accessToken) : null
    } catch (decryptError) {
      console.error("Decryption error:", decryptError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to decrypt GitHub credentials. Please reconnect your GitHub account.",
        },
        { status: 400 },
      )
    }

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Missing GitHub access token" }, { status: 400 })
    }

    // Test the connection by fetching the user profile
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error("GitHub API error:", response.status, response.statusText)
      return NextResponse.json({ success: false, error: "Failed to authenticate with GitHub" }, { status: 400 })
    }

    const user = await response.json()
    console.log("GitHub user:", user)

    return NextResponse.json({
      success: true,
      message: "GitHub connection verified successfully",
      user,
      status: 200,
    })
  } catch (error) {
    console.error("Error verifying GitHub connection:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}

// Google verification
export async function verifyGoogleConnection(connection: Connection) {
  try {
    let accessToken

    try {
      accessToken = connection.credentials?.accessToken ? decryptSecret(connection.credentials.accessToken) : null
    } catch (decryptError) {
      console.error("Decryption error:", decryptError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to decrypt Google credentials. Please reconnect your Google account.",
        },
        { status: 400 },
      )
    }

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Missing Google access token" }, { status: 400 })
    }

    // Test the connection by fetching the user profile
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error("Google API error:", response.status, response.statusText)
      return NextResponse.json({ success: false, error: "Failed to authenticate with Google" }, { status: 400 })
    }

    const user = await response.json()
    console.log("Google user:", user)

    return NextResponse.json({
      success: true,
      message: "Google connection verified successfully",
      user,
      status: 200,
    })
  } catch (error) {
    console.error("Error verifying Google connection:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}

// Supabase verification will be implemented in the next section
export async function verifySupabaseConnection(connection: Connection) {
  try {
    let anonKey, serviceRoleKey, url

    try {
      anonKey = connection.credentials?.anonKey ? decryptSecret(connection.credentials.anonKey) : null
      serviceRoleKey = connection.credentials?.serviceRoleKey
        ? decryptSecret(connection.credentials.serviceRoleKey)
        : null
      url = connection.credentials?.url || null
    } catch (decryptError) {
      console.error("Decryption error:", decryptError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to decrypt Supabase credentials. Please reconnect your Supabase account.",
        },
        { status: 400 },
      )
    }

    if (!anonKey || !url) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required Supabase credentials (URL and anon key required)",
        },
        { status: 400 },
      )
    }

    // Validate URL format
    if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Supabase URL format. Should be https://your-project.supabase.co",
        },
        { status: 400 },
      )
    }

    // Test the connection with a simple health check
    const healthUrl = `${url}/rest/v1/`
    console.log("Testing Supabase connection to:", healthUrl)

    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Supabase response status:", response.status)
    console.log("Supabase response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Supabase API error:", response.status, response.statusText, errorText)

      if (response.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Supabase anon key. Please check your credentials.",
          },
          { status: 400 },
        )
      }

      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Supabase project not found. Please check your URL.",
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Supabase connection failed: ${response.status} ${response.statusText}`,
        },
        { status: 400 },
      )
    }

    // Try to get some basic info about the project
    let projectInfo = null
    try {
      const responseText = await response.text()
      console.log("Supabase response body:", responseText)

      // If we get here, the connection is working
      projectInfo = {
        url: url,
        status: "connected",
        timestamp: new Date().toISOString(),
      }
    } catch (parseError) {
      console.log("Could not parse response, but connection is working")
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection verified successfully",
      projectInfo,
      status: 200,
    })
  } catch (error) {
    console.error("Error verifying Supabase connection:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Connection verification failed: ${error.message}`,
      },
      { status: 500 },
    )
  }
}

// MCP verification will be implemented in the MCP section
export async function verifyMCPConnection(connection: Connection) {
  try {
    const baseUrl = connection.credentials?.baseUrl || null
    let apiKey

    try {
      apiKey = connection.credentials?.apiKey ? decryptSecret(connection.credentials.apiKey) : null
    } catch (decryptError) {
      console.error("Decryption error:", decryptError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to decrypt MCP credentials. Please reconnect your MCP server.",
        },
        { status: 400 },
      )
    }

    if (!baseUrl) {
      return NextResponse.json({ success: false, error: "Missing MCP server URL" }, { status: 400 })
    }

    // Test the connection by fetching the MCP server status
    const headers: HeadersInit = {}
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    // Try to access the context endpoint which is required by the MCP protocol
    const response = await fetch(`${baseUrl}/v1/context`, {
      method: "HEAD",
      headers,
    })

    if (!response.ok) {
      console.error("MCP API error:", response.status, response.statusText)
      return NextResponse.json({ success: false, error: "Failed to connect to MCP server" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "MCP connection verified successfully",
      status: 200,
    })
  } catch (error) {
    console.error("Error verifying MCP connection:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
