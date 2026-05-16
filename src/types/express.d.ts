declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
      roles?: string[];
    }
  }
}

export {};
