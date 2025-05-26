export interface Database {
  id: string
  name: string
  type: "supabase" | "postgres" | "mysql" | "mongodb"
  host: string
  port?: number
  database?: string
  username?: string
  status: "connected" | "disconnected" | "error" | "connecting"
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

export interface ConnectionConfig {
  host: string
  port?: number
  database?: string
  username?: string
  password?: string
  ssl?: boolean
  connectionString?: string
}

export interface SupabaseConfig extends ConnectionConfig {
  projectUrl: string
  anonKey: string
  serviceRoleKey?: string
  jwtSecret?: string
}
