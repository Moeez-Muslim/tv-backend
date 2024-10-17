const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Models/UserSchema');
const auth = require('../middleware/auth');

const router = express.Router();

// Register User
router.post('/signup', async (req, res) => {
  const { fullName, email, phoneNumber, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    await user.save();
    // Add isAdmin and other user data to the JWT payload
    const payload = {
      userId: user.id,
      isAdmin: user.isAdmin,  // Include isAdmin in the payload
      email: user.email,  // Optionally include the email or other user info
      fuullName: user.fullName,  // Optionally include more details
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Add isAdmin and other user data to the JWT payload
    const payload = {
      userId: user.id,
      isAdmin: user.isAdmin,  // Include isAdmin in the payload
      email: user.email,  // Optionally include the email or other user info
      fuullName: user.fullName,  // Optionally include more details
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
