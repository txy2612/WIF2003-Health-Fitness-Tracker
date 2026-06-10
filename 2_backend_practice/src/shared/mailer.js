import nodemailer from 'nodemailer'// the lib that sends email
import env from '../config/env.js'// SMTP env values

// email track (knows address & SMTP server)
let transporter

// check SMTP configured, ensure details exist before sending
function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST)
}

// Create transporter once, reuse forever
function getTransporter() {
  if (!isSmtpConfigured()) {// check if the truck is registered with lalamove
    throw new Error('SMTP_HOST is required before sending reminder emails.')
  }

  // first call, transporter undefined
  if (!transporter) {
    const auth = env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined
      
      // create
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth,
    })
  }

  // get truck
  return transporter
}

// reuse one transporter ev email
async function sendMail({ to, subject, text, html }) {
  return getTransporter().sendMail({// call truck
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  })
}

// Verify if can connect to SMTP without sending an email
async function verifySmtpConnection() {
  return getTransporter().verify()
}

// other files can do emailService.sendMail(), emailService.verifySmtpConnection
export default {
  isSmtpConfigured,
  sendMail,
  verifySmtpConnection,
}
