import { NextFunction, Request, Response } from 'express';
import { MongoMembershipRepository } from '../../infrastructure/repositories/mongodb/MongoMembershipRepository';

export const createRequireActiveMembership = (membershipRepository: MongoMembershipRepository) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const hasActiveMembership = await membershipRepository.hasActiveMembership(req.user._id);
    if (!hasActiveMembership) {
      return res.status(403).json({ error: 'No tenés una membresía activa.' });
    }

    return next();
  };
};
