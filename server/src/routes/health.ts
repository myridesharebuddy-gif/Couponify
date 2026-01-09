import { Router, Request, Response } from 'express';

const router = Router();

export const sendHealthResponse = (req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    host: req.headers.host ?? 'unknown'
  });
};

router.get('/', sendHealthResponse);

export default router;
