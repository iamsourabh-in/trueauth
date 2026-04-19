export {};

declare global {
  namespace Express {
    interface Request {
      /** Set by requestContext middleware for log correlation */
      requestId?: string;
    }
  }
}
