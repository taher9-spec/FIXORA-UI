import { neon } from "@neondatabase/serverless"

// Get database configuration from environment variables
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
const postgresConfig = {
  url: databaseUrl,
  host: process.env.POSTGRES_HOST || process.env.PGHOST,
  user: process.env.POSTGRES_USER || process.env.PGUSER,
  password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD,
  database: process.env.POSTGRES_DATABASE || process.env.PGDATABASE,
  isConfigured: !!databaseUrl,
}

// Create SQL client if database is configured
export const sql = databaseUrl ? neon(databaseUrl) : null

// Test database connection
export async function testDatabaseConnection() {
  if (!sql) {
    throw new Error("Database not configured")
  }

  try {
    const result = await sql`SELECT 1 as test`
    return { success: true, result }
  } catch (error) {
    console.error("Database connection test failed:", error)
    throw error
  }
}

export { postgresConfig }
