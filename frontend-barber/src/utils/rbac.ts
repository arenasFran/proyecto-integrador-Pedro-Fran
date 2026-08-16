import type { TokenUser } from './token';

export const ADMIN_HOME = '/admin/dashboard';
export const EMPLOYEE_HOME = '/admin/turnos';
export const CLIENT_HOME = '/mis-turnos';

export const ADMIN_ONLY_PATHS = [
  '/admin/dashboard',
  '/admin/profesionales',
  '/admin/clientes',
  '/admin/membresias',
] as const;

export const EMPLOYEE_ALLOWED_PATHS = [
  '/admin/turnos',
  '/admin/calendario',
  '/admin/ordenes',
  '/admin/perfil',
] as const;

const matchesPath = (allowed: readonly string[], path: string): boolean =>
  allowed.some((p) => path === p || path.startsWith(`${p}/`));

export function canAccessAdminPath(
  kind: TokenUser['kind'] | null,
  path: string
): boolean {
  if (kind === 'Admin') {
    return true;
  }

  if (kind === 'Empleado') {
    return matchesPath(EMPLOYEE_ALLOWED_PATHS, path);
  }

  return false;
}

export function getStaffHome(role: string | null | undefined): string {
  if (role === 'Admin') {
    return ADMIN_HOME;
  }

  if (role === 'Empleado') {
    return EMPLOYEE_HOME;
  }

  return CLIENT_HOME;
}
