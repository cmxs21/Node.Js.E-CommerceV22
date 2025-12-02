import emailTransporter from '../config/email.config.js';
import dotenv from 'dotenv';
dotenv.config();

export const sendEmail = async ({ to, subject, text, html, bcc }) => {
  try {
    const emailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
      ...(bcc ? { bcc } : {}),
    };

    const info = await emailTransporter.sendMail(emailOptions);

    //console.log('Email sent: ', info.messageId);

    return { success: true, message: 'Email sent successfully', data: info };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending email: ' + error.message);
  }
};
