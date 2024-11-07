const express = require('express');
const Order = require('../Models/OrderSchema');
const Rate = require('../Models/RateSchema');
const auth = require('../middleware/auth');
const User = require('../Models/UserSchema')
const Room = require('../Models/RoomSchema'); // Import the Room schema (previously TvSchema)
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

// Change Room and TV (Admin Route, no OTP)
router.post('/change-room', [auth, admin], async (req, res) => {
    const { orderId, newRoomNumber, newTvNumber } = req.body;

    try {
        // Find the order by orderId
        const order = await Order.findById(orderId);

        if (!order) {
        return res.status(404).json({ msg: 'Order not found' });
        }

        const oldRoomNumber = order.roomNumber[0];
        const oldTvNumber = order.tvNumber[0];

        // Append the new room number and TV number to the respective arrays
        order.roomNumber.unshift(newRoomNumber);
        order.tvNumber.unshift(newTvNumber);

        // Save the updated order
        await order.save();

        // Repopulate the userId field to get the email after saving
        const updatedOrder = await Order.findById(orderId).populate('userId', 'email');

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
  
// Add a room with an initial TV (Admin Only)
router.post('/add-room', [auth, admin], async (req, res) => {
  const { roomNumber, tvNumber } = req.body;

  try {
      // Check if the room already exists
      let room = await Room.findOne({ roomNumber });
      if (room) {
          return res.status(400).json({ msg: 'Room already exists' });
      }

      // Create a new room with the initial TV
      room = new Room({
          roomNumber,
          tvs: [{ tvNumber, state: 'off' }]  // Set the initial state of the TV to 'off'
      });
      await room.save();

      res.json({ msg: 'Room with TV added successfully', room });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

// Add a TV to a room (Admin Only)
router.post('/add-tv', [auth, admin], async (req, res) => {
    const { roomNumber, tvNumber } = req.body;

    try {
        // Find the room by roomNumber
        const room = await Room.findOne({ roomNumber });
        if (!room) {
            return res.status(404).json({ msg: 'Room not found' });
        }

        // Check if TV with the same number already exists in the room
        if (room.tvs.some(tv => tv.tvNumber === tvNumber)) {
            return res.status(400).json({ msg: 'TV with this number already exists in the room' });
        }

        // Add the new TV to the room
        room.tvs.push({ tvNumber, state: 'off' });
        await room.save();

        res.json({ msg: 'TV added successfully', room });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all rooms and their TVs (Admin Only)
router.get('/all-rooms', [auth, admin], async (req, res) => {
    try {
        const rooms = await Room.find();
        if (!rooms.length) {
            return res.status(404).json({ msg: 'No rooms found' });
        }

        res.json(rooms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Toggle the state of a TV
router.put("/toggle-tv", [auth, admin], async (req, res) => {
  const { roomId, tvId, newState } = req.body;

  try {
    // Find the room by roomId and the specific TV by tvId
    const room = await Room.findOne({ _id: roomId, "tvs._id": tvId });
    if (!room) {
      return res.status(404).json({ msg: "Room or TV not found" });
    }

    // Retrieve roomNumber and tvNumber for WebSocket message
    const roomNumber = room.roomNumber;
    const tv = room.tvs.id(tvId);
    const tvNumber = tv.tvNumber;

    // Update the state of the specific TV
    tv.state = newState;

    // Save the updated room document
    await room.save();

    res.json({ msg: "TV state updated successfully", newState: tv.state });

    // Send WebSocket message with roomNumber and tvNumber
    broadcastMessage({
      action: 'toggle-tv',
      roomNumber,     // Use roomNumber instead of roomId
      tvNumber,       // Use tvNumber instead of tvId
      newState
    });
  } catch (err) {
    console.error("Error toggling TV state:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;