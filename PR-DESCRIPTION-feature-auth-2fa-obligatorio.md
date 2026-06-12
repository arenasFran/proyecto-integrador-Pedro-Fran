# Pull Request — `feature/auth-2fa-obligatorio`

> **Base:** `develop`  
> **Head:** `feature/auth-2fa-obligatorio`  
> **Commits:** 36 (desde merge base `16aebbc`)  
> **Archivos modificados:** 101  
> **Líneas agregadas:** +3,891  
> **Líneas eliminadas:** -451

---

## 📋 Resumen Ejecutivo

Esta PR consolida la **seguridad del módulo de autenticación**. Combina mejoras de seguridad crítica (C1–C3, A3, M3, M5) con la migración a una configuración tipada centralizada, la eliminación de type-casts inseguros y la documentación de decisiones arquitectónicas mediante ADRs.

---

## 🏗️ Cambios por Capa

### 1. Backend — Infraestructura y Configuración

#### 1.1 Config tipada centralizada (`src/infrastructure/config/env.ts`)

- Nuevo tipo `Config` con tipado estricto para todas las variables de entorno
- Función `validateEnv()` que se ejecuta en startup y corta la app si faltan variables críticas
- `getConfig()` como singleton lazy para acceso global tipado
- Variables agrupadas por dominio: `server`, `jwt`, `database`, `smtp`, `oauth`, `rateLimit`
- **Variables requeridas:** `JWT_SECRET`, `MONGO_URI`, `REFRESH_HASH_SECRET`
- `CORS_ORIGIN` se lee desde configuración en lugar de estar hardcodeada

#### 1.2 Rate limiting segregado por ruta (`src/app.ts`)

- 6 rate limiters independientes: `login`, `register`, `reset`, `twoFA`, `google`, `refresh`
- Ventanas y límites configurables vía variables de entorno
- Cada uno con mensaje de error específico en español
- Aplicados sobre rutas específicas (`/auth/2fa/send`, `/auth/google`, etc.)

#### 1.3 Global error handler

- Middleware Express al final de la cadena que captura errores no manejados
- Responde con `500` y mensaje genérico (`"Error interno del servidor"`)
- Loggea el error real en `console.error`

#### 1.4 Mailer lazy singleton (`src/infrastructure/config/mailer.ts`)

- `NodemailerEmailService` convertido a lazy singleton: la conexión SMTP se crea al primer envío
- Agregado `console.error` con `lastError` en los retry loops de email para mejor debugging
- Evita conexiones fallidas en startup si SMTP no está disponible

---

### 2. Backend — Seguridad (C1, C2, C3, A3)

#### 2.1 [C1] HMAC-SHA256 para hash de Refresh Tokens

- **Archivo:** `src/infrastructure/services/HashService.ts`
- Hash de refresh tokens usando `HMAC-SHA256` con `REFRESH_HASH_SECRET`
- `REFRESH_HASH_SECRET` es requerido en `validateEnv()` — si falta, la app no arranca
- Elimina riesgo de HMAC con secret vacío

#### 2.2 [C2] Timing-safe comparison en 2FA

- **Archivo:** `src/application/use-cases/auth/VerifyTwoFactorUseCase.ts`
- Comparación de códigos 2FA mediante `timingSafeEqual` del `HashService`
- Previene ataques de timing side-channel al verificar códigos

#### 2.3 [C3] Lockout de intentos en 2FA y Reset de contraseña

- **Archivos:** `SendTwoFactorCodeUseCase`, `VerifyTwoFactorUseCase`, `RequestPasswordResetUseCase`, `ResetPasswordUseCase`
- Control de intentos fallidos con bloqueo temporal
- `dateTimeProvider` inyectado para comparaciones temporales
- Email requerido en `reset-password` para identificar la cuenta

#### 2.4 [A3] Política de contraseñas reforzada

- **Archivo:** `src/domain/value-objects/Password.ts`
- Mínimo **8 caracteres**
- Al menos una **mayúscula**
- Al menos una **minúscula**
- Al menos un **número**
- Validación en backend (use case) y frontend (constantes de validación)

---

### 3. Backend — Autenticación y Flujos

#### 3.1 2FA obligatorio en login local

- **Archivo:** `src/application/use-cases/auth/VerifyTwoFactorUseCase.ts`, `SendTwoFactorCodeUseCase.ts`
- El login local ahora requiere 2FA obligatoriamente (es imposible loguearse sin pasar por 2FA)
- Se eliminó el endpoint `/auth/login` redundante (commit `7033dd9`)
- Se eliminó `LoginUserUseCase` y `loginSchema` (commit `bc663de`)
- Flujo: `POST /auth/2fa/send` → `POST /auth/2fa/verify`

#### 3.2 Refresh Tokens JWT con rotación

- **Archivos nuevos:**
  - `src/domain/entities/RefreshToken.ts` — Entidad de dominio
  - `src/domain/repositories/IRefreshTokenRepository.ts` — Puerto
  - `src/application/use-cases/auth/RefreshTokenUseCase.ts` — Caso de uso
  - `src/infrastructure/repositories/mongodb/MongoRefreshTokenRepository.ts` — Implementación MongoDB
  - `src/infrastructure/repositories/mongodb/models/refreshToken.model.ts` — Schema Mongoose
- **Mecanismo:**
  - Cada refresh token tiene un `family` (grupo de rotación)
  - Al refrescar, se invalida el token anterior y se emiten **nuevo access + nuevo refresh**
  - Se almacena hash del refresh token (HMAC-SHA256) en MongoDB
- **Servicio JWT (`JwtTokenService.ts`):**
  - `signRefreshToken()` / `verifyRefreshToken()` — tokens tipo `"refresh"`
  - Validación estricta de `type`, `iss`, `aud`, `iat`
  - Algoritmo forzado `HS256`

#### 3.3 Google Auth — Partial Token y CompleteGoogleProfile

- **Archivo nuevo:** `src/application/use-cases/auth/CompleteGoogleProfileUseCase.ts`
- **Nuevos métodos en JWT:** `signPartialToken(email)` / `verifyPartialToken(token)`
  - Token parcial con expiración de **5 minutos**, tipo `"partial"`
- **Flujo Google login mejorado:**
  1. `POST /auth/google` — si el usuario no existe localmente, responde con `requiresProfileCompletion: true` + `partialToken`
  2. Frontend redirige a formulario de completar perfil
  3. `POST /auth/google/complete-profile` — recibe `partialToken` + datos faltantes, crea la cuenta, emite tokens completos
- Manejo de edge case `ACCOUNT_EXISTS_LOCAL`: usuario existe con contraseña local, no puede usar Google
- Agregado `lastLoginAt` a la entidad `User`

#### 3.4 Register — validación de `repeatPassword`

- **Archivo:** `src/application/use-cases/auth/RegisterUserUseCase.ts`
- El use case ahora valida que `repeatPassword` coincida con `password`

---

### 4. Backend — Type Safety y Code Quality

#### 4.1 Eliminación de type-casts inseguros

| Archivo                           | Cambio                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `MongoBarberRepository.ts`        | Reemplaza `as unknown as` por `IBarberRaw`, `IEmployeeRaw`, `IAdminRaw` + type guards (`isBarberRaw()`) |
| `barber.guards.ts` (nuevo)        | Type guards con validación runtime de campos obligatorios                                               |
| `UserMapper.ts`                   | Elimina casts inseguros en mapeo de documentos                                                          |
| `useFormValidation.ts` (frontend) | Hook genérico `<T extends Record<string, string>>` que acepta subtipos sin coerción                     |

#### 4.2 Eliminación de `LoginUserUseCase`

- Código muerto eliminado junto con `loginSchema` de Joi
- Endpoint `/auth/login` removido

#### 4.3 Eliminación de `TEST_2FA_CODE` y `testCodeOverride`

- `RandomGenerator` ya no expone `testCodeOverride`
- La inyección de dependencias se usa para testing en lugar de variables globales

#### 4.4 `GoogleAuthService` usa `this.clientId`

- Reemplaza acceso directo a `process.env.GOOGLE_CLIENT_ID` por la propiedad de instancia

#### 4.5 `test:coverage` script agregado

- Nuevo script npm para ejecutar tests con cobertura

---

### 5. Backend — Google Sign-In Fixes

#### 5.1 `crossOriginOpenerPolicy` deshabilitado en helmet (`src/app.ts`)

- **Commit:** `36f9cfb`
- **Problema:** Google Identity Services usa `postMessage` entre el popup de Google y la ventana de la app. Helmet por defecto setea `Cross-Origin-Opener-Policy: same-origin`, que **bloquea esa comunicación**, causando el error:
  ```
  Cross-Origin-Opener-Policy policy would block the window.postMessage call.
  ```
- **Solución:** Se deshabilitó `crossOriginOpenerPolicy` en helmet. Es un trade-off aceptado y necesario para el flujo de popup de Google OAuth, práctica estándar en sitios que implementan GIS.

---

## 6. Frontend — Autenticación y Store

#### 6.1 `authSlice.ts` — nuevos thunks y estados

| Thunk                        | Propósito                                            |
| ---------------------------- | ---------------------------------------------------- |
| `sendTwoFactorCodeThunk`     | Envía email con código 2FA                           |
| `verifyTwoFactorCodeThunk`   | Verifica código + login completo                     |
| `googleLoginThunk`           | Login con Google, maneja `requiresProfileCompletion` |
| `completeGoogleProfileThunk` | Completa perfil de Google con partial token          |
| `refreshTokenThunk`          | Refresca tokens automáticamente                      |
| `fetchUserProfile`           | Carga perfil completo del usuario autenticado        |

- **Estados agregados:** `twoFactorPendingEmail`, `requiresProfileCompletion`, `profileCompletionError`, `refreshToken`
- **Logout:** limpia localStorage (`authToken`, `refreshToken`)
- **Refresh automático:** maneja `refreshTokenThunk.fulfilled` actualizando tokens en store y localStorage
- **Manejo de errores:** `ACCOUNT_EXISTS_LOCAL` mapeado a mensaje amigable en español

#### 6.2 `auth.service.ts` — nuevos tipos y endpoints

- `GoogleLoginResponse` como **unión discriminada**: `GoogleLoginSuccessResponse | GoogleRequiresProfileResponse`
- `LoginResponse` con `refreshToken`
- `RefreshTokenResponse`
- `CompleteGoogleProfileData`
- Endpoints: `sendTwoFactorCode`, `verifyTwoFactorCode`, `googleLogin`, `completeGoogleProfile`, `refreshToken`

#### 6.3 Formularios — validaciones mejoradas

- `useFormValidation` genérico eliminó 5 `as unknown as` en RegisterForm, RequestResetForm, ResetPasswordForm, LoginPage
- `RegisterForm` adaptado para nuevo flujo 2FA
- `ResetPasswordForm` requiere email
- Constantes de validación actualizadas con nuevas reglas de password

---

## 7. Testing

#### 7.1 Tests de backend actualizados

| Archivo                                  | Cambio                                                    |
| ---------------------------------------- | --------------------------------------------------------- |
| `auth.routes.test.ts`                    | Nuevos endpoints 2FA, refresh, Google complete profile    |
| `auth.controller.test.ts`                | Refleja eliminación de login directo                      |
| `auth-google.controller.test.ts`         | Nuevos flujos Google                                      |
| `two-factor.controller.test.ts`          | Adaptado a timing-safe                                    |
| `google-auth.usecase.test.ts`            | Casos `requiresProfileCompletion`, `ACCOUNT_EXISTS_LOCAL` |
| `login-user.usecase.test.ts`             | **Eliminado** (LoginUserUseCase eliminado)                |
| `register-user.usecase.test.ts`          | Validación repeatPassword                                 |
| `password-reset.usecase.test.ts`         | Lockout de intentos, email requerido                      |
| `two-factor.usecase.test.ts`             | Timing-safe, lockout                                      |
| `password.test.ts`                       | Nuevas reglas de contraseña                               |
| `create-employee-barber.usecase.test.ts` | Actualizado                                               |
| `update-barber.usecase.test.ts`          | Actualizado                                               |

#### 7.2 Tests de frontend

- `AdminLayout.test.tsx` — nuevo
- `AdminProfilePage/index.test.tsx` — nuevo (114 líneas)
- `ProfessionalsPage/index.test.tsx` — nuevo (165 líneas)
- `authSlice.test.ts` — actualizado con nuevos thunks
- `auth.service.test.ts` — actualizado con nuevos endpoints
- `ResetPasswordForm.test.tsx` — actualizado

---

## 8. ADRs — Architecture Decision Records

Se documentaron **8 decisiones arquitectónicas** en `decisions-records/back/`:

| ADR | Título                             | Decisión clave                                                                        |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| 001 | Lean Cast Strategy                 | Usar Raw interfaces + type guards en lugar de `as unknown as` en repositorios         |
| 002 | Timing-safe 2FA                    | `crypto.timingSafeEqual` para comparación de códigos 2FA                              |
| 003 | Account Lockout                    | Bloqueo temporal tras N intentos fallidos en 2FA y reset                              |
| 004 | Password Strength Policy           | Mínimo 8 chars, mayúscula, minúscula, número                                          |
| 005 | Differentiated Auth Error Messages | Mensajes de error específicos sin revelar existencia de cuentas                       |
| 006 | Partial Token Google Auth          | Token JWT parcial de 5 min para flujo multi-paso de Google                            |
| 007 | HMAC Refresh Token Hash            | HMAC-SHA256 con secret dedicado para hash de refresh tokens                           |
| 008 | E2E 2FA Code Capture Strategy      | FakeEmailService captura código 2FA en memoria para tests E2E sin brecha de seguridad |

---

## 9. E2E Tests — Correcciones Post-Security Review

Se corrigieron todos los tests E2E tras aplicar los cambios de seguridad, dejando **8/8 tests pasando**:

#### 9.1 Placeholder de password desactualizado

- `register.spec.ts`, `full-flow.spec.ts`, `edge-cases.spec.ts` buscaban `'Mínimo 6 caracteres'`
- El placeholder cambió a `'Mínimo 8 caracteres, mayúscula, minúscula y número'` por la nueva política A3
- **Fix:** actualizar string del placeholder en los 3 tests

#### 9.2 Código 2FA no determinista

- Con la eliminación de `TEST_2FA_CODE` y `testCodeOverride`, los tests hardcodeaban `123456` que no coincidía con el código aleatorio generado por `crypto.randomInt()`
- **Solución (ADR-008):** `FakeEmailService` captura el código real del HTML del email en un `Map<email, code>` en memoria. Los tests obtienen el código vía `GET /__test/two-factor-code?email=...` (endpoint solo disponible en test-server)
- El backend sigue generando códigos aleatorios — cero brecha de seguridad

#### 9.3 Interceptor Axios redirigía en 401 antes de mostrar error

- El interceptor de respuesta capturaba cualquier 401 e intentaba refresh + redirección a `/login`
- Para rutas `/auth/` (login, 2FA, register), el 401 es un error de negocio, no de autenticación
- **Fix:** excluir rutas `/auth/` del bloque de refresh automático

#### 9.4 `_id` vs `id` en crud.spec.ts

- El test parseaba `_id` del response de creación pero `BarberResponseDTO` devuelve `id`
- `professionalId` quedaba `undefined`, los `waitForResponse` nunca matcheaban
- **Fix:** usar `id` en lugar de `_id`

#### 9.5 `context.dispose()` antes de `response.json()`

- `getTwoFactorCode()` llamaba `context.dispose()` antes de leer `response.json()`
- Playwright invalida la respuesta al destruir el context → `Response has been disposed`
- **Fix:** leer el body primero, hacer dispose después

---

## 10. Fixes incluidos

| Commit    | Fix                                                                  |
| --------- | -------------------------------------------------------------------- |
| `36f9cfb` | Deshabilitar `crossOriginOpenerPolicy` en helmet para Google Sign-In |
| `85ae35b` | REFRESH_HASH_SECRET requerido para evitar HMAC con secret vacío      |
| `6ed894f` | Usar HMAC-SHA256 con secret para hash de refresh tokens              |
| `6fd13d2` | Alinear respuesta de refresh token con contrato del frontend         |
| `ed08ab2` | Agregar `signPartialToken` y `verifyPartialToken` al servicio JWT    |
| `f5e0bbb` | Reemplazar `as unknown as` por Raw interfaces + type guards          |
| `9ca5216` | Corregir imports relativos en páginas client/admin                   |
| `292f20d` | Eliminar `as unknown as` de forms usando hook genérico               |
| `543efa3` | ADR-008: estrategia de captura de código 2FA para E2E                |
| `e111f49` | FakeEmailService para captura de código 2FA en E2E                   |
| `b240bd7` | Excluir rutas `/auth/` del refresh automático en interceptor Axios   |
| `0015e28` | Corregir tests E2E y agregar helper `getTwoFactorCode`               |

---

## 🔍 Checklist de Revisión

- [ ] `validateEnv()` se ejecuta en startup y corta si faltan variables críticas
- [ ] `REFRESH_HASH_SECRET` es requerido
- [ ] HMAC-SHA256 usado para hash de refresh tokens
- [ ] 2FA es obligatorio en login local
- [ ] Timing-safe comparison en verificación 2FA
- [ ] Lockout de intentos en 2FA y password reset
- [ ] Política de contraseñas: min 8, mayúscula, minúscula, número
- [ ] Rate limiting segregado por ruta
- [ ] Partial tokens para flujo Google multi-paso
- [ ] Refresh tokens con rotación (familia)
- [ ] Sin `as unknown as` en repositorios ni forms
- [ ] Tests actualizados reflejando nuevas reglas
- [ ] ADRs documentan decisiones de seguridad
- [ ] CORS_ORIGIN configurable vía entorno
- [ ] Global error handler captura errores no manejados
