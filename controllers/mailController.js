const nodemailer = require("nodemailer");

/**
 * Send an email using the configured transporter.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Subject of the email.
 * @param {string} text - Plain text content of the email.
 * @param {string} fromName - Sender's name (default: "YourApp").
 * @param {string} [fromAddress] - Sender's email address (default: process.env.NODEMAILER_USER).
 * @param {Array} [attachments] - Array of attachment objects for the email.
 * @returns {Promise<void>} - Resolves on success or rejects with an error.
 */
async function sendEmail({
  to,
  subject,
  text,
  fromName = "YourApp",
  fromAddress = process.env.NODEMAILER_USER,
  attachments = [],
}) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com", // Update if you switch to a different provider.
      port: 465, // Use 465 for secure connections.
      secure: true, // Use `true` for port 465.
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    const mailOptions = {
      from: {
        name: fromName,
        address: fromAddress,
      },
      to,
      subject,
      text,
      attachments, // Attachments are optional.
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
    return info.response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

module.exports = { sendEmail };
