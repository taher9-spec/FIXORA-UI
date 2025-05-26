"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import type { Database as DatabaseType } from "@/types/database"

interface ConnectionCardProps {
  database: DatabaseType
  onSelect: (database: DatabaseType) => void
  onDelete: (database: DatabaseType) => void
}

export function ConnectionCard({ database, onSelect, onDelete }: ConnectionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <Card className="mb-4 cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            {database.name}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(database)
            }}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent onClick={() => onSelect(database)}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(database.status)}>
              {getStatusIcon(database.status)}
              {database.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{database.type}</p>
          <p className="text-xs text-gray-500 truncate">{database.host}</p>
        </div>
      </CardContent>
    </Card>
  )
}
