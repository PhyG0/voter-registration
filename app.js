const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const VoterService = require('./services/voterService')
const createVoterRoutes = require('./routes/voterRoutes')
const cors = require('cors')

dotenv.config()

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  cors({
    origins: ['http://localhost:5173', 'http://127.0.0.1:5174'],
  })
)

// Connect to MongoDB with proper options
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Initialize services
const voterService = new VoterService(process.env.ENCRYPTION_KEY)

//////////////////////////////////////////////////////////////////////////////

const { Web3 } = require('web3')
const fs = require('fs')
const path = require('path')
const HDWalletProvider = require('@truffle/hdwallet-provider')

// Middleware to verify admin access
const verifyAdmin = async (req, res, next) => {
  try {
    const accounts = await web3.eth.getAccounts()
    const contractOwner = await votingContract.methods.owner().call()

    if (accounts[0].toLowerCase() !== contractOwner.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized as admin' })
    }
    next()
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' })
  }
}

// Helper function to format BigInt values
const formatContractResponse = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (typeof item === 'object') {
        const formatted = {}
        for (const [key, value] of Object.entries(item)) {
          formatted[key] = typeof value === 'bigint' ? value.toString() : value
        }
        return formatted
      }
      return typeof item === 'bigint' ? item.toString() : item
    })
  }

  if (typeof data === 'object') {
    const formatted = {}
    for (const [key, value] of Object.entries(data)) {
      formatted[key] = typeof value === 'bigint' ? value.toString() : value
    }
    return formatted
  }

  return typeof data === 'bigint' ? data.toString() : data
}

// Contract setup
const provider = new HDWalletProvider(
  process.env.BUILDBEAR_PRIVATE_KEY,
  process.env.BUILDBEAR
)
const web3 = new Web3(provider)

const contractJson = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'build/contracts/Voting.json'),
    'utf8'
  )
)
const contractABI = contractJson.abi
const contractAddress = contractJson.networks['21293'].address
const votingContract = new web3.eth.Contract(contractABI, contractAddress)

// Admin Routes

// Get all candidates
app.get('/admin/candidates', async (req, res) => {
  try {
    const candidates = await votingContract.methods.getResults().call()
    const formattedCandidates = formatContractResponse(candidates)
    res.json(formattedCandidates)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Add new candidate
app.post('/admin/candidates', verifyAdmin, async (req, res) => {
  try {
    const { candidateName } = req.body
    const accounts = await web3.eth.getAccounts()

    await votingContract.methods
      .addCandidate(candidateName)
      .send({ from: accounts[0] })

    res.json({ message: 'Candidate added successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Remove candidate
app.post(
  '/admin/candidates/:candidateIndex/remove',
  verifyAdmin,
  async (req, res) => {
    try {
      const { candidateIndex } = req.params
      const accounts = await web3.eth.getAccounts()

      await votingContract.methods
        .removeCandidate(candidateIndex)
        .send({ from: accounts[0] })

      res.json({ message: 'Candidate removed successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// Reactivate candidate
app.post(
  '/admin/candidates/:candidateIndex/reactivate',
  verifyAdmin,
  async (req, res) => {
    try {
      const { candidateIndex } = req.params
      const accounts = await web3.eth.getAccounts()

      await votingContract.methods
        .reactivateCandidate(candidateIndex)
        .send({ from: accounts[0] })

      res.json({ message: 'Candidate reactivated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// Add eligible voter
app.post('/admin/voters', verifyAdmin, async (req, res) => {
  try {
    const { voterAddress } = req.body
    const accounts = await web3.eth.getAccounts()

    await votingContract.methods
      .addEligibleVoter(voterAddress)
      .send({ from: accounts[0] })

    res.json({ message: 'Voter added successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Remove eligible voter
app.post('/admin/voters/remove', verifyAdmin, async (req, res) => {
  try {
    const { voterAddress } = req.body
    const accounts = await web3.eth.getAccounts()

    await votingContract.methods
      .removeEligibleVoter(voterAddress)
      .send({ from: accounts[0] })

    res.json({ message: 'Voter removed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Check voter status
app.get('/admin/voters/:address', async (req, res) => {
  try {
    const { address } = req.params
    const hasVoted = await votingContract.methods.hasVotedStatus(address).call()
    const isEligible = await votingContract.methods
      .eligibleVoters(address)
      .call()

    let voterChoice = null
    if (hasVoted) {
      voterChoice = await votingContract.methods.getVoterChoice(address).call()
    }

    const formattedResponse = formatContractResponse({
      address,
      hasVoted,
      isEligible,
      voterChoice,
    })

    res.json(formattedResponse)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Start election
app.post('/admin/election/start', verifyAdmin, async (req, res) => {
  try {
    const accounts = await web3.eth.getAccounts()

    await votingContract.methods.startElection().send({ from: accounts[0] })

    res.json({ message: 'Election started successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// End election
app.post('/admin/election/end', verifyAdmin, async (req, res) => {
  try {
    const accounts = await web3.eth.getAccounts()

    await votingContract.methods.endElection().send({ from: accounts[0] })

    res.json({ message: 'Election ended successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get election status
app.get('/admin/election/status', async (req, res) => {
  try {
    const electionEnded = await votingContract.methods.electionEnded().call()
    res.json({ electionEnded })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/////////////////////////////////////////////////////////////////////////////

// Setup routes
app.use('/', createVoterRoutes(voterService))

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
