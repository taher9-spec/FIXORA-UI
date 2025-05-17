import { NextResponse } from "next/server"
import { getModelsForProvider } from "@/lib/models/provider"

export async function GET(request: Request, { params }: { params: { provider: string } }) {
  try {
    const provider = params.provider

    if (!provider) {
      return NextResponse.json({ success: false, error: "Provider is required" }, { status: 400 })
    }

    const models = await getModelsForProvider(provider)

    return NextResponse.json({
      success: true,
      models,
    })
  } catch (error) {
    console.error("Models API error:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
