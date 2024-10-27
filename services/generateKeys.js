const ethers = require('ethers')
const crypto = require('crypto')

function generateEthereumKeys() {
  // Generate random private key
  const privateKeyBytes = crypto.randomBytes(32)
  const privateKeyHex = `0x${privateKeyBytes.toString('hex')}`

  // Create wallet instance
  const wallet = new ethers.Wallet(privateKeyHex)

  // Get public address
  const address = wallet.address

  return {
    privateKey: privateKeyHex,
    publicKey: address,
    address: address,
  }
}

// Direct usage example
const keys = generateEthereumKeys()
console.log(keys)

module.exports = generateEthereumKeys
