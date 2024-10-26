const mongoose = require('mongoose');

// Define the TV schema
const tvSchema = new mongoose.Schema({
  tvNumber: {
    type: Number,
    required: true,
  },
  state: {
    type: String,
    enum: ['on', 'off'],
    default: 'off',  // Default state is 'off'
  },
});

// Define the Room schema
const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: true,
    unique: true,  // Ensure room numbers are unique
  },
  tvs: [tvSchema],  // Array of TV objects
});

// Create the Room model
const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
