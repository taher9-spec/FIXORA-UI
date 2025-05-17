import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url, anonKey, serviceRoleKey } = await request.json()

    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Missing required Supabase credentials" }, { status: 400 })
    }

    // Validate URL format
    if (!url.startsWith("https://")) {
      return NextResponse.json({ success: false, error: "Supabase URL must start with https://" }, { status: 400 })
    }

    // Extract project reference from URL
    // Format: https://[project-ref].supabase.co
    const urlParts = url.replace("https://", "").split(".")
    const projectRef = urlParts[0]

    // Test the connection by fetching the Supabase service status
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ success: false, error: "Failed to connect to Supabase" }, { status: 400 })
    }

    // Generate a project ID (this would normally come from Supabase, but we'll create one)
    const projectId = `supabase_${projectRef}_${Date.now()}`

    return NextResponse.json({
      success: true,
      projectRef,
      projectId,
      url,
    })
  } catch (error) {
    console.error("Supabase discovery error:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
