"use client"

// Persistent storage for API keys and configuration
class PersistentStorage {
  private static instance: PersistentStorage
  private storage: Storage | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.storage = window.localStorage
    }
  }

  static getInstance(): PersistentStorage {
    if (!PersistentStorage.instance) {
      PersistentStorage.instance = new PersistentStorage()
    }
    return PersistentStorage.instance
  }

  // API Keys
  saveApiKey(provider: string, apiKey: string): void {
    if (!this.storage) return
    const keys = this.getApiKeys()
    keys[provider] = apiKey
    this.storage.setItem("fixora_api_keys", JSON.stringify(keys))
  }

  getApiKeys(): Record<string, string> {
    if (!this.storage) return {}
    try {
      const keys = this.storage.getItem("fixora_api_keys")
      return keys ? JSON.parse(keys) : {}
    } catch {
      return {}
    }
  }

  getApiKey(provider: string): string | null {
    const keys = this.getApiKeys()
    return keys[provider] || null
  }

  removeApiKey(provider: string): void {
    if (!this.storage) return
    const keys = this.getApiKeys()
    delete keys[provider]
    this.storage.setItem("fixora_api_keys", JSON.stringify(keys))
  }

  // Validation Status
  saveValidationStatus(provider: string, isValid: boolean): void {
    if (!this.storage) return
    const status = this.getValidationStatus()
    status[provider] = isValid
    this.storage.setItem("fixora_validation_status", JSON.stringify(status))
  }

  getValidationStatus(): Record<string, boolean> {
    if (!this.storage) return {}
    try {
      const status = this.storage.getItem("fixora_validation_status")
      return status ? JSON.parse(status) : {}
    } catch {
      return {}
    }
  }

  // Selected Model
  saveSelectedModel(model: any): void {
    if (!this.storage) return
    this.storage.setItem("fixora_selected_model", JSON.stringify(model))
  }

  getSelectedModel(): any | null {
    if (!this.storage) return null
    try {
      const model = this.storage.getItem("fixora_selected_model")
      return model ? JSON.parse(model) : null
    } catch {
      return null
    }
  }

  // Clear all data
  clearAll(): void {
    if (!this.storage) return
    this.storage.removeItem("fixora_api_keys")
    this.storage.removeItem("fixora_validation_status")
    this.storage.removeItem("fixora_selected_model")
  }
}

export const persistentStorage = PersistentStorage.getInstance()
