const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  thresholds: [
    {
      days: { type: Number, required: true }, // Number of days for the threshold
      price: { type: Number, required: true }, // Price for the threshold
    },
  ],
});

// Method to get the price based on the number of days selected
rateSchema.methods.getPrice = function (daysSelected) {
  // Sort thresholds by days ascending to ensure correct comparisons
  const sortedThresholds = this.thresholds.sort((a, b) => a.days - b.days);

  // Find the threshold that applies
  for (const threshold of sortedThresholds) {
    if (daysSelected <= threshold.days) {
      return threshold.price;
    }
  }

  // If no threshold matches, return the highest price
  return sortedThresholds[sortedThresholds.length - 1].price;
};

module.exports = mongoose.model('Rate', rateSchema);