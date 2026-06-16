# ADR-001: Alineación de tipos de roles de autenticación

**Fecha:** 2026-06-11

**Contexto:**
Existían 5 definiciones distintas del concepto "rol de usuario" repartidas entre frontend y backend, con valores inconsistentes. `UserRole` (solo `'Admin' | 'Empleado' | 'Registrado'`) y `AuthKind` (`'Admin' | 'Empleado' | 'Registrado' | 'NoRegistrado'`) eran la misma noción pero con distinto contenido. `express.d.ts` llevaba un union inline. `TokenPayload.kind` estaba tipado como `string` (perdiendo la seguridad de tipos). `authSlice.user` estaba tipado como `Professional` (tipo de barbero), lo que impedía asignar un cliente registrado.

**Decisión:**
Se consolidaron todos los tipos de rol de autenticación en una única fuente de verdad, y se separaron los concernimientos entre tipos de auth (para tokens/usuarios logueados) y tipos de cliente (para entidades no registradas).

**Cambios realizados:**

1. `domain/types/auth.ts`:
   - `AuthKind` cambió de `BarberKind | ClientKind` a `BarberKind | 'Registrado'`
   - `ClientKind` conserva `'Registrado' | 'NoRegistrado'` para uso exclusivo de la entidad `Client`
   - Justificación: `'NoRegistrado'` no se usa en ningún token JWT ni flujo de autenticación

2. `domain/entities/User.ts`:
   - Se eliminó `UserRole` (redundante con `AuthKind`)
   - Se importa `AuthKind` desde `domain/types/auth`
   - `UserProps.kind` y getter `kind()` ahora usan `AuthKind`

3. `application/ports/ITokenService.ts`:
   - `TokenPayload.kind` cambió de `string` a `AuthKind`
   - Se importa `AuthKind` desde `domain/types/auth`

4. `interface-adapters/types/express.d.ts`:
   - Se eliminó el union inline `'Admin' | 'Empleado' | 'Registrado' | 'NoRegistrado'`
   - Ahora importa `AuthKind` desde `domain/types/auth`

5. `interface-adapters/middlewares/auth.middleware.ts`:
   - Se eliminó el tipo `AuthRequest` (redundante con `express.d.ts`)
   - Las funciones ahora usan `req.user` directamente (ya tipado por `express.d.ts`)
   - Se eliminaron los casts `as AuthKind` (innecesarios con el tipado fuerte)

6. `AppointmentController.ts` y `BarberController.ts`:
   - Se eliminaron los imports de `AuthRequest` y los casts `as AuthRequest`
   - Ahora usan `req.user` directamente

7. `IUserRepository.ts`:
   - Se agregó `findById(id: string): Promise<User | null>`

8. `MongoUserRepository.ts`:
   - Se implementó `findById` que busca en Barber y RegisteredClient

9. Se creó `GET /api/users/me`:
   - `application/use-cases/user/GetCurrentUserUseCase.ts`
   - `interface-adapters/controllers/user/UserController.ts`
   - `interface-adapters/routes/user.routes.ts`
   - `wiring/user.ts`
   - Montado en `app.ts` como `/api/users`

10. `frontend-barber/src/utils/token.ts`:
    - `TokenUser.kind` cambió de `string` a `'Admin' | 'Empleado' | 'Registrado'`

11. `frontend-barber/src/types/auth.ts`:
    - Se agregó el tipo `User` con campos: `id`, `name`, `lastname`, `email`, `phone`, `kind`, `photoUrl?`

12. `frontend-barber/src/store/slices/authSlice.ts`:
    - `authSlice.user` cambió de `Professional | null` a `User | null`
    - `fetchUserProfile` ahora llama a `authService.getProfile()` (GET `/api/users/me`) en vez de `professionalService.getById()`

13. `frontend-barber/src/services/auth.service.ts`:
    - Se agregó `getProfile()` que llama a GET `/api/users/me`

14. `frontend-barber/src/pages/admin/AdminProfilePage/index.tsx`:
    - Se agregó cast `as Professional | null` al leer el usuario del store (solo se renderiza en contexto Admin/Empleado)

15. `frontend-barber/src/pages/admin/ProfessionalsPage/index.tsx`:
    - Se agregó cast `as Professional | null` (idem)

**Consecuencias:**
- Los tipos de rol están alineados en toda la codebase
- `NoRegistrado` ya no contamina los tipos de autenticación
- El endpoint `/api/users/me` unifica la obtención del perfil para cualquier tipo de usuario logueado
- Los tests existentes se actualizaron (agregar `findById` a mocks de `IUserRepository`)
- Backend: 36 test suites, 237 tests passing
- Frontend: 20 test files, 119 tests passing
