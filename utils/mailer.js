const nodemailer = require('nodemailer');

// Create a transporter object using Aruba's SMTP settings
const transporter = nodemailer.createTransport({
  host: 'smtps.aruba.it', // Aruba's SMTP server for custom domains
  port: 465, // Port for SSL
  secure: true, // Use SSL
  auth: {
    user: 'no-reply@attivatv.it', // Your email address
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

// Function to send an email
const sendEmail = (to, subject, text, html) => {
  const mailOptions = {
    from: 'no-reply@attivatv.it', // Sender's email (this is your domain's email)
    to: to, // Recipient's email
    subject: subject, // Email subject
    text: text, // Plain text content
    html: html, // HTML content
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

module.exports = { sendEmail };
