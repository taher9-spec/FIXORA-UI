import { NextResponse } from "next/server"
import { createConnection, validateConnectionCredentials } from "@/lib/connections-service"
import { encryptSecret } from "@/lib/utils/encryption"

export async function GET() {
  try {
    const { getAllConnections } = await import("@/lib/connections-service")
    const connections = await getAllConnections()

    // Remove sensitive data from the response
    const sanitizedConnections = connections.map((conn) => {
      const { credentials, ...rest } = conn
      return {
        ...rest,
        hasCredentials: !!credentials,
      }
    })

    return NextResponse.json({ connections: sanitizedConnections })
  } catch (error) {
    console.error("Error fetching connections:", error)
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    if (!data.type || !data.name) {
      return NextResponse.json({ error: "Type and name are required" }, { status: 400 })
    }

    // Validate credentials
    if (data.credentials) {
      const validationResult = await validateConnectionCredentials(data.type, data.credentials)

      if (!validationResult.valid) {
        return NextResponse.json({ error: validationResult.error }, { status: 400 })
      }

      // Encrypt sensitive credentials
      const encryptedCredentials: Record<string, any> = {}

      for (const [key, value] of Object.entries(data.credentials)) {
        if (typeof value === "string" && (key.includes("token") || key.includes("key") || key.includes("secret"))) {
          encryptedCredentials[key] = encryptSecret(value as string)
        } else {
          encryptedCredentials[key] = value
        }
      }

      data.credentials = encryptedCredentials
    }

    const connection = await createConnection({
      type: data.type,
      name: data.name,
      status: "active",
      credentials: data.credentials,
      metadata: data.metadata,
    })

    // Remove sensitive data from the response
    const { credentials, ...connectionWithoutCredentials } = connection

    return NextResponse.json(connectionWithoutCredentials)
  } catch (error) {
    console.error("Error creating connection:", error)
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 })
  }
}
