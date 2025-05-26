/**
 * GitHub OAuth Manager
 * Handles OAuth configuration, validation, and error recovery
 */

import { getOrigin } from "@/lib/utils/environment"

export interface GitHubOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface GitHubOAuthError {
  error: string
  errorDescription?: string
  errorUri?: string
}

export class GitHubOAuthManager {
  private static instance: GitHubOAuthManager
  private config: GitHubOAuthConfig | null = null

  static getInstance(): GitHubOAuthManager {
    if (!GitHubOAuthManager.instance) {
      GitHubOAuthManager.instance = new GitHubOAuthManager()
    }
    return GitHubOAuthManager.instance
  }

  /**
   * Initialize OAuth configuration with proper redirect URI
   */
  async initializeConfig(): Promise<GitHubOAuthConfig> {
    const origin = getOrigin()

    // For v0 environment, use the correct redirect URI
    const redirectUri = `${origin}/api/oauth/github/callback`

    // In production, these would come from environment variables
    // For demo/development, we'll create a mock configuration
    const clientId = process.env.GITHUB_CLIENT_ID || this.generateMockClientId()
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || this.generateMockClientSecret()

    this.config = {
      clientId,
      clientSecret,
      redirectUri,
      scopes: ["read:user", "user:email", "repo"],
    }

    return this.config
  }

  /**
   * Validate OAuth configuration
   */
  validateConfig(config: GitHubOAuthConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.clientId) {
      errors.push("GitHub Client ID is required")
    }

    if (!config.clientSecret) {
      errors.push("GitHub Client Secret is required")
    }

    if (!config.redirectUri) {
      errors.push("Redirect URI is required")
    } else {
      // Validate redirect URI format
      try {
        const url = new URL(config.redirectUri)
        if (!url.protocol.startsWith("http")) {
          errors.push("Redirect URI must use HTTP or HTTPS protocol")
        }
      } catch {
        errors.push("Invalid redirect URI format")
      }
    }

    if (!config.scopes || config.scopes.length === 0) {
      errors.push("At least one OAuth scope is required")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Create GitHub OAuth authorization URL
   */
  createAuthUrl(state: string): string {
    if (!this.config) {
      throw new Error("OAuth configuration not initialized")
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(" "),
      state,
      response_type: "code",
      allow_signup: "true",
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * Handle OAuth errors with user-friendly messages
   */
  handleOAuthError(error: any): { message: string; action: string; recoverable: boolean } {
    if (typeof error === "string") {
      if (error.includes("redirect_uri")) {
        return {
          message: "The redirect URL is not configured correctly in your GitHub OAuth app.",
          action: "Please check your GitHub OAuth app settings and ensure the redirect URI matches your domain.",
          recoverable: true,
        }
      }

      if (error.includes("client_id")) {
        return {
          message: "Invalid GitHub Client ID.",
          action: "Please check your GitHub OAuth app configuration.",
          recoverable: true,
        }
      }
    }

    return {
      message: "An unexpected error occurred during GitHub authentication.",
      action: "Please try again or contact support if the issue persists.",
      recoverable: true,
    }
  }

  private generateMockClientId(): string {
    return `Iv1.${Math.random().toString(36).substring(2, 22)}`
  }

  private generateMockClientSecret(): string {
    return `ghs_${Math.random().toString(36).substring(2, 42)}`
  }

  getConfig(): GitHubOAuthConfig | null {
    return this.config
  }
}
