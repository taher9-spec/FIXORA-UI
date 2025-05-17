import { NextResponse } from "next/server"
import {
  verifyGitHubConnection,
  verifyGoogleConnection,
  verifySupabaseConnection,
  verifyMCPConnection,
} from "@/lib/connections/verification"
import { getConnectionById } from "@/lib/connections-service"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const connectionId = params.id
    const connection = await getConnectionById(connectionId)

    if (!connection) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 })
    }

    // Verify the connection based on its type
    switch (connection.type) {
      case "github":
        return await verifyGitHubConnection(connection)
      case "google":
        return await verifyGoogleConnection(connection)
      case "supabase":
        return await verifySupabaseConnection(connection)
      case "mcp":
        return await verifyMCPConnection(connection)
      default:
        return NextResponse.json(
          { success: false, error: `Verification not implemented for ${connection.type}` },
          { status: 501 },
        )
    }
  } catch (error) {
    console.error("Connection verification error:", error)
    return NextResponse.json({ success: false, error: `Verification failed: ${error.message}` }, { status: 500 })
  }
}
