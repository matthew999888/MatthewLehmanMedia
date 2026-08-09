// Branded email templates.
//
// Table-based layout with inline styles, because that is what email clients
// actually render. Colours mirror the site palette (--deep / --accent /
// --white from index.html) so the mail looks like it came from the site.
// Fonts fall back to system serif/sans — Bebas Neue and Cormorant aren't
// available in mail clients, and webfonts in email are not worth the trouble.

import { escapeHtml } from './http.js';
import { SITE_URL } from './env.js';

const DEEP = '#0e0a1a';
const CARD = '#160d2e';
const ACCENT = '#7c4ddb';
const LIGHT = '#b48ffc';
const WHITE = '#f5f0ff';
const MUTED = '#9b8eb5';

const SANS = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

function shell({ heading, intro, buttonLabel, buttonUrl, body, footNote }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:${DEEP};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DEEP};padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:1px solid rgba(124,77,219,.28);border-radius:6px;">
    <tr><td style="padding:32px 32px 8px;text-align:center;">
      <div style="font-family:${SANS};font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:${LIGHT};">Matthew Lehman Media</div>
    </td></tr>
    <tr><td style="padding:16px 32px 0;">
      <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:400;color:${WHITE};">${escapeHtml(heading)}</h1>
      ${intro ? `<p style="margin:0 0 20px;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">${intro}</p>` : ''}
      ${body || ''}
    </td></tr>
    ${buttonUrl ? `
    <tr><td style="padding:8px 32px 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${ACCENT};border-radius:3px;">
          <a href="${buttonUrl}" style="display:inline-block;padding:13px 30px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:.06em;color:#ffffff;text-decoration:none;">${escapeHtml(buttonLabel)}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:18px 32px 0;">
      <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
        If the button doesn't work, copy this link into your browser:<br>
        <a href="${buttonUrl}" style="color:${LIGHT};word-break:break-all;">${escapeHtml(buttonUrl)}</a>
      </p>
    </td></tr>` : ''}
    <tr><td style="padding:26px 32px 30px;">
      <hr style="border:none;border-top:1px solid rgba(124,77,219,.2);margin:0 0 16px;">
      <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
        ${footNote || `Sent by Matthew Lehman Media — Sports &amp; Athletic Photography, Logan, Ohio.`}<br>
        <a href="${SITE_URL}" style="color:${LIGHT};text-decoration:none;">${escapeHtml(SITE_URL.replace(/^https?:\/\//, ''))}</a>
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ── Signup confirmation ────────────────────────────────────────────────────
export function confirmSignupEmail({ confirmUrl, name }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
  return {
    subject: 'Confirm your email — Matthew Lehman Media',
    html: shell({
      heading: 'Confirm your email',
      intro: `${greeting} thanks for creating an account. Confirm your email address and your galleries will be waiting for you.`,
      buttonLabel: 'Confirm my email',
      buttonUrl: confirmUrl,
      footNote: "If you didn't create this account, you can ignore this email — nothing will happen without confirmation.",
    }),
    text: `${greeting}\n\nConfirm your email address to finish setting up your Matthew Lehman Media account:\n\n${confirmUrl}\n\nIf you didn't create this account, ignore this email.`,
  };
}

// ── Password reset ─────────────────────────────────────────────────────────
export function passwordResetEmail({ resetUrl }) {
  return {
    subject: 'Reset your password — Matthew Lehman Media',
    html: shell({
      heading: 'Reset your password',
      intro: 'Use the link below to choose a new password. It expires in one hour.',
      buttonLabel: 'Choose a new password',
      buttonUrl: resetUrl,
      footNote: "If you didn't ask for this, you can safely ignore it — your password stays as it is.",
    }),
    text: `Reset your Matthew Lehman Media password:\n\n${resetUrl}\n\nThis link expires in one hour. If you didn't ask for it, ignore this email.`,
  };
}

// ── "Here are your photos" — the secret gallery link ───────────────────────
export function galleryLinkEmail({ galleryTitle, galleryUrl, message, coverUrl }) {
  const note = message
    ? `<p style="margin:0 0 20px;padding:14px 16px;background:rgba(124,77,219,.12);border-left:2px solid ${ACCENT};font-family:${SANS};font-size:14px;line-height:1.65;color:${WHITE};">${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    : '';

  const cover = coverUrl
    ? `<img src="${escapeHtml(coverUrl)}" alt="" width="496" style="display:block;width:100%;max-width:496px;height:auto;border-radius:4px;margin:0 0 20px;">`
    : '';

  return {
    subject: `Your gallery is ready — ${galleryTitle}`,
    html: shell({
      heading: galleryTitle,
      intro: 'Your gallery is ready to view. The link below is private to you — no account or password needed.',
      body: cover + note,
      buttonLabel: 'View the gallery',
      buttonUrl: galleryUrl,
      footNote: 'Please keep this link to yourself — anyone who has it can view the gallery.',
    }),
    text: `Your gallery "${galleryTitle}" is ready to view:\n\n${galleryUrl}\n\n${message ? message + '\n\n' : ''}No account needed. Please keep this link to yourself — anyone who has it can view the gallery.`,
  };
}

// ── Contact form → the owner's inbox ───────────────────────────────────────
export function contactEmail({ name, email, message, subject }) {
  const rows = [
    ['From', escapeHtml(name)],
    ['Email', `<a href="mailto:${escapeHtml(email)}" style="color:${LIGHT};">${escapeHtml(email)}</a>`],
    ['Subject', escapeHtml(subject || '—')],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:5px 12px 5px 0;font-family:${SANS};font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:${MUTED};white-space:nowrap;vertical-align:top;">${k}</td>` +
        `<td style="padding:5px 0;font-family:${SANS};font-size:14px;color:${WHITE};">${v}</td></tr>`
    )
    .join('');

  return {
    subject: `New enquiry from ${name}${subject ? ` — ${subject}` : ''}`,
    html: shell({
      heading: 'New enquiry',
      body:
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows}</table>` +
        `<p style="margin:0;padding:14px 16px;background:rgba(124,77,219,.12);border-left:2px solid ${ACCENT};font-family:${SANS};font-size:14px;line-height:1.7;color:${WHITE};white-space:pre-wrap;">${escapeHtml(message)}</p>`,
      footNote: 'Sent from the contact form on your website.',
    }),
    text: `New enquiry\n\nFrom: ${name}\nEmail: ${email}\nSubject: ${subject || '—'}\n\n${message}`,
  };
}
