// Import the SendGrid library
const sgMail = require('@sendgrid/mail');

// Set the API key from the environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Function to send an email
const sendEmail = (to, subject, text, html) => {
  const msg = {
    to: to, // Recipient's email
    from: 'mail2moeezmuslim@gmail.com', // Your verified SendGrid sender email
    subject: subject, // Email subject
    text: text, // Plain text content
    html: html, // HTML content
  };

  // Send the email
  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent successfully');
    })
    .catch((error) => {
      console.error('Error sending email:', error);
    });
};

module.exports = { sendEmail };
