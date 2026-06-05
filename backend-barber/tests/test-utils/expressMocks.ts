import type { Request, Response } from 'express';

type MockReqOptions<TBody = any, TParams = any, TQuery = any> = {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
};

export const createMockReq = <TBody = any>(body?: TBody): Request => {
  return { body } as unknown as Request;
};

export const createMockReqFull = <TBody = any, TParams = any, TQuery = any>(
  options: MockReqOptions<TBody, TParams, TQuery> = {}
): Request => {
  const { body, params, query } = options;
  return { body, params, query } as unknown as Request;
};

export const createMockRes = () => {
  const res: Partial<Response> = {};

  (res as any).status = jest.fn().mockImplementation(() => res);
  (res as any).json = jest.fn().mockImplementation(() => res);

  return res as Response;
};
