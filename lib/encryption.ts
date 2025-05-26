// Simple encryption utilities
// In production, use proper encryption libraries

export function encryptSecret(text: string): string {
  if (!text) return text

  // Simple XOR encryption with hex encoding
  const key = process.env.ENCRYPTION_KEY || "default-key-12345"
  let encrypted = ""

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    encrypted += charCode.toString(16).padStart(2, "0")
  }

  return encrypted
}

export function decryptSecret(encrypted: string): string {
  if (!encrypted) return encrypted

  try {
    const key = process.env.ENCRYPTION_KEY || "default-key-12345"
    let decrypted = ""

    // Convert hex back to characters
    for (let i = 0; i < encrypted.length; i += 2) {
      const hexChar = encrypted.substr(i, 2)
      const charCode = Number.parseInt(hexChar, 16)
      const originalChar = charCode ^ key.charCodeAt((i / 2) % key.length)
      decrypted += String.fromCharCode(originalChar)
    }

    return decrypted
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt secret")
  }
}
