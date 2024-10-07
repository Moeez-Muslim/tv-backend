const express = require('express');
const Order = require('../Models/OrderSchema');
const Rate = require('../Models/RateSchema');
const auth = require('../middleware/auth');
const User = require('../Models/UserSchema')
const { sendEmail } = require('../utils/mailer'); // Import mailer utility

const router = express.Router();

// Buy TV-Time (Create Order)
router.post('/buy-tv-time', auth, async (req, res) => {
  const { timeBought, roomNumber } = req.body;

  try {
    const rate = await Rate.findOne(); // Get current TV-time rate
    if (!rate) {
      return res.status(400).json({ msg: 'Rate not found' });
    }

    const totalCost = timeBought * rate.hourlyRate;

    const newOrder = new Order({
      userId: req.user,
      timeBought,
      totalCost,
      roomNumber,
    });

    await newOrder.save();

    // Fetch the user to get their email address
    const user = await User.findById(req.user);

    // Prepare receipt content
    const subject = 'Your TV-Time Order Receipt';
    const text = `Dear ${user.firstName},\n\nThank you for your order.\n\nOrder Details:\n- Time Bought: ${timeBought} hours\n- Total Cost: $${totalCost}\n- Room Number: ${roomNumber}\n\nRegards,\nTV Service Team`;
    const html = `
      <h1>Thank you for your order, ${user.firstName}!</h1>
      <p>Here are the details of your order:</p>
      <ul>
        <li><strong>Time Bought:</strong> ${timeBought} hours</li>
        <li><strong>Total Cost:</strong> $${totalCost}</li>
        <li><strong>Room Number:</strong> ${roomNumber}</li>
      </ul>
      <p>Thank you for choosing our service!</p>
    `;

    // Send the email receipt using SendGrid
    sendEmail(user.email, subject, text, html);

    res.json(newOrder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get All Orders for Logged-in User
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user });
    if (!orders.length) {
      return res.status(404).json({ msg: 'No orders found for this user' });
    }

    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
