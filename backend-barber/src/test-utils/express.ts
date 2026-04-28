import type { Request, Response } from "express";

export function mockReq<TBody extends object>(body: TBody): Request {
  return { body } as unknown as Request;
}

export function mockRes() {
  const res: Partial<Response> & {
    status: jest.Mock;
    json: jest.Mock;
  } = {
    status: jest.fn(),
    json: jest.fn(),
  };

  // Express chaining: res.status(200).json(...)
  res.status.mockReturnValue(res as unknown as Response);

  return res as unknown as Response;
}
