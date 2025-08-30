import sgMail from '@sendgrid/mail';
import dotenv from "dotenv";


dotenv.config();


class EmailService {
  private static initialized = false;

  private static initialize() {

    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL;

    if (!sendgridApiKey || !senderEmail) {
      throw new Error("SENDGRID_API_KEY and SENDER_EMAIL must be set in environment variables");
    }

    sgMail.setApiKey(sendgridApiKey);
    this.initialized = true;
  }

static async send(receiverEmail: string | string[], options: { subjectLine: string, contentBody: string }): Promise<void> {
  if (!this.initialized) {
    this.initialize();
  }

  const senderEmail = process.env.SENDER_MAIL || "arbaj.right@gmail.com";
  
  const msg = {
    to: receiverEmail,
    from: {
      email: senderEmail,
      name: 'Waterz Rentals Goa'
    },
    subject: options.subjectLine,
    text: options.contentBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    html: `<!DOCTYPE html><html><body>${options.contentBody}</body></html>`
  };

  try {
    console.debug('Attempting to send email with message:', msg);
    // @ts-ignore
    await sgMail.send(msg);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', (error as Error).message || error);
    throw error;
  }
}
}

export default EmailService;