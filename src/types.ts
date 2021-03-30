import { IDatabaseDriver, Connection, EntityManager } from '@mikro-orm/core';
import { Request, Response } from 'express';

export type MyContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request & { session: any };
  res: Response;
};
