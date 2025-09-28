import { PrismaClient } from '@prisma/client';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  /**
   * Get the Prisma client instance
   */
  get client(): PrismaClient {
    return this.prisma;
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Check database connection health
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}

// Singleton instance
export const db = new DatabaseService();