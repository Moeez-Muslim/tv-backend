const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String},
  password: { type: String, required: false },
  isAdmin: { type: Boolean, default: false },  
});

module.exports = mongoose.model('User', userSchema);
