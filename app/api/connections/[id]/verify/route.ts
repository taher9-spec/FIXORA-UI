import { NextResponse } from "next/server"
import { getConnection } from "@/lib/db"
import {
  verifySupabaseConnection,
  verifyGitHubConnection,
  verifyGoogleConnection,
  verifyMCPConnection,
} from "@/lib/connections/verification"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log("Verifying connection:", id)

    const connection = await getConnection(id)
    if (!connection) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 })
    }

    console.log("Found connection of type:", connection.type)

    // Route to appropriate verification function
    switch (connection.type) {
      case "supabase":
        return await verifySupabaseConnection(connection)
      case "github":
        return await verifyGitHubConnection(connection)
      case "google":
        return await verifyGoogleConnection(connection)
      case "mcp":
        return await verifyMCPConnection(connection)
      default:
        return NextResponse.json(
          { success: false, error: `Verification not implemented for ${connection.type}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("Error in verification route:", error)
    return NextResponse.json({ success: false, error: `Verification failed: ${error.message}` }, { status: 500 })
  }
}
