import { NextResponse } from "next/server"
import { getConnectionById } from "@/lib/connections-service"
import { decryptSecret } from "@/lib/utils/encryption"
import { createContext } from "@/lib/mcp/official-protocol"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const connectionId = params.id
    const { test, params: testParams } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ success: false, error: "Connection ID is required" }, { status: 400 })
    }

    if (!test) {
      return NextResponse.json({ success: false, error: "Test name is required" }, { status: 400 })
    }

    // Get the connection
    const connection = await getConnectionById(connectionId)

    if (!connection) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 })
    }

    // Run the test based on the connection type and test name
    switch (connection.type) {
      case "github":
        return await runGitHubTest(connection, test, testParams)
      case "google":
        return await runGoogleTest(connection, test, testParams)
      case "supabase":
        return await runSupabaseTest(connection, test, testParams)
      case "mcp":
        return await runMCPTest(connection, test, testParams)
      default:
        return NextResponse.json(
          { success: false, error: `Tests not implemented for ${connection.type} connections` },
          { status: 501 },
        )
    }
  } catch (error) {
    console.error("Connection test error:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}

async function runGitHubTest(connection: any, test: string, params: any) {
  const accessToken = connection.credentials?.accessToken ? decryptSecret(connection.credentials.accessToken) : null

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "GitHub access token not found" }, { status: 400 })
  }

  switch (test) {
    case "fetchUserProfile":
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!userResponse.ok) {
        return NextResponse.json({ success: false, error: `GitHub API error: ${userResponse.status}` }, { status: 400 })
      }

      const user = await userResponse.json()

      return NextResponse.json({
        success: true,
        message: "Successfully fetched GitHub user profile",
        details: user,
      })

    case "fetchRepositories":
      const reposResponse = await fetch("https://api.github.com/user/repos?per_page=10", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      if (!reposResponse.ok) {
        return NextResponse.json(
          { success: false, error: `GitHub API error: ${reposResponse.status}` },
          { status: 400 },
        )
      }

      const repos = await reposResponse.json()

      return NextResponse.json({
        success: true,
        message: "Successfully fetched GitHub repositories",
        details: repos,
      })

    default:
      return NextResponse.json(
        { success: false, error: `Test "${test}" not implemented for GitHub connections` },
        { status: 501 },
      )
  }
}

async function runGoogleTest(connection: any, test: string, params: any) {
  const accessToken = connection.credentials?.accessToken ? decryptSecret(connection.credentials.accessToken) : null

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Google access token not found" }, { status: 400 })
  }

  switch (test) {
    case "fetchUserProfile":
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!userResponse.ok) {
        return NextResponse.json({ success: false, error: `Google API error: ${userResponse.status}` }, { status: 400 })
      }

      const user = await userResponse.json()

      return NextResponse.json({
        success: true,
        message: "Successfully fetched Google user profile",
        details: user,
      })

    default:
      return NextResponse.json(
        { success: false, error: `Test "${test}" not implemented for Google connections` },
        { status: 501 },
      )
  }
}

async function runSupabaseTest(connection: any, test: string, params: any) {
  const anonKey = connection.credentials?.anonKey ? decryptSecret(connection.credentials.anonKey) : null

  const serviceRoleKey = connection.credentials?.serviceRoleKey
    ? decryptSecret(connection.credentials.serviceRoleKey)
    : null

  const url = connection.credentials?.url || null

  if (!anonKey || !serviceRoleKey || !url) {
    return NextResponse.json({ success: false, error: "Missing Supabase credentials" }, { status: 400 })
  }

  switch (test) {
    case "queryDatabase":
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      })

      if (!response.ok) {
        return NextResponse.json({ success: false, error: `Supabase API error: ${response.status}` }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: "Successfully queried Supabase database",
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      })

    default:
      return NextResponse.json(
        { success: false, error: `Test "${test}" not implemented for Supabase connections` },
        { status: 501 },
      )
  }
}

async function runMCPTest(connection: any, test: string, params: any) {
  const baseUrl = connection.credentials?.baseUrl || null
  const apiKey = connection.credentials?.apiKey ? decryptSecret(connection.credentials.apiKey) : undefined

  if (!baseUrl) {
    return NextResponse.json({ success: false, error: "MCP server URL not found in connection" }, { status: 400 })
  }

  switch (test) {
    case "createContext":
      if (!params?.content) {
        return NextResponse.json({ success: false, error: "Content is required for context creation" }, { status: 400 })
      }

      const context = await createContext(
        baseUrl,
        {
          content: params.content,
          metadata: params.metadata || {},
        },
        apiKey,
      )

      return NextResponse.json({
        success: true,
        message: "Successfully created context",
        details: context,
      })

    default:
      return NextResponse.json(
        { success: false, error: `Test "${test}" not implemented for MCP connections` },
        { status: 501 },
      )
  }
}
