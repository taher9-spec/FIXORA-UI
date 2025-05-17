/**
 * Encryption utilities for securely handling sensitive data
 */

// For encryption/decryption
import crypto from "crypto"

// Environment variable for encryption key (should be set in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "fixora-default-encryption-key-32chars"
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || "fixora-iv-16char"

/**
 * Encrypts a string using AES-256-CBC
 * @param text The plain text to encrypt
 * @returns The encrypted text as a base64 string
 */
export function encryptSecret(text: string): string {
  if (!text) return ""

  try {
    // Create a buffer from the encryption key and IV
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
    const iv = Buffer.alloc(16, ENCRYPTION_IV)

    // Create cipher and encrypt
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
    let encrypted = cipher.update(text, "utf8", "base64")
    encrypted += cipher.final("base64")

    return encrypted
  } catch (error) {
    console.error("Encryption error:", error)
    return ""
  }
}

/**
 * Decrypts a string that was encrypted with encryptSecret
 * @param encryptedText The encrypted text as a base64 string
 * @returns The decrypted plain text
 */
export function decryptSecret(encryptedText: string): string {
  if (!encryptedText) return ""

  try {
    // Create a buffer from the encryption key and IV
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
    const iv = Buffer.alloc(16, ENCRYPTION_IV)

    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
    let decrypted = decipher.update(encryptedText, "base64", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
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
  return crypto.randomBytes(length).toString("hex")
}
