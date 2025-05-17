import { NextResponse } from "next/server"
import { getContext } from "@/lib/mcp/official-protocol"
import { getConnectionById } from "@/lib/connections-service"
import { decryptSecret } from "@/lib/utils/encryption"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Extract the connection ID and context ID from the URL
    // Format: /api/mcp/context/[connectionId]:[contextId]
    const combinedId = params.id
    const [connectionId, contextId] = combinedId.split(":")

    if (!connectionId || !contextId) {
      return NextResponse.json({ error: "Invalid ID format. Expected [connectionId]:[contextId]" }, { status: 400 })
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

    // Get the context from the MCP server
    const context = await getContext(baseUrl, contextId, apiKey)

    return NextResponse.json(context)
  } catch (error) {
    console.error("MCP context retrieval error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
