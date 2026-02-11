import nodemailer from 'nodemailer';
import { log } from '../logger';
import Anthropic from '@anthropic-ai/sdk';

export const EMAIL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'send_email',
    description: `Send an email via Gmail.

Examples:
- Simple email: to="user@example.com", subject="Hello", body="Hi there!"
- Multiple recipients: to="user1@example.com,user2@example.com", subject="Update", body="..."
- HTML email: to="user@example.com", subject="Report", body="<h1>Title</h1><p>Content</p>", html=true

Important: Requires GMAIL_USER and GMAIL_PASSWORD environment variables to be configured.`,
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address(es), comma-separated for multiple'
        },
        subject: {
          type: 'string',
          description: 'Email subject line'
        },
        body: {
          type: 'string',
          description: 'Email content (plain text or HTML)'
        },
        html: {
          type: 'boolean',
          description: 'Set to true if body contains HTML (default: false)'
        },
        cc: {
          type: 'string',
          description: 'CC recipients, comma-separated (optional)'
        },
        bcc: {
          type: 'string',
          description: 'BCC recipients, comma-separated (optional)'
        }
      },
      required: ['to', 'subject', 'body']
    }
  }
];

/**
 * Create email transporter (cached singleton)
 */
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_PASSWORD.');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });

  log.info('[Email] Transporter initialized', { user });

  return transporter;
}

/**
 * Execute email tool
 */
export async function executeEmailTool(toolInput: any): Promise<string> {
  const { to, subject, body, html = false, cc, bcc } = toolInput;

  try {
    const transporter = getTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      ...(html ? { html: body } : { text: body }),
      ...(cc && { cc }),
      ...(bcc && { bcc })
    };

    log.info('[Email] Sending email', {
      to,
      subject,
      hasCC: !!cc,
      hasBCC: !!bcc,
      isHTML: html
    });

    const info = await transporter.sendMail(mailOptions);

    log.info('[Email] Email sent successfully', {
      messageId: info.messageId,
      to
    });

    return `✅ Email sent successfully!

**To:** ${to}
**Subject:** ${subject}
**Message ID:** ${info.messageId}

The email has been delivered.`;

  } catch (error: any) {
    log.error('[Email] Failed to send email', {
      error: error.message,
      to,
      subject
    });

    return `❌ Failed to send email: ${error.message}

**Troubleshooting:**
- Verify Gmail credentials (GMAIL_USER, GMAIL_PASSWORD)
- Check if "Less secure app access" is enabled (or use App Password)
- Verify recipient email address
- Check internet connectivity`;
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    log.info('[Email] Configuration verified successfully');
    return true;
  } catch (error: any) {
    log.error('[Email] Configuration verification failed', {
      error: error.message
    });
    return false;
  }
}
