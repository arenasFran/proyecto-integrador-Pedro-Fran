import { AppError } from '../domain/errors/AppError';

export function assertOwnershipOrAdmin(
  resourceOwnerId: string,
  userId: string,
  userKind: string,
  resourceName: string = 'recurso'
): void {
  const isOwner = resourceOwnerId === userId;
  const isAdmin = userKind === 'Admin';
  if (!isOwner && !isAdmin) {
    throw new AppError(`No tenés permiso para ver este ${resourceName}.`, 403);
  }
}
