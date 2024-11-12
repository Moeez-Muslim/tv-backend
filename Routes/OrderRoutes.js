const express = require('express');
const Order = require('../Models/OrderSchema');
const Rate = require('../Models/RateSchema');
const auth = require('../middleware/auth');
const User = require('../Models/UserSchema')
const { sendEmail } = require('../utils/mailer'); // Import mailer utility
const { broadcastMessage } = require('../utils/webSocket'); // Import WebSocket broadcast function

const router = express.Router();

// Helper function to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);  // Generates a 6-digit number
};

// Buy TV-Time (Create Order)
router.post('/buy-tv-time', auth, async (req, res) => {
  const { timeBought, roomNumber, tvNumber } = req.body;

  try {
    // Convert roomNumber (string) to an integer and store it in an array
    const roomNumberInt = parseInt(roomNumber, 10);
    
    // Check if the conversion to number was successful
    if (isNaN(roomNumberInt)) {
      return res.status(400).json({ msg: 'Invalid room number. It must be a number.' });
    }

    // Validate tvNumber
    if (!tvNumber || isNaN(tvNumber)) {
      return res.status(400).json({ msg: 'Invalid TV number. It must be a number.' });
    }

    const rate = await Rate.findOne(); // Get current TV-time rate
    if (!rate) {
      return res.status(400).json({ msg: 'Rate not found' });
    }

    const totalCost = timeBought * rate.hourlyRate;

    // Generate a 6-digit OTP
    const OTP = generateOTP();

    // Create a new order with the generated OTP and tvNumber
    const newOrder = new Order({
      userId: req.user,
      timeBought,
      totalCost,
      roomNumber: [roomNumberInt],  // Save the room number as an array with a single element
      tvNumber: [parseInt(tvNumber, 10)],  // Ensure tvNumber is stored as a array of number
      OTP  // Save the OTP in the order
    });

    await newOrder.save();

    // Fetch the user to get their email address
    const user = await User.findById(req.user);

    // Format roomNumber and tvNumber as strings for display
    const roomNumbersFormatted = roomNumberInt.toString();
    const tvNumberFormatted = tvNumber.toString();

    const subject = 'Your TV-Time Order Receipt';
    const text = `Dear ${user.fullName},\n\nThank you for your order.\n\nOrder Details:\n- Time Bought: ${timeBought} hours\n- Total Cost: $${totalCost}\n- Room Number: ${roomNumbersFormatted}\n- TV Number: ${tvNumberFormatted}\n\nYour OTP for transferring TV-time is: ${OTP}\n\nRegards,\nTV Service Team`;
    const html = `
      <h1>Thank you for your order, ${user.fullName}!</h1>
      <p>Here are the details of your order:</p>
      <ul>
        <li><strong>Time Bought:</strong> ${timeBought} hours</li>
        <li><strong>Total Cost:</strong> $${totalCost}</li>
        <li><strong>Room Number:</strong> ${roomNumbersFormatted}</li>
        <li><strong>TV Number:</strong> ${tvNumberFormatted}</li>
        <li><strong>Your OTP:</strong> ${OTP}</li>
      </ul>
      <p>You can use this OTP to transfer your TV-time to another room.</p>
      <p>Thank you for choosing our service!</p>
    `;

    // Send the email receipt including OTP using SendGrid
    sendEmail(user.email, subject, text, html);

    res.json(newOrder);

    // Broadcast WebSocket message to device
    broadcastMessage({
      action: 'buy-tv-time',
      roomNumber: roomNumberInt,
      tvNumber: parseInt(tvNumber, 10),
      timeBought,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



// Get All Orders for Logged-in User
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user })
      .sort({ orderDate: -1 });  // Sort by orderDate in descending order

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
  const { orderId, otp, newRoomNumber, newTvNumber } = req.body;

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

    const oldRoomNumber = order.roomNumber[0];
    const oldTvNumber = order.tvNumber[0];

    // OTP matches, append the new room number to the roomNumber array
    order.roomNumber.unshift(newRoomNumber);  // Append the new room number
    order.tvNumber.unshift(newTvNumber);  // Append the new TV number (corrected field name)

    // Save the updated order
    await order.save();

    res.json({ msg: 'Room number and TV number updated successfully', order: updatedOrder });

    broadcastMessage({
      action: 'change-room',
      oldRoomNumber,
      oldTvNumber,
      newRoomNumber,
      newTvNumber
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

