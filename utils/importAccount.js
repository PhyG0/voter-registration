const { Web3 } = require('web3')
require('dotenv').config()

// Connect to Ganache
const web3 = new Web3(process.env.BUILDBEAR) // Adjust the URL if necessary

async function importAccount(privateKey) {
  // Import the account using the private key
  const account = web3.eth.accounts.privateKeyToAccount(privateKey)

  console.log(`Imported Account Address: ${account.address}`)

  const tx = {
    from: '0x16aa653B5411BA3C20B09a64737dd2B15747EDFA',
    to: account.address,
    value: web3.utils.toWei('1', 'ether'), // Send 1 Ether
    gas: 2000000,
  }

  const receipt = await web3.eth.sendTransaction(tx)
  console.log(`Transaction successful with hash: ${receipt.transactionHash}`)
}

module.exports = importAccount
