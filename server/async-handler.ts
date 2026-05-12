import type { Request, Response, NextFunction } from "express";

/**
 * Wraps an async Express route handler so that rejected promises
 * are forwarded to Express's error middleware instead of becoming
 * unhandled rejections (which crash the process).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
