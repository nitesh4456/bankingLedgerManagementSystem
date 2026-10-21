require('dotenv').config();
const dbgr = require('debug')("development:email.service");
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({////contacts google's SMTP servers
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend-Ledger" <${process.env.EMAIL_USER}>`,
      to, subject, text, html,
    });
    dbgr('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send failed:', error); // visible even without DEBUG
    throw error; // let the caller handle it
  }
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to Backend Ledger!';
  const text = `Hello ${name},\nThank you for registering at Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Thank you for registering at Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to Backend Ledger!';
  const text = `Hello ${name},\nThank you for registering at Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Thank you for registering at Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = 'Transaction Confirmation';
  const text = `Hello ${name},\nYour transaction of ₹${amount} to account ${toAccount} was completed successfully on ${new Date().toLocaleString("en-IN")}.\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `
    <p>Hello ${name},</p>
    <p>Your transaction has been completed successfully.</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="border:1px solid #e0e0e0;font-weight:bold;">Amount</td><td style="border:1px solid #e0e0e0;">₹${amount}</td></tr>
      <tr><td style="border:1px solid #e0e0e0;font-weight:bold;">To Account</td><td style="border:1px solid #e0e0e0;">${toAccount}</td></tr>
      <tr><td style="border:1px solid #e0e0e0;font-weight:bold;">Date</td><td style="border:1px solid #e0e0e0;">${new Date().toLocaleString("en-IN")}</td></tr>
    </table>
    <p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail
};   
