import { NextResponse } from "next/server"
import { createConnection, getAllConnections } from "@/lib/db"
import { encryptSecret } from "@/lib/encryption"

export async function GET() {
  try {
    const connections = await getAllConnections()

    // Remove sensitive data from response
    const sanitizedConnections = connections.map((conn) => ({
      ...conn,
      credentials: undefined, // Don't send credentials in list
      hasCredentials: !!conn.credentials,
    }))

    return NextResponse.json({ connections: sanitizedConnections })
  } catch (error) {
    console.error("Error fetching connections:", error)
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Creating connection with data:", { ...body, credentials: "***" })

    const { type, name, credentials } = body

    if (!type || !name || !credentials) {
      return NextResponse.json({ error: "Missing required fields: type, name, and credentials" }, { status: 400 })
    }

    // Validate Supabase credentials specifically
    if (type === "supabase") {
      if (!credentials.url || !credentials.anonKey) {
        return NextResponse.json(
          {
            error: "Supabase connections require url and anonKey",
          },
          { status: 400 },
        )
      }

      // Validate URL format
      if (!credentials.url.startsWith("https://") || !credentials.url.includes(".supabase.co")) {
        return NextResponse.json(
          {
            error: "Invalid Supabase URL format. Should be https://your-project.supabase.co",
          },
          { status: 400 },
        )
      }
    }

    // Encrypt sensitive credentials
    const encryptedCredentials: Record<string, any> = {}

    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === "string" && (key.includes("key") || key.includes("token") || key.includes("secret"))) {
        encryptedCredentials[key] = encryptSecret(value)
      } else {
        encryptedCredentials[key] = value
      }
    }

    console.log("Creating connection with encrypted credentials")
    const connection = await createConnection({
      type,
      name,
      credentials: encryptedCredentials,
      status: "active",
    })

    console.log("Connection created successfully:", connection.id)

    // Return connection without sensitive data
    const { credentials: _, ...safeConnection } = connection
    return NextResponse.json({ ...safeConnection, hasCredentials: true })
  } catch (error) {
    console.error("Error creating connection:", error)
    return NextResponse.json({ error: `Failed to create connection: ${error.message}` }, { status: 500 })
  }
}
