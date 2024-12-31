const express = require('express');
const Rate = require('../Models/RateSchema');

const router = express.Router();

// Get Current Rate Thresholds
router.get('/rate', async (req, res) => {
  try {
    const rate = await Rate.findOne();

    if (!rate || !rate.thresholds || rate.thresholds.length === 0) {
      return res.status(404).json({ msg: 'Rate thresholds not set' });
    }

    res.json({ thresholds: rate.thresholds });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
