const express = require('express');
const Rate = require('../Models/RateSchema');

const router = express.Router();

// Set or Update the TV-Time Rate
router.post('/rate', async (req, res) => {
  const { hourlyRate } = req.body;

  try {
    let rate = await Rate.findOne();
    if (rate) {
      rate.hourlyRate = hourlyRate;
    } else {
      rate = new Rate({ hourlyRate });
    }

    await rate.save();
    res.json(rate);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;