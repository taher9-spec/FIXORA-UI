/**
 * Configuration manager for storing and retrieving application settings
 */

import { encryptSecret } from "../utils/encryption"

// In-memory cache for config values
const configCache: Record<string, string> = {}

// Database simulation - in a real app, this would use a database
const configStore: Record<string, string> = {}

/**
 * Gets a configuration value by key
 * @param key The configuration key
 * @returns The configuration value or null if not found
 */
export async function getConfigValue(key: string): Promise<string | null> {
  // Check cache first
  if (configCache[key]) {
    return configCache[key]
  }

  try {
    // In a real implementation, this would fetch from a database
    // For now, we'll use our in-memory store
    const value = configStore[key] || null

    // Cache the result
    if (value) {
      configCache[key] = value
    }

    return value
  } catch (error) {
    console.error(`Error getting config value for key ${key}:`, error)
    return null
  }
}

/**
 * Sets a configuration value
 * @param key The configuration key
 * @param value The configuration value
 * @param encrypt Whether to encrypt the value (default: false)
 * @returns True if successful, false otherwise
 */
export async function setConfigValue(key: string, value: string, encrypt = false): Promise<boolean> {
  try {
    // Encrypt the value if requested
    const valueToStore = encrypt ? encryptSecret(value) : value

    // In a real implementation, this would store in a database
    configStore[key] = valueToStore

    // Update cache
    configCache[key] = valueToStore

    return true
  } catch (error) {
    console.error(`Error setting config value for key ${key}:`, error)
    return false
  }
}

/**
 * Deletes a configuration value
 * @param key The configuration key
 * @returns True if successful, false otherwise
 */
export async function deleteConfigValue(key: string): Promise<boolean> {
  try {
    // In a real implementation, this would delete from a database
    delete configStore[key]

    // Remove from cache
    delete configCache[key]

    return true
  } catch (error) {
    console.error(`Error deleting config value for key ${key}:`, error)
    return false
  }
}

/**
 * Gets all configuration values
 * @param includeEncrypted Whether to include encrypted values (default: false)
 * @returns An object containing all configuration values
 */
export async function getAllConfigValues(includeEncrypted = false): Promise<Record<string, string>> {
  try {
    // In a real implementation, this would fetch all values from a database
    const result: Record<string, string> = {}

    // Filter out encrypted values if requested
    Object.keys(configStore).forEach((key) => {
      if (includeEncrypted || !key.endsWith("_api_key")) {
        result[key] = configStore[key]
      }
    })

    return result
  } catch (error) {
    console.error("Error getting all config values:", error)
    return {}
  }
}

/**
 * Initializes the configuration manager with default values
 */
export async function initializeConfig(): Promise<void> {
  // Set default values if they don't exist
  const defaults: Record<string, string> = {
    app_name: "Fixora UI",
    app_version: "1.0.0",
    ai_provider: "openroute",
    openroute_api_key: encryptSecret("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"),
    openroute_model_id: "openai/gpt-4o",
  }

  for (const [key, value] of Object.entries(defaults)) {
    if (!(await getConfigValue(key))) {
      await setConfigValue(key, value)
    }
  }
}

// Initialize the config when this module is imported
initializeConfig()
