import { NextResponse } from "next/server"
import { validateMCPServer } from "@/lib/mcp/official-protocol"

export async function POST(request: Request) {
  try {
    const { baseUrl, apiKey } = await request.json()

    if (!baseUrl) {
      return NextResponse.json({ valid: false, error: "MCP server URL is required" }, { status: 400 })
    }

    // Validate the MCP server
    const validationResult = await validateMCPServer(baseUrl, apiKey || undefined)

    if (!validationResult.valid) {
      return NextResponse.json({ valid: false, error: validationResult.error }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
    })
  } catch (error) {
    console.error("MCP validation error:", error)
    return NextResponse.json({ valid: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
