const mongoose = require('mongoose');

// Define the TV schema
const tvSchema = new mongoose.Schema({
  tvNumber: {
    type: String,
    required: true,
    length: 4, // Ensure that tvNumber is always 4 digits
    match: /^[0-9]{4}$/, // Regular expression to ensure tvNumber is exactly 4 digits
  },
  state: {
    type: String,
    enum: ['on', 'off'],
    default: 'off',  // Default state is 'off'
  },
});

// Create the TV model
const Tv = mongoose.model('Tv', tvSchema);

module.exports = Tv;
