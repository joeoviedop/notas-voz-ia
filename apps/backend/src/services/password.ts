import bcrypt from 'bcryptjs';

export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password with bcrypt
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validate(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    // Check for at least one letter and one number
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one letter and one number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a random password (for testing or temporary passwords)
   */
  generateRandom(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Ensure it meets our validation requirements
    if (!this.validate(password).valid) {
      return this.generateRandom(length);
    }

    return password;
  }
}

// Singleton instance
export const passwordService = new PasswordService();