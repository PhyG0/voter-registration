// models/voterKeyPair.js
const mongoose = require('mongoose')

const VoterKeyPairSchema = new mongoose.Schema({
  // Voter Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  nationalId: {
    type: String,
    required: true,
    index: true,
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },

  // Key Pair Information
  label: {
    type: String,
    required: true,
    index: true,
  },
  encryptedPrivateKey: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
  publicKey: {
    type: String,
    required: true,
  },
  ethereumAddress: {
    type: String,
    required: true,
    index: true,
  },

  registrationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
})

// Create compound indexes for unique constraints
VoterKeyPairSchema.index({ nationalId: 1 }, { unique: true })
VoterKeyPairSchema.index({ email: 1 }, { unique: true })
VoterKeyPairSchema.index({ label: 1 }, { unique: true })
VoterKeyPairSchema.index({ ethereumAddress: 1 }, { unique: true })

const VoterKeyPair = mongoose.model('VoterKeyPair', VoterKeyPairSchema)

module.exports = VoterKeyPair
