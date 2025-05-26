import { encryptSecret, decryptSecret } from "@/lib/utils/encryption"
import type { GitHubTokenResponse, GitHubUserInfo } from "./oauth-config"

interface StoredGitHubTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: string
  scope: string
  tokenType: string
  encryptedAt: string
}

// In-memory token store (in production, use database)
const tokenStore: Record<string, StoredGitHubTokens> = {}

export async function storeGitHubTokens(connectionId: string, tokens: GitHubTokenResponse): Promise<void> {
  try {
    const encryptedTokens: StoredGitHubTokens = {
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined,
      expiresAt: tokens.expiresAt.toISOString(),
      scope: tokens.scope,
      tokenType: tokens.tokenType,
      encryptedAt: new Date().toISOString(),
    }

    tokenStore[connectionId] = encryptedTokens
  } catch (error) {
    console.error("Failed to store GitHub tokens:", error)
    throw new Error("Failed to securely store GitHub tokens")
  }
}

export async function getGitHubTokens(connectionId: string): Promise<GitHubTokenResponse | null> {
  try {
    const stored = tokenStore[connectionId]
    if (!stored) {
      return null
    }

    const tokens: GitHubTokenResponse = {
      accessToken: decryptSecret(stored.accessToken),
      refreshToken: stored.refreshToken ? decryptSecret(stored.refreshToken) : undefined,
      expiresAt: new Date(stored.expiresAt),
      scope: stored.scope,
      tokenType: stored.tokenType,
    }

    // Check if token is expired
    if (tokens.expiresAt < new Date()) {
      // Token is expired, attempt refresh if refresh token exists
      if (tokens.refreshToken) {
        return await refreshGitHubToken(connectionId, tokens.refreshToken)
      }
      return null
    }

    return tokens
  } catch (error) {
    console.error("Failed to retrieve GitHub tokens:", error)
    return null
  }
}

export async function refreshGitHubToken(
  connectionId: string,
  refreshToken: string,
): Promise<GitHubTokenResponse | null> {
  try {
    // In a real implementation, this would call GitHub's token refresh endpoint
    // For demo purposes, we'll generate new mock tokens
    const newTokens: GitHubTokenResponse = {
      accessToken: `gho_${generateMockToken(40)}`,
      refreshToken: `ghr_${generateMockToken(40)}`,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      scope: "read:user user:email repo",
      tokenType: "bearer",
    }

    await storeGitHubTokens(connectionId, newTokens)
    return newTokens
  } catch (error) {
    console.error("Failed to refresh GitHub token:", error)
    return null
  }
}

export async function validateGitHubToken(accessToken: string): Promise<GitHubUserInfo | null> {
  try {
    // In a real implementation, this would call GitHub's user API
    // For demo purposes, we'll return mock user data
    const mockUser: GitHubUserInfo = {
      id: Math.floor(Math.random() * 1000000),
      login: "demo-user",
      name: "Demo User",
      email: "demo@example.com",
      avatarUrl: "https://github.com/github.png",
      bio: "Demo GitHub user for Fixora UI",
      company: "Fixora",
      location: "San Francisco, CA",
      publicRepos: 42,
      followers: 123,
      following: 87,
      createdAt: "2020-01-01T00:00:00Z",
    }

    return mockUser
  } catch (error) {
    console.error("Failed to validate GitHub token:", error)
    return null
  }
}

export async function revokeGitHubTokens(connectionId: string): Promise<boolean> {
  try {
    const tokens = await getGitHubTokens(connectionId)
    if (!tokens) {
      return true // Already revoked or doesn't exist
    }

    // In a real implementation, this would call GitHub's token revocation endpoint
    // For demo purposes, we'll just remove from our store
    delete tokenStore[connectionId]

    return true
  } catch (error) {
    console.error("Failed to revoke GitHub tokens:", error)
    return false
  }
}

function generateMockToken(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
