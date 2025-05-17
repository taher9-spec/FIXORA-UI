/**
 * Types for connections
 */

export type ConnectionType = "github" | "google" | "supabase" | "mcp" | "custom"

export interface Connection {
  id: string
  type: ConnectionType
  name: string
  status: "active" | "inactive" | "error"
  credentials?: Record<string, any>
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface ConnectionResult {
  success: boolean
  connectionId?: string
  error?: string
  data?: any
}

export interface GitHubCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
}

export interface GoogleCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
}

export interface SupabaseCredentials {
  url: string
  anonKey: string
  serviceRoleKey: string
  projectId?: string
  projectRef?: string
}

export interface MCPCredentials {
  baseUrl: string
  apiKey?: string
}

export interface CustomCredentials {
  [key: string]: any
}

export type ConnectionCredentials =
  | GitHubCredentials
  | GoogleCredentials
  | SupabaseCredentials
  | MCPCredentials
  | CustomCredentials
