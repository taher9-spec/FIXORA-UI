import { NextResponse } from "next/server"
import { createContext } from "@/lib/mcp/official-protocol"
import { getConnectionById } from "@/lib/connections-service"
import { decryptSecret } from "@/lib/utils/encryption"

export async function POST(request: Request) {
  try {
    const { connectionId, content, metadata } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Get the MCP connection
    const connection = await getConnectionById(connectionId)

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    if (connection.type !== "mcp") {
      return NextResponse.json({ error: "Connection is not an MCP connection" }, { status: 400 })
    }

    const baseUrl = connection.credentials?.baseUrl
    const apiKey = connection.credentials?.apiKey ? decryptSecret(connection.credentials.apiKey) : undefined

    if (!baseUrl) {
      return NextResponse.json({ error: "MCP server URL not found in connection" }, { status: 400 })
    }

    // Create the context in the MCP server
    const context = await createContext(
      baseUrl,
      {
        content,
        metadata: metadata || {},
      },
      apiKey,
    )

    return NextResponse.json(context)
  } catch (error) {
    console.error("MCP context creation error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
