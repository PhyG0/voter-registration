const VoterKeyPair = require('../models/voterKeyPair')
const Encryption = require('../utils/encryption')
const generateEthereumKeys = require('./generateKeys')
const { Web3 } = require('web3')
const fs = require('fs')
const path = require('path')
const voters = require('../models/voterKeyPair')
require('dotenv').config()

// Connect to Ganache
const provider = new Web3.providers.HttpProvider(process.env.BUILDBEAR)
const web3 = new Web3(provider)
const importAccount = require('../utils/importAccount')

const encryption = new Encryption(process.env.ENCRYPTION_KEY)

// Load contract ABI and address from the JSON file
const contractJson = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../build/contracts/Voting.json'),
    'utf8'
  )
)

const contractABI = contractJson.abi
// Get the contract address for the network ID 5777 (Ganache's default network)
const contractAddress = contractJson.networks['21293'].address
console.log(contractAddress)
if (!contractAddress) {
  console.log('Contract not deployed on network 21293')
  process.exit(1)
}

// Initialize contract instance
const votingContract = new web3.eth.Contract(contractABI, contractAddress)

class VoterService {
  constructor(encryptionKey) {
    this.encryption = new Encryption(encryptionKey)
  }

  async registerVoter(voterData) {
    try {
      // Check for existing voter
      const existingVoter = await VoterKeyPair.findOne({
        $or: [{ nationalId: voterData.nationalId }, { email: voterData.email }],
      })

      if (existingVoter) {
        throw new Error(
          'Voter already registered with this National ID or Email'
        )
      }

      let keyData = generateEthereumKeys()
      const label = `voter_${voterData.email}_${Date.now()}`
      const encryptedData = this.encryption.encrypt(keyData.privateKey)

      const voterKeyPair = new VoterKeyPair({
        firstName: voterData.firstName,
        lastName: voterData.lastName,
        dateOfBirth: new Date(voterData.dateOfBirth),
        nationalId: voterData.nationalId,
        address: {
          street: voterData.street,
          city: voterData.city,
          state: voterData.state,
          zipCode: voterData.zipCode,
        },
        phoneNumber: voterData.phoneNumber,
        email: voterData.email,
        label,
        encryptedPrivateKey: encryptedData.encryptedData,
        iv: encryptedData.iv,
        publicKey: keyData.publicKey,
        ethereumAddress: keyData.address,
        password: voterData.password,
      })

      await voterKeyPair.save()

      return {
        success: true,
        message: 'Voter registered successfully',
        data: { label },
      }
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        throw new Error(`This ${field} is already registered`)
      }
      throw error
    }
  }

  async getVoterStatus(label) {
    const voter = await VoterKeyPair.findOne({ label }).select(
      'registrationStatus'
    )
    if (!voter) {
      throw new Error('Voter not found')
    }
    return voter.registrationStatus
  }

  async updateVoterStatus(voterId, status) {
    try {
      const voter = await VoterKeyPair.findByIdAndUpdate(
        voterId,
        { registrationStatus: status },
        { new: true }
      )

      if (!voter) {
        throw new Error('Voter not found')
      }

      return { success: true, voter }
    } catch (error) {
      throw new Error(`Failed to update voter status: ${error.message}`)
    }
  }

  async getPendingVoters() {
    return VoterKeyPair.find(
      {},
      {
        firstName: 1,
        lastName: 1,
        email: 1,
        nationalId: 1,
        registrationDate: 1,
        registrationStatus: 1,
      }
    ).sort({ registrationDate: -1 })
  }

  async addEligibleVoter(voterId) {
    const voter = await voters.findOne({ _id: voterId })

    const privateKey = encryption.decrypt(voter.encryptedPrivateKey, voter.iv)

    importAccount(privateKey)

    const address = voter.publicKey

    await votingContract.methods
      .addEligibleVoter(address)
      .send({ from: '0x16aa653B5411BA3C20B09a64737dd2B15747EDFA' })
    const isEligible = await votingContract.methods
      .eligibleVoters(address)
      .call()
    console.log('Is voter eligible?', isEligible)
  }
}

module.exports = VoterService
