/**
 * Environment utilities
 */

/**
 * Gets the current origin (protocol + hostname + port)
 * @returns The current origin or a default value if not in a browser
 */
export function getOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Default for server-side rendering
  const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Ensure the URL has a protocol
  if (host.startsWith("http")) {
    return host
  }

  // Add https:// for Vercel deployments, http:// for localhost
  return host.includes("localhost") ? `http://${host}` : `https://${host}`
}

/**
 * Determines if the current environment is development
 * @returns True if in development, false otherwise
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development"
}

/**
 * Determines if the current environment is production
 * @returns True if in production, false otherwise
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * Gets the base API URL
 * @returns The base API URL
 */
export function getApiBaseUrl(): string {
  return `${getOrigin()}/api`
}

/**
 * Gets the current environment name
 * @returns The environment name
 */
export function getEnvironmentName(): string {
  if (isDevelopment()) {
    return "development"
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview"
  }

  return "production"
}
