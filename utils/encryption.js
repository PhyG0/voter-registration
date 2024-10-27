const crypto = require('crypto')

class Encryption {
  constructor(encryptionKey) {
    this.encryptionKey = encryptionKey
    this.ivLength = 16
    this.algorithm = 'aes-256-cbc'
  }

  encrypt(text) {
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    )
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted.toString('hex'),
    }
  }

  decrypt(encryptedHex, ivHex) {
    const iv = Buffer.from(ivHex, 'hex')
    const encryptedText = Buffer.from(encryptedHex, 'hex')
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    )
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }
}

module.exports = Encryption
