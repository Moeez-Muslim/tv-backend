const express = require('express');
const bodyParser = require('body-parser');
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
  const { timeBought, tvNumber } = req.body;

  try {
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
      tvNumber: [tvNumber],  // Ensure tvNumber is stored as a array of number
      OTP  // Save the OTP in the order
    });

    await newOrder.save();

    // Fetch the user to get their email address
    const user = await User.findById(req.user);

    // Format roomNumber and tvNumber as strings for display
    const tvNumberFormatted = tvNumber;

    const subject = 'Your TV-Time Order Receipt';
    const text = `Dear ${user.fullName},\n\nThank you for your order.\n\nOrder Details:\n- Time Bought: ${timeBought} hours\n- Total Cost: $${totalCost}\n- TV Number: ${tvNumberFormatted}\n\nYour OTP for transferring TV-time is: ${OTP}\n\nRegards,\nTV Service Team`;
    const html = `
      <h1>Thank you for your order, ${user.fullName}!</h1>
      <p>Here are the details of your order:</p>
      <ul>
        <li><strong>Time Bought:</strong> ${timeBought} hours</li>
        <li><strong>Total Cost:</strong> $${totalCost}</li>
        <li><strong>TV Number:</strong> ${tvNumberFormatted}</li>
        <li><strong>Your OTP:</strong> ${OTP}</li>
      </ul>
      <p>You can use this OTP to transfer your TV-time to another TV.</p>
      <p>Thank you for choosing our service!</p>
    `;

    // Send the email receipt including OTP using SendGrid
    sendEmail(user.email, subject, text, html);

    res.json(newOrder);

    // Broadcast WebSocket message to device
    broadcastMessage({
      action: 'buy-tv-time',
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
  const { orderId, otp, newTvNumber } = req.body;

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

// Calculate Price based on thresholds
const calculatePrice = async (days) => {
  const rate = await Rate.findOne();
  if (!rate || !rate.thresholds || rate.thresholds.length === 0) {
    throw new Error('Rate thresholds not set');
  }

  // Sort thresholds and find the applicable price
  const sortedThresholds = rate.thresholds.sort((a, b) => a.days - b.days);
  let price = sortedThresholds[sortedThresholds.length - 1].price; // Default to last threshold price

  for (const threshold of sortedThresholds) {
    if (days <= threshold.days) {
      price = threshold.price;
      break;
    }
  }
  console.log("Price returned: ", price * days * 100)

  return price * days * 100; // Return price in cents
};

const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST_KEY);

router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { timeBought, tvNumber } = req.body;

    days = timeBought;
    const rate = await Rate.findOne();
    if (!rate || !rate.thresholds || rate.thresholds.length === 0) {
      throw new Error('Rate thresholds not set');
    }

    // Sort thresholds and find the applicable price
    const sortedThresholds = rate.thresholds.sort((a, b) => a.days - b.days);
    let price = sortedThresholds[sortedThresholds.length - 1].price; // Default to last threshold price

    for (const threshold of sortedThresholds) {
      if (days <= threshold.days) {
        price = threshold.price;
        break;
      }
    }

    const unitAmount = price * 100;
    console.log("Unit Amount: ", unitAmount);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur', // Set your desired currency
            product_data: {
              name: `TV Subscription for TV Number: ${tvNumber}`, // Custom product name
            },
            unit_amount: unitAmount, // Custom price in cents
          },
          quantity: timeBought,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/?canceled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        timeBought: timeBought,
        tvNumber: tvNumber,
        userId: req.user
      },
    });

    console.log("metadata sent: ", session.metadata);

    // Return the session URL in the response
    res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Stripe Webhook Endpoint
router.post("/webhook",   bodyParser.raw({ type: "application/json" }), async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Your webhook secret
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // Verify Stripe's signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Fulfill the order
      const { timeBought, tvNumber, userId } = session.metadata;
      console.log("metadata rceived: ", session.metadata);

      const rate = await Rate.findOne();
      if (!rate) {
        console.error("Rate not found");
        return res.status(400).send("Rate not found");
      }

      const totalCost = timeBought * rate.hourlyRate;

      // Generate a 6-digit OTP
      const OTP = generateOTP();

      // Create a new order
      const newOrder = new Order({
        userId,
        timeBought,
        totalCost,
        tvNumber: [tvNumber], // Store tvNumber as an array
        OTP,
      });

      await newOrder.save();

      // Fetch the user to send a receipt
      const user = await User.findById(userId);

      // Format and send email receipt
      const subject = "Your TV-Time Order Receipt";
      const text = `Dear ${user.fullName},\n\nThank you for your order.\n\nOrder Details:\n- Time Bought: ${timeBought} hours\n- Total Cost: $${totalCost}\n- TV Number: ${tvNumber}\n\nYour OTP for transferring TV-time is: ${OTP}\n\nRegards,\nTV Service Team`;
      const html = `
        <h1>Thank you for your order, ${user.fullName}!</h1>
        <p>Here are the details of your order:</p>
        <ul>
          <li><strong>Time Bought:</strong> ${timeBought} hours</li>
          <li><strong>Total Cost:</strong> $${totalCost}</li>
          <li><strong>TV Number:</strong> ${tvNumber}</li>
          <li><strong>Your OTP:</strong> ${OTP}</li>
        </ul>
        <p>You can use this OTP to transfer your TV-time to another TV.</p>
        <p>Thank you for choosing our service!</p>
      `;
      sendEmail(user.email, subject, text, html);

      // Broadcast WebSocket message
      broadcastMessage({
        action: "buy-tv-time",
        tvNumber: tvNumber,
        timeBought,
      });

      console.log(`Order fulfilled: ${newOrder._id}`);
    } catch (error) {
      console.error("Error fulfilling order:", error);
      return res.status(500).send("Order fulfillment failed");
    }
  }

  // Respond to Stripe to acknowledge the event
  res.json({ received: true });
});

module.exports = router;

