const express = require('express');
const Order = require('../Models/OrderSchema');
const Rate = require('../Models/RateSchema');
const auth = require('../middleware/auth');
const User = require('../Models/UserSchema')
const Room = require('../Models/TvSchema'); 
const admin = require('../middleware/admin');  // Import the admin middleware
const { broadcastMessage } = require('../utils/webSocket'); // Import WebSocket broadcast function

const router = express.Router();


// Get all orders with user email (Admin Only)
router.get('/all-orders', [auth, admin], async (req, res) => {
    try {
      // Fetch all orders and populate userId with user details (including email)
      const orders = await Order.find().populate('userId', 'email').sort({ orderDate: -1 });  // Sort by orderDate in descending order;
  
      if (!orders.length) {
        return res.status(404).json({ msg: 'No orders found' });
      }
  
      res.json(orders);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });


// Get All Users (Admin Only)
router.get('/all-users', [auth, admin], async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
  
      // Fetch all users from the database
      const users = await User.find({}, 'fullName email phoneNumber'); // Only select the required fields
  
      res.json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

// Change Room using OTP
router.post('/change-room', auth, async (req, res) => {
  const { orderId, otp, newTvNumber } = req.body;

  try {
    // Find the order by orderId
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    const oldTvNumber = order.tvNumber[0];

    // OTP matches, append the new room number to the roomNumber array
    order.tvNumber.unshift(newTvNumber);  // Append the new TV number (corrected field name)

    // Save the updated order
    await order.save();

    const updatedOrder = await Order.findById(orderId).populate('userId', 'email');

    res.json({ msg: 'Room number and TV number updated successfully', order: updatedOrder });

    broadcastMessage({
      action: 'change-room',
      oldTvNumber,
      newTvNumber
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// Change Hourly Rate (Admin Only)
router.post('/change-hourly-rate', [auth, admin], async (req, res) => {
    const { newHourlyRate } = req.body;
  
    try {
      // Validate newHourlyRate
      if (!newHourlyRate || newHourlyRate <= 0) {
        return res.status(400).json({ msg: 'Invalid hourly rate' });
      }
  
      // Try to find the existing rate document
      let rate = await Rate.findOne();
  
      if (!rate) {
        // If no rate document is found, create a new one
        rate = new Rate({
          hourlyRate: newHourlyRate
        });
        await rate.save();
        return res.json({ msg: 'Hourly rate created and set successfully', rate });
      }
  
      // Update the existing rate document
      rate.hourlyRate = newHourlyRate;
      await rate.save();
  
      res.json({ msg: 'Hourly rate updated successfully', rate });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: 'Server error' });
    }
  });
  
// Add a TV (Admin Only)
router.post('/add-tv', [auth, admin], async (req, res) => {
  const { tvNumber } = req.body;

  try {
      // Check if the TV already exists in the database
      const existingTv = await Tv.findOne({ tvNumber });
      if (existingTv) {
          return res.status(400).json({ msg: 'TV with this number already exists' });
      }

      // Create the new TV document
      const newTv = new Tv({
          tvNumber,
          state: 'off', // Default state
      });

      // Save the new TV document
      await newTv.save();

      res.json({ msg: 'TV added successfully', tv: newTv });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

// Get all TVs (Admin Only)
router.get('/all-tvs', [auth, admin], async (req, res) => {
  try {
      const tvs = await Tv.find();
      if (!tvs.length) {
          return res.status(404).json({ msg: 'No TVs found' });
      }

      res.json(tvs);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

// Toggle the state of a TV (Admin Only)
router.put("/toggle-tv", [auth, admin], async (req, res) => {
  const { tvNumber, newState } = req.body;

  try {
    // Find the TV by tvNumber
    const tv = await Tv.findOne({ tvNumber });
    if (!tv) {
      return res.status(404).json({ msg: "TV not found" });
    }

    // Update the state of the specific TV
    tv.state = newState;

    // Save the updated TV document
    await tv.save();

    res.json({ msg: "TV state updated successfully", newState: tv.state });

    // Send WebSocket message with tvNumber
    broadcastMessage({
      action: 'toggle-tv',
      tvNumber,       // TV number to be used in the WebSocket message
      newState
    });
  } catch (err) {
    console.error("Error toggling TV state:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;