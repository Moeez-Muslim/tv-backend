const express = require('express');
const Rate = require('../Models/RateSchema');

const router = express.Router();

// Get Current TV-Time Hourly Rate
router.get('/rate', async (req, res) => {
  try {
    const rate = await Rate.findOne();
    
    if (!rate) {
      return res.status(404).json({ msg: 'Rate not set' });
    }

    res.json({ hourlyRate: rate.hourlyRate });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
