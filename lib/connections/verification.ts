import { NextResponse } from "next/server"
import { decryptSecret } from "@/lib/utils/encryption"
import type { Connection } from "@/lib/connections/types"

// GitHub verification
export async function verifyGitHubConnection(connection: Connection) {
  try {
    // Decrypt the access token
    const accessToken = connection.credentials?.accessToken ? decryptSecret(connection.credentials.accessToken) : null

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
    // Decrypt the access token
    const accessToken = connection.credentials?.accessToken ? decryptSecret(connection.credentials.accessToken) : null

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
    const anonKey = connection.credentials?.anonKey ? decryptSecret(connection.credentials.anonKey) : null

    const serviceRoleKey = connection.credentials?.serviceRoleKey
      ? decryptSecret(connection.credentials.serviceRoleKey)
      : null

    const url = connection.credentials?.url || null

    if (!anonKey || !serviceRoleKey || !url) {
      return NextResponse.json({ success: false, error: "Missing Supabase credentials" }, { status: 400 })
    }

    // Test the connection by fetching the Supabase service status
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    })

    if (!response.ok) {
      console.error("Supabase API error:", response.status, response.statusText)
      return NextResponse.json({ success: false, error: "Failed to connect to Supabase" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection verified successfully",
      status: 200,
    })
  } catch (error) {
    console.error("Error verifying Supabase connection:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}

// MCP verification will be implemented in the MCP section
export async function verifyMCPConnection(connection: Connection) {
  try {
    const baseUrl = connection.credentials?.baseUrl || null
    const apiKey = connection.credentials?.apiKey ? decryptSecret(connection.credentials.apiKey) : null

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
