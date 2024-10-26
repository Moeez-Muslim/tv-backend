const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timeBought: { type: Number, required: true },  // Time in hours
  totalCost: { type: Number, required: true },
  roomNumber: { type: [Number], required: true },  // Array of room numbers
  tvNumber: { type: [Number], required: true },  // Array of TV numbers
  orderDate: { type: Date, default: Date.now },
  OTP: { type: Number, required: true },
});

module.exports = mongoose.model('Order', orderSchema);
