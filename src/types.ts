import { Request, Response } from 'express';
import { Redis } from 'ioredis';

export type MyContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request & { session: any };
  res: Response;
  redis: Redis;
};
