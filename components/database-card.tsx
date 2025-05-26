"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Server, Users, Clock } from "lucide-react"
import type { Database as DatabaseType } from "@/types/database"

interface DatabaseCardProps {
  database: DatabaseType
}

export function DatabaseCard({ database }: DatabaseCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          {database.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Type</span>
            </div>
            <Badge variant="outline">{database.type}</Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Status</span>
            </div>
            <Badge
              className={database.status === "connected" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
            >
              {database.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Host</span>
          </div>
          <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">{database.host}</p>
        </div>

        {database.database && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Database</span>
            </div>
            <p className="text-sm text-gray-600">{database.database}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Connected At</span>
          </div>
          <p className="text-sm text-gray-600">{new Date(database.createdAt).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}
