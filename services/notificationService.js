const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

// Transporter Setup
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send Email Notification via Nodemailer
 */
const sendEmail = async ({ to, subject, bodyText, html }) => {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Salman Hair Studio" <no-reply@salmanhairstudio.com>',
        to,
        subject,
        text: bodyText,
        html: html || `<p>${bodyText}</p>`,
      });
    } else {
      console.log(`[Notification Service - Email Fallback to Log] To: ${to} | Subject: ${subject}`);
    }

    await Notification.create({
      recipient: to,
      recipientType: 'Client',
      channel: 'email',
      title: subject,
      message: bodyText,
      status: 'sent',
      sentAt: new Date(),
    });
  } catch (error) {
    console.error('[Notification Error - Email Failure]:', error.message);
    await Notification.create({
      recipient: to,
      recipientType: 'Client',
      channel: 'email',
      title: subject,
      message: bodyText,
      status: 'failed',
    });
  }
};

/**
 * WhatsApp Notification Service (Configurable Structure)
 */
const sendWhatsApp = async ({ phone, message }) => {
  try {
    console.log(`[Notification Service - WhatsApp Queue] Phone: ${phone} | Message: ${message}`);

    await Notification.create({
      recipient: phone,
      recipientType: 'Client',
      channel: 'whatsapp',
      title: 'WhatsApp Alert',
      message,
      status: 'sent',
      sentAt: new Date(),
    });
  } catch (error) {
    console.error('[Notification Error - WhatsApp Failure]:', error.message);
  }
};

/**
 * Create In-App Notification Record
 */
const createInAppNotification = async ({ recipient, recipientType = 'Admin', title, message, data = {} }) => {
  return await Notification.create({
    recipient,
    recipientType,
    channel: 'in_app',
    title,
    message,
    data,
    status: 'sent',
    sentAt: new Date(),
  });
};

/**
 * Trigger Notification Hook for Appointment Lifecycle Events
 */
const triggerAppointmentNotification = async (eventType, appointment) => {
  if (!appointment) return;

  const clientName = appointment.clientName || 'Valued Patron';
  const clientEmail = appointment.clientEmail;
  const clientPhone = appointment.clientPhone;
  const date = appointment.date;
  const time = appointment.startTime || '10:00';

  let subject = '';
  let message = '';

  switch (eventType) {
    case 'NEW_APPOINTMENT':
      subject = 'Reservation Received - Salman Hair Studio';
      message = `Hello ${clientName}, your appointment reservation for ${date} at ${time} has been received.`;
      break;

    case 'APPOINTMENT_CONFIRMED':
      subject = 'Appointment Confirmed - Salman Hair Studio';
      message = `Great news ${clientName}! Your appointment for ${date} at ${time} has been confirmed.`;
      break;

    case 'APPOINTMENT_CANCELLED':
      subject = 'Appointment Cancellation Notice - Salman Hair Studio';
      message = `Dear ${clientName}, your appointment on ${date} at ${time} has been cancelled.`;
      break;

    case 'APPOINTMENT_RESCHEDULED':
      subject = 'Appointment Rescheduled - Salman Hair Studio';
      message = `Hello ${clientName}, your appointment has been rescheduled to ${date} at ${time}.`;
      break;

    case 'APPOINTMENT_COMPLETED':
      subject = 'Thank You for Visiting Salman Hair Studio';
      message = `Dear ${clientName}, thank you for visiting us on ${date}! We hope you loved your new look.`;
      break;

    default:
      return;
  }

  // Trigger Email
  if (clientEmail) {
    sendEmail({ to: clientEmail, subject, bodyText: message });
  }

  // Trigger WhatsApp
  if (clientPhone) {
    sendWhatsApp({ phone: clientPhone, message });
  }

  // Trigger In-App Notification for Admin Console
  createInAppNotification({
    recipient: 'Admin',
    recipientType: 'Admin',
    title: subject,
    message: `${clientName} (${clientPhone}): ${eventType} on ${date} @ ${time}`,
    data: { appointmentId: appointment._id, eventType },
  });
};

module.exports = {
  sendEmail,
  sendWhatsApp,
  createInAppNotification,
  triggerAppointmentNotification,
};
