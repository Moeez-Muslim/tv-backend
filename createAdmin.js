// createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./Models/UserSchema');  // Your User schema
const dotenv = require('dotenv');

dotenv.config();

// Connect to your MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

const createAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash('12345678', 10);  // Hash the password
    const newAdmin = new User({
      firstName: 'admin',
      email: 'admin@gmail.com',
      phoneNumber: '03049983018',
      password: hashedPassword,
      isAdmin: true,
    });

    await newAdmin.save();
    console.log('Admin user created successfully.');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();  // Close the connection after creating the admin
  }
};

createAdminUser();
