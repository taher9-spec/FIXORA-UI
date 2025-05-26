import { NextResponse } from "next/server"
import { supabaseConfig } from "@/lib/supabase/client"
import { createConnection } from "@/lib/db"
import { encryptSecret } from "@/lib/encryption"

export async function POST() {
  try {
    if (!supabaseConfig.isConfigured) {
      return NextResponse.json(
        {
          error: "Supabase not configured. Please check your environment variables.",
          missing: {
            url: !supabaseConfig.url,
            anonKey: !supabaseConfig.anonKey,
          },
        },
        { status: 400 },
      )
    }

    // Extract project reference from URL
    const projectRef = supabaseConfig.url.replace("https://", "").split(".")[0]

    // Create connection using environment variables
    const connection = await createConnection({
      type: "supabase",
      name: `Supabase (${projectRef})`,
      credentials: {
        url: supabaseConfig.url,
        anonKey: encryptSecret(supabaseConfig.anonKey),
        serviceRoleKey: supabaseConfig.serviceKey ? encryptSecret(supabaseConfig.serviceKey) : undefined,
        projectId: projectRef,
        projectRef: projectRef,
        source: "environment",
      },
      status: "active",
    })

    console.log("Auto-connected Supabase using environment variables:", connection.id)

    // Return connection without sensitive data
    const { credentials, ...safeConnection } = connection
    return NextResponse.json({
      ...safeConnection,
      hasCredentials: true,
      message: "Connected using environment variables",
    })
  } catch (error) {
    console.error("Auto-connect error:", error)
    return NextResponse.json({ error: `Auto-connect failed: ${error.message}` }, { status: 500 })
  }
}
