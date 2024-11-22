import { QueryRunner } from 'typeorm';

declare global {
  namespace Express {
    interface Request {
      dbConnection: () => Promise<QueryRunner>;
    }
  }
}
