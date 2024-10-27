const express = require('express')
const router = express.Router()
const Encryption = require('../utils/encryption')
require('dotenv').config()

const encryption = new Encryption(process.env.ENCRYPTION_KEY)
const VoterKeyPair = require('../models/voterKeyPair')

function createVoterRoutes(voterService) {
  router.post('/register', async (req, res) => {
    try {
      const result = await voterService.registerVoter(req.body)
      res.json(result)
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  })

  router.post('/signin', async (req, res) => {
    try {
      const nationalId = req.body.voterId
      const password = req.body.password
      const voter = await VoterKeyPair.findOne({ nationalId })

      if (!voter) {
        return res
          .status(404)
          .json({ success: false, error: 'Voter not found' })
      }

      // Compare the provided password with stored password in the database
      if (password === voter.password) {
        // Return voter data without sensitive information
        return res.json({
          success: true,
          voter: {
            status: voter.registrationStatus,
            firstName: voter.firstName,
            lastName: voter.lastName,
            email: voter.email,
            registrationDate: voter.registrationDate,
            ethereumAddress: voter.ethereumAddress,
            label: voter.label,
          },
        })
      } else {
        return res
          .status(401)
          .json({ success: false, error: 'Invalid password' })
      }
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  })

  router.get('/api/status/:label', async (req, res) => {
    try {
      const voter = await VoterKeyPair.findOne({ label: req.params.label })

      if (!voter) {
        return res.status(404).json({
          error: 'Not found',
          message: 'No voter found with the provided label',
        })
      }

      // Return voter data without sensitive information
      return res.json({
        status: voter.registrationStatus,
        firstName: voter.firstName,
        lastName: voter.lastName,
        email: voter.email,
        registrationDate: voter.registrationDate,
        ethereumAddress: voter.ethereumAddress,
        label: voter.label,
      })
    } catch (error) {
      return res.status(500).json({
        error: 'Server error',
        message: error.message,
      })
    }
  })

  // Add this new route to verify password
  router.post('/verify-password', async (req, res) => {
    try {
      const { label, password } = req.body
      const voter = await VoterKeyPair.findOne({ label: label })

      if (!voter) {
        return res.json({ success: false })
      }

      // Compare the provided password with stored password
      // Assuming you're storing hashed passwords, you should use bcrypt.compare
      // For this example, I'm showing direct comparison
      if (voter.password === password) {
        return res.json({
          success: true,
          privateKey: encryption.decrypt(voter.encryptedPrivateKey, voter.iv),
        })
      }

      res.json({ success: false })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  router.get('/admin/voters', async (req, res) => {
    try {
      const voters = await voterService.getPendingVoters()
      res.json({ success: true, data: voters })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  // Add this new route for handling status updates
  router.post('/admin/voters/update-status', async (req, res) => {
    try {
      const { voterId, status } = req.body
      const result = await voterService.updateVoterStatus(voterId, status)
      console.log(status)
      if (status == 'approved') {
        const result = await voterService.addEligibleVoter(voterId)
      }
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  return router
}

module.exports = createVoterRoutes
