import { NextResponse } from "next/server"
import { supabaseConfig, supabase, supabaseAdmin } from "@/lib/supabase/client"
import { postgresConfig, testDatabaseConnection } from "@/lib/database/postgres"

export async function GET() {
  try {
    const status = {
      supabase: {
        configured: supabaseConfig.isConfigured,
        url: supabaseConfig.url,
        hasAnonKey: !!supabaseConfig.anonKey,
        hasServiceKey: !!supabaseConfig.serviceKey,
        clientReady: !!supabase,
        adminReady: !!supabaseAdmin,
      },
      postgres: {
        configured: postgresConfig.isConfigured,
        host: postgresConfig.host,
        database: postgresConfig.database,
        user: postgresConfig.user,
      },
    }

    // Test Supabase connection if configured
    if (supabase) {
      try {
        const { data, error } = await supabase.from("_supabase_migrations").select("*").limit(1)
        status.supabase.connectionTest = error ? "failed" : "success"
        status.supabase.error = error?.message
      } catch (error) {
        status.supabase.connectionTest = "failed"
        status.supabase.error = error.message
      }
    }

    // Test Postgres connection if configured
    if (postgresConfig.isConfigured) {
      try {
        await testDatabaseConnection()
        status.postgres.connectionTest = "success"
      } catch (error) {
        status.postgres.connectionTest = "failed"
        status.postgres.error = error.message
      }
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
