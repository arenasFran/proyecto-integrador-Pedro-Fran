declare namespace Express {
  interface Request {
    user?: {
      username: string;
      _id: string;
    };
  }
}