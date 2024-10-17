require('dotenv').config();
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const client = new OAuth2Client(process.env.CLIENT_ID);

// Route to handle Google authentication
app.post('/auth/google', async (req, res) => {
    const { token } = req.body;  // Token sent from the frontend

    try {
        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();

        // Extract user info
        const { sub, email, name, picture } = payload;

        // Create a user object
        const user = {
            userId: sub,
            email: email,
            fullName: name,
        };

        // Generate JWT
        const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';  // Make sure to set and use a strong secret in production
        const tokenOptions = {
            expiresIn: '24h'  // Specifies token expiration time
        };

        const jwtToken = jwt.sign(user, jwtSecret, tokenOptions);

        // Return the JWT token with the user info
        res.status(200).json({
            token: jwtToken,
            user: user
        });
    } catch (error) {
        console.error('Error verifying Google token:', error);
        res.status(401).json({ message: 'Unauthorized' });  // Send unauthorized response if token verification fails
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
