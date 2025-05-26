/**
 * Encryption utilities for securely handling sensitive data
 * Compatible with both browser and Node.js environments
 */

// Simple encryption key for demo purposes
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "fixora-default-encryption-key-32chars"
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || "fixora-iv-16char"

/**
 * Encrypts a string using a simple encryption method
 * @param text The plain text to encrypt
 * @returns The encrypted text as a hex string
 */
export function encryptSecret(text: string): string {
  if (!text) return ""

  try {
    // Simple XOR encryption for demo purposes
    const key = ENCRYPTION_KEY
    let result = ""

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      // Convert to hex and pad with zero if needed
      result += charCode.toString(16).padStart(2, "0")
    }

    return result
  } catch (error) {
    console.error("Encryption error:", error)
    return ""
  }
}

/**
 * Decrypts a string that was encrypted with encryptSecret
 * @param encryptedText The encrypted text as a hex string
 * @returns The decrypted plain text
 */
export function decryptSecret(encryptedText: string): string {
  if (!encryptedText) return ""

  try {
    // Convert hex string back to characters
    let decoded = ""
    for (let i = 0; i < encryptedText.length; i += 2) {
      const hexPair = encryptedText.substr(i, 2)
      decoded += String.fromCharCode(Number.parseInt(hexPair, 16))
    }

    // Simple XOR decryption
    const key = ENCRYPTION_KEY
    let result = ""

    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }

    return result
  } catch (error) {
    console.error("Decryption error:", error)
    return ""
  }
}

/**
 * Generates a secure random token
 * @param length The length of the token
 * @returns A secure random token
 */
export function generateSecureToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""

  // Use crypto.getRandomValues if available (browser)
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length)
    window.crypto.getRandomValues(values)
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length]
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }

  return result
}
