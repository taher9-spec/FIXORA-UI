export interface GitHubOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string[]
}

export interface GitHubTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope: string
  tokenType: string
}

export interface GitHubUserInfo {
  id: number
  login: string
  name: string | null
  email: string | null
  avatarUrl: string
  bio: string | null
  company: string | null
  location: string | null
  publicRepos: number
  followers: number
  following: number
  createdAt: string
}

export const DEFAULT_GITHUB_SCOPES = ["read:user", "user:email", "repo"] as const

export function createGitHubOAuthUrl(config: GitHubOAuthConfig, state: string): string {
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("scope", config.scope.join(" "))
  url.searchParams.set("state", state)
  url.searchParams.set("allow_signup", "true")

  return url.toString()
}

export function validateGitHubOAuthConfig(config: Partial<GitHubOAuthConfig>): GitHubOAuthConfig {
  if (!config.clientId) {
    throw new Error("GitHub client ID is required")
  }

  if (!config.clientSecret) {
    throw new Error("GitHub client secret is required")
  }

  if (!config.redirectUri) {
    throw new Error("GitHub redirect URI is required")
  }

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    scope: config.scope || [...DEFAULT_GITHUB_SCOPES],
  }
}
