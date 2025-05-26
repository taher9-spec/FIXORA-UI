import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url, anonKey, serviceRoleKey } = await request.json()

    if (!url || !anonKey) {
      return NextResponse.json({ error: "URL and anon key are required" }, { status: 400 })
    }

    // Validate URL format
    if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
      return NextResponse.json(
        {
          error: "Invalid Supabase URL format. Should be https://your-project.supabase.co",
        },
        { status: 400 },
      )
    }

    // Extract project reference from URL
    const urlParts = url.replace("https://", "").split(".")
    const projectRef = urlParts[0]

    // Test the connection
    const testResponse = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!testResponse.ok) {
      console.error("Supabase test failed:", testResponse.status, testResponse.statusText)
      return NextResponse.json(
        {
          error: `Failed to connect to Supabase: ${testResponse.status} ${testResponse.statusText}`,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      projectId: projectRef,
      projectRef: projectRef,
      url: url,
      status: "connected",
    })
  } catch (error) {
    console.error("Supabase discovery error:", error)
    return NextResponse.json(
      {
        error: `Discovery failed: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
