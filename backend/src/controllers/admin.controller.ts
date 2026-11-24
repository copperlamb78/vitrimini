import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';

export async function getOverview(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const overview = await adminService.getOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
}
