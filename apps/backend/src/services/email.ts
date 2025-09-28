import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailProvider = process.env.EMAIL_PROVIDER || 'mock';

    if (emailProvider === 'mock' || this.isDevelopment) {
      // In development, we'll just log to console
      return;
    }

    // Configure real SMTP for production
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter || this.isDevelopment) {
      // In development or mock mode, log to console
      console.log('\n=== EMAIL SIMULATION ===');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log('Content:');
      console.log(options.text || options.html || 'No content provided');
      console.log('========================\n');
      return;
    }

    // Send real email in production
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl?: string): Promise<void> {
    const baseUrl = resetUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/auth/reset/confirm?token=${resetToken}`;

    const subject = 'Reset your password - Notas de Voz';
    
    const text = `
    Hello,
    
    You requested to reset your password for your Notas de Voz account.
    
    Please click on the following link to reset your password:
    ${resetLink}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, please ignore this email.
    
    Best regards,
    The Notas de Voz Team
    `;

    const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
      
      <p style="color: #666; line-height: 1.6;">
        Hello,
      </p>
      
      <p style="color: #666; line-height: 1.6;">
        You requested to reset your password for your Notas de Voz account.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #999; font-size: 14px; line-height: 1.6;">
        This link will expire in 1 hour for security reasons.
      </p>
      
      <p style="color: #999; font-size: 14px; line-height: 1.6;">
        If you didn't request this password reset, please ignore this email.
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        Best regards,<br>
        The Notas de Voz Team
      </p>
    </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return true; // Mock mode always works
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const emailService = new EmailService();