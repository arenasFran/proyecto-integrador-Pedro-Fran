import type { Request, Response } from 'express';

export const createMockReq = <TBody = any>(body?: TBody) => {
  return { body } as unknown as Request;
};

export const createMockRes = () => {
  const res: Partial<Response> = {};

  (res as any).status = jest.fn().mockImplementation(() => res);
  (res as any).json = jest.fn().mockImplementation(() => res);

  return res as Response;
};
