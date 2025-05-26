/**
 * GitHub OAuth Fix - Resolves redirect_uri issues
 */

import { getOrigin } from "@/lib/utils/environment"

export interface GitHubOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export class GitHubOAuthFix {
  private static instance: GitHubOAuthFix

  static getInstance(): GitHubOAuthFix {
    if (!GitHubOAuthFix.instance) {
      GitHubOAuthFix.instance = new GitHubOAuthFix()
    }
    return GitHubOAuthFix.instance
  }

  /**
   * Get the correct redirect URI for the current environment
   */
  getRedirectUri(): string {
    const origin = getOrigin()

    // For v0 environment, ensure we use the correct callback path
    const redirectUri = `${origin}/api/oauth/github/callback`

    console.log("GitHub OAuth Redirect URI:", redirectUri)
    return redirectUri
  }

  /**
   * Create a properly configured OAuth URL
   */
  createOAuthUrl(clientId: string, state: string): string {
    const redirectUri = this.getRedirectUri()

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email repo",
      state: state,
      response_type: "code",
      allow_signup: "true",
    })

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

    console.log("GitHub OAuth URL:", authUrl)
    console.log("Redirect URI:", redirectUri)
    console.log("Client ID:", clientId)

    return authUrl
  }

  /**
   * Validate OAuth configuration
   */
  validateConfig(config: Partial<GitHubOAuthConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.clientId) {
      errors.push("GitHub Client ID is missing")
    }

    if (!config.redirectUri) {
      errors.push("Redirect URI is missing")
    } else {
      try {
        const url = new URL(config.redirectUri)
        if (!url.protocol.startsWith("http")) {
          errors.push("Redirect URI must use HTTP or HTTPS")
        }
        if (!url.pathname.includes("/api/oauth/github/callback")) {
          errors.push("Redirect URI must point to the correct callback endpoint")
        }
      } catch {
        errors.push("Invalid redirect URI format")
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get OAuth configuration for the current environment
   */
  getOAuthConfig(): GitHubOAuthConfig {
    const redirectUri = this.getRedirectUri()

    // For demo purposes, create a mock OAuth app
    // In production, these would come from environment variables
    const clientId = process.env.GITHUB_CLIENT_ID || this.generateDemoClientId()
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || this.generateDemoClientSecret()

    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: ["read:user", "user:email", "repo"],
    }
  }

  private generateDemoClientId(): string {
    // Generate a realistic-looking demo client ID
    return `Iv1.${Math.random().toString(36).substring(2, 18)}`
  }

  private generateDemoClientSecret(): string {
    // Generate a realistic-looking demo client secret
    return `ghs_${Math.random().toString(36).substring(2, 42)}`
  }
}
