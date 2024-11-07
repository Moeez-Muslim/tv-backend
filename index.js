const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
require('dotenv').config(); // For loading environment variables
const http = require('http');
const { initialize } = require('./utils/webSocket'); // Import WebSocket initializer


const app = express();
const server = http.createServer(app); // Create HTTP server instance


// Middleware
app.use(bodyParser.json());

// CORS Policy: Allow requests from all origins (for development purposes)
app.use(cors());

// OR
// CORS Policy: Allow requests only from specific domains (for production)
// const allowedOrigins = ['http://example.com', 'http://another-domain.com'];

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Define routes
app.use('/api/users', require('./Routes/UserRoutes'));
app.use('/api/orders', require('./Routes/OrderRoutes'));
app.use('/api/rates', require('./Routes/RateRoutes'));
app.use('/api/admin', require('./Routes/AdminRoutes'));

// Base route to show the server status
app.get('/', (req, res) => {
  res.send('Server is running successfully');
});

// Start WebSocket server
initialize(server); // Initialize WebSocket with the HTTP server

// Start the server
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
