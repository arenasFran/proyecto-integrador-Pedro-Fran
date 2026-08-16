import { describe, expect, it } from 'vitest';
import { canAccessAdminPath, getStaffHome, ADMIN_HOME, EMPLOYEE_HOME, CLIENT_HOME } from './rbac';

describe('canAccessAdminPath', () => {
  it('permite a Admin acceder a cualquier ruta /admin/*', () => {
    expect(canAccessAdminPath('Admin', '/admin/dashboard')).toBe(true);
    expect(canAccessAdminPath('Admin', '/admin/clientes')).toBe(true);
    expect(canAccessAdminPath('Admin', '/admin/clientes/abc')).toBe(true);
    expect(canAccessAdminPath('Admin', '/admin/profesionales')).toBe(true);
    expect(canAccessAdminPath('Admin', '/admin/turnos')).toBe(true);
  });

  it('permite a Empleado acceder a sus rutas de trabajo', () => {
    expect(canAccessAdminPath('Empleado', '/admin/turnos')).toBe(true);
    expect(canAccessAdminPath('Empleado', '/admin/calendario')).toBe(true);
    expect(canAccessAdminPath('Empleado', '/admin/ordenes')).toBe(true);
    expect(canAccessAdminPath('Empleado', '/admin/perfil')).toBe(true);
  });

  it('bloquea a Empleado las rutas solo de Admin', () => {
    expect(canAccessAdminPath('Empleado', '/admin/dashboard')).toBe(false);
    expect(canAccessAdminPath('Empleado', '/admin/profesionales')).toBe(false);
    expect(canAccessAdminPath('Empleado', '/admin/membresias')).toBe(false);
    expect(canAccessAdminPath('Empleado', '/admin/clientes')).toBe(false);
    expect(canAccessAdminPath('Empleado', '/admin/clientes/abc')).toBe(false);
    expect(canAccessAdminPath('Empleado', '/admin/servicios')).toBe(false);
    expect(canAccessAdminPath('Empleado', '/admin/productos')).toBe(false);
  });

  it('bloquea a Registirado y sin sesión cualquier ruta /admin/*', () => {
    expect(canAccessAdminPath('Registrado', '/admin/turnos')).toBe(false);
    expect(canAccessAdminPath('Registrado', '/admin/clientes')).toBe(false);
    expect(canAccessAdminPath(null, '/admin/dashboard')).toBe(false);
  });
});

describe('getStaffHome', () => {
  it('retorna el home del panel según el rol de staff', () => {
    expect(getStaffHome('Admin')).toBe(ADMIN_HOME);
    expect(getStaffHome('Empleado')).toBe(EMPLOYEE_HOME);
  });

  it('cae a un fallback seguro para roles de cliente, inválidos o ausentes sin lanzar excepción', () => {
    expect(getStaffHome('Registrado')).toBe(CLIENT_HOME);
    expect(getStaffHome(null)).toBe(CLIENT_HOME);
    expect(getStaffHome(undefined)).toBe(CLIENT_HOME);
    expect(getStaffHome('Superadmin')).toBe(CLIENT_HOME);
  });
});
