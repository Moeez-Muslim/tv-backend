const express = require('express');
const Order = require('../Models/OrderSchema');
const Rate = require('../Models/RateSchema');
const auth = require('../middleware/auth');
const User = require('../Models/UserSchema')
const { sendEmail } = require('../utils/mailer'); // Import mailer utility
const admin = require('../middleware/admin');  // Import the admin middleware

const router = express.Router();

// Helper function to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);  // Generates a 6-digit number
};

// Buy TV-Time (Create Order)
router.post('/buy-tv-time', auth, async (req, res) => {
  const { timeBought, roomNumber } = req.body;

  try {
    const rate = await Rate.findOne(); // Get current TV-time rate
    if (!rate) {
      return res.status(400).json({ msg: 'Rate not found' });
    }

    const totalCost = timeBought * rate.hourlyRate;

    // Generate a 6-digit OTP
    const OTP = generateOTP();

    // Create a new order with the generated OTP
    const newOrder = new Order({
      userId: req.user,
      timeBought,
      totalCost,
      roomNumber,
      OTP,  // Save the OTP in the order
      timeRemaining: timeBought  // Set timeRemaining equal to timeBought
    });

    await newOrder.save();

    // Fetch the user to get their email address
    const user = await User.findById(req.user);

    // Prepare receipt content including OTP
    const subject = 'Your TV-Time Order Receipt';
    const text = `Dear ${user.firstName},\n\nThank you for your order.\n\nOrder Details:\n- Time Bought: ${timeBought} hours\n- Total Cost: $${totalCost}\n- Room Number: ${roomNumber}\n\nYour OTP for transferring TV-time is: ${OTP}\n\nRegards,\nTV Service Team`;
    const html = `
      <h1>Thank you for your order, ${user.firstName}!</h1>
      <p>Here are the details of your order:</p>
      <ul>
        <li><strong>Time Bought:</strong> ${timeBought} hours</li>
        <li><strong>Total Cost:</strong> $${totalCost}</li>
        <li><strong>Room Number:</strong> ${roomNumber}</li>
        <li><strong>Your OTP:</strong> ${OTP}</li>
      </ul>
      <p>You can use this OTP to transfer your TV-time to another room.</p>
      <p>Thank you for choosing our service!</p>
    `;

    // Send the email receipt including OTP using SendGrid
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

// Change Room using OTP
router.post('/change-room', auth, async (req, res) => {
  const { orderId, otp, newRoomNumber } = req.body;

  try {
    // Find the order by orderId
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // Verify the OTP
    if (order.OTP !== otp) {
      return res.status(400).json({ msg: 'OTP verification failed' });
    }

    // OTP matches, update the room number
    order.roomNumber = newRoomNumber;

    // Save the updated order
    await order.save();

    res.json({ msg: 'Room number updated successfully', order });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get All Orders (Admin Only)
router.get('/admin/orders', [auth, admin], async (req, res) => {
  try {
    const orders = await Order.find().populate('userId', 'firstName lastName email');  // Get all orders with user info
    if (!orders.length) {
      return res.status(404).json({ msg: 'No orders found' });
    }

    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
