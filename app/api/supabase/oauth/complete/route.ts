import { NextResponse } from "next/server"
import { createConnection } from "@/lib/connections-service"
import { encryptSecret } from "@/lib/utils/encryption"

// In-memory store for OAuth state (in a real app, this would be in a database)
const oauthStateStore: Record<string, { createdAt: number }> = {}

export async function POST(request: Request) {
  try {
    const { code, state } = await request.json()

    if (!code || !state) {
      return NextResponse.json({ error: "Code and state are required" }, { status: 400 })
    }

    // Verify the state token to prevent CSRF
    if (!oauthStateStore[state]) {
      return NextResponse.json({ error: "Invalid or expired state token" }, { status: 400 })
    }

    // Clean up the used state token
    delete oauthStateStore[state]

    // In a real implementation, this would exchange the code for tokens
    // For this demo, we'll simulate a successful OAuth flow with mock data
    const mockSupabaseData = {
      url: "https://example.supabase.co",
      anonKey: encryptSecret("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key"),
      serviceRoleKey: encryptSecret("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-service-role-key"),
      projectId: "mock-project-id",
      projectRef: "example",
    }

    // Create the Supabase connection
    const connection = await createConnection({
      type: "supabase",
      name: "Supabase",
      status: "active",
      credentials: mockSupabaseData,
      metadata: {
        oauthConnected: true,
        connectedAt: new Date().toISOString(),
      },
    })

    // Remove sensitive data from the response
    const { credentials, ...connectionWithoutCredentials } = connection

    return NextResponse.json(connectionWithoutCredentials)
  } catch (error) {
    console.error("Supabase OAuth complete error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
