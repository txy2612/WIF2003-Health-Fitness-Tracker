import mailer from '../../shared/mailer.js'

const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatScheduledFor(scheduledFor, timezone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-MY', {// machine date -> human readable 
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(scheduledFor))
}

// processDueReminders -> sendReminderEmail -> buildReminderEmail -> mailer.sendMail
function buildReminderEmail({ title, message, scheduledFor, timezone }) {
  // Produces 3 Jun 2026, 6:30 PM
  const formattedTime = formatScheduledFor(scheduledFor, timezone)

  // Build subject & content
  const subject = `FitTrack Reminder: ${title}`
  const text = [
    title,
    '',
    message,
    '',
    `Scheduled for: ${formattedTime}`,// Scheduled for: 3 Jun 2026, 6:30 PM
  ].join('\n')

  // looks nicer
  const html = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(message)}</p>
    <p><strong>Scheduled for:</strong> ${escapeHtml(formattedTime)}</p>
  `

  return {
    subject,
    text,
    html,
  }
}

async function sendReminderEmail({ to, title, message, scheduledFor, timezone }) {
  // build email
  const email = buildReminderEmail({
    title,
    message,
    scheduledFor,
    timezone,
  })

  // send email
  return mailer.sendMail({
    to,
    ...email,
  })
}

export default {
  buildReminderEmail,
  sendReminderEmail,
}
