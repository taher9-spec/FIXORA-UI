// Simple in-memory database for connections
// In production, this would be replaced with a real database

interface Connection {
  id: string
  type: string
  name: string
  credentials: Record<string, any>
  status: string
  createdAt: Date
  updatedAt: Date
}

// In-memory storage
const connections: Map<string, Connection> = new Map()

export async function createConnection(data: {
  type: string
  name: string
  credentials: Record<string, any>
  status: string
}): Promise<Connection> {
  const id = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const now = new Date()

  const connection: Connection = {
    id,
    type: data.type,
    name: data.name,
    credentials: data.credentials,
    status: data.status,
    createdAt: now,
    updatedAt: now,
  }

  connections.set(id, connection)
  console.log(`Created connection ${id} of type ${data.type}`)
  return connection
}

export async function getConnection(id: string): Promise<Connection | null> {
  return connections.get(id) || null
}

export async function getAllConnections(): Promise<Connection[]> {
  return Array.from(connections.values())
}

export async function updateConnection(id: string, updates: Partial<Connection>): Promise<Connection | null> {
  const existing = connections.get(id)
  if (!existing) return null

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  }

  connections.set(id, updated)
  return updated
}

export async function deleteConnection(id: string): Promise<boolean> {
  return connections.delete(id)
}
