const User = require('../Models/UserSchema'); // Import the User model

const admin = async (req, res, next) => {
  try {
    // Extract the user ID from req.user (which is set by the authentication middleware)
    const userId = req.user;

    // Fetch the user from the database
    const user = await User.findById(userId);

    // If user is not found or not an admin, return a 403 status
    if (!user || !user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    // If the user is an admin, proceed to the next middleware/route handler
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = admin;
