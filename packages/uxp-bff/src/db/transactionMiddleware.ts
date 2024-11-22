import { NextFunction, Request, Response } from 'express';
import { QueryRunner } from 'typeorm';
//import { AppDataSource } from './typeorm.config';
const {AppDataSource} =require("./typeorm.config")


export const transactionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let queryRunner: QueryRunner | undefined = undefined;

  const dbConnection = async (transactional = true): Promise<QueryRunner> => {
    if (!queryRunner) {
      queryRunner = AppDataSource.createQueryRunner();
      await queryRunner!.connect();
      if (transactional) {
        await queryRunner!.startTransaction();
      }
    }
    return queryRunner!;
  }

  req.dbConnection = dbConnection;

  try {
    await next();
    queryRunner && await (queryRunner as QueryRunner).commitTransaction();

  } catch (err) {
    queryRunner && await await (queryRunner as QueryRunner).rollbackTransaction();
    throw err;
  } finally {
    queryRunner && await await (queryRunner as QueryRunner).release();
  }
};
