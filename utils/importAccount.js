const { Web3 } = require('web3')
require('dotenv').config()

// Connect to Ganache
const web3 = new Web3(process.env.BUILDBEAR) // Adjust the URL if necessary

async function importAccount(privateKey) {
  // Import the account using the private key
  const account = web3.eth.accounts.privateKeyToAccount(privateKey)

  console.log(`Imported Account Address: ${account.address}`)

  // Optionally, you can send some Ether to this account from another account
  const accounts = await web3.eth.getAccounts()
  const sender = accounts[0] // Use the first account as the sender

  const tx = {
    from: sender,
    to: account.address,
    value: web3.utils.toWei('1', 'ether'), // Send 1 Ether
    gas: 2000000,
  }

  const receipt = await web3.eth.sendTransaction(tx)
  console.log(`Transaction successful with hash: ${receipt.transactionHash}`)
}

module.exports = importAccount
