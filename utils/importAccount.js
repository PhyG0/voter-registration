const { Web3 } = require('web3')
require('dotenv').config()

const web3 = new Web3(process.env.BUILDBEAR)

async function importAccount(privateKey) {
  // Add 0x prefix if not present
  const pk = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey

  // Import sender account
  const senderPk = '0x' + process.env.BUILDBEAR_PRIVATE_KEY
  const sender = web3.eth.accounts.privateKeyToAccount(senderPk)
  web3.eth.accounts.wallet.add(sender)

  // Import the recipient account
  const account = web3.eth.accounts.privateKeyToAccount(pk)

  // Check if account already exists and has a balance
  const balance = await web3.eth.getBalance(account.address)
  if (BigInt(balance) > BigInt(0)) {
    console.log(
      `Account ${account.address} already has a balance of ${web3.utils.fromWei(
        balance,
        'ether'
      )} ETH`
    )
    return null // Skip transaction if account already funded
  }

  console.log(`Importing Account Address: ${account.address}`)

  try {
    // Get latest nonce only - simplified nonce handling
    const nonce = await web3.eth.getTransactionCount(sender.address, 'latest')
    console.log(`Using nonce: ${nonce}`)

    const gasPrice = await web3.eth.getGasPrice()
    const adjustedGasPrice = (
      (BigInt(gasPrice) * BigInt(110)) /
      BigInt(100)
    ).toString()

    const tx = {
      from: sender.address,
      to: account.address,
      value: web3.utils.toWei('1', 'ether'),
      gas: 2000000,
      nonce: nonce,
      gasPrice: adjustedGasPrice,
    }

    console.log('Sending transaction...')

    const receipt = await web3.eth.sendTransaction(tx)
    console.log(`Transaction successful with hash: ${receipt.transactionHash}`)
    return receipt
  } catch (error) {
    // Check if error is actually a JSON parsing error but transaction might have gone through
    if (error.type === 'invalid-json') {
      // Wait a bit and check if the transaction actually went through
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const newBalance = await web3.eth.getBalance(account.address)

      if (BigInt(newBalance) > BigInt(0)) {
        console.log(
          `Transaction appears successful, account balance: ${web3.utils.fromWei(
            newBalance,
            'ether'
          )} ETH`
        )
        return null
      }
    }

    if (error.message.includes('NonceTooLow')) {
      throw new Error(
        `Nonce too low. Current nonce: ${await web3.eth.getTransactionCount(
          sender.address,
          'latest'
        )}`
      )
    }

    throw error
  }
}

async function sendWithRetry(privateKey, maxRetries = 3) {
  let retries = 0

  while (retries < maxRetries) {
    try {
      const result = await importAccount(privateKey)
      // If result is null, account already has balance - no need to retry
      if (result === null) {
        return
      }
      return result
    } catch (error) {
      retries++
      console.error(`Transaction attempt ${retries} failed:`, error.message)

      if (retries === maxRetries) {
        throw error
      }

      // Only wait and retry if it's a potentially recoverable error
      if (!error.message.includes('already has balance')) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }
}

module.exports = sendWithRetry
