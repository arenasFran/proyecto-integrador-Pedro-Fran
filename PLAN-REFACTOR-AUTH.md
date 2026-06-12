# Plan de Refactor — Módulo de Autenticación

> **Origen:** Auditoría Funcional Backend (`AUDITORIA-FUNCIONAL-BACKEND.md`)  
> **Backlog:** 12 cards en `lst-auth` del tablero Trello  
> **Objetivo:** Eliminar los 12 hallazgos de autenticación en orden de criticidad y dependencia técnica

---

## Tabla de Contenidos

1. [Fase 0 — Correcciones Críticas Inmediatas](#fase-0--correcciones-críticas-inmediatas)
2. [Fase 1 — Arquitectura de Sesiones](#fase-1--arquitectura-de-sesiones)
3. [Fase 2 — Resiliencia de Canales de Comunicación](#fase-2--resiliencia-de-canales-de-comunicación)
4. [Fase 3 — Políticas de 2FA](#fase-3--políticas-de-2fa)
5. [Fase 4 — Google Login y Calidad de Datos](#fase-4--google-login-y-calidad-de-datos)
6. [Fase 5 — Housekeeping y Deuda Técnica](#fase-5--housekeeping-y-deuda-técnica)
7. [Resumen de Esfuerzo](#resumen-de-esfuerzo)
8. [Matriz de Dependencias](#matriz-de-dependencias)

---

## Fase 0 — Correcciones Críticas Inmediatas

### 0.1 Eliminar `TEST_2FA_CODE` bypass de seguridad

| Atributo       | Valor                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **Card**       | `[DEBT][PEDRO S9][SEC] auth/ — Eliminar TEST_2FA_CODE bypass de seguridad`                             |
| **Estimación** | 1h                                                                                                     |
| **Criticidad** | 🔴 Crítico                                                                                             |
| **Archivos**   | `infrastructure/services/RandomGenerator.ts`, `application/use-cases/auth/SendTwoFactorCodeUseCase.ts` |

#### Diagnóstico

`RandomGenerator.ts` tiene una guarda condicional:

```
if (process.env.TEST_2FA_CODE) return process.env.TEST_2FA_CODE
```

Esto reemplaza la generación aleatoria de 6 dígitos por un valor fijo controlado por variable de entorno. Cualquier entorno que tenga esta variable seteada (error humano, config maliciosa, contaminación CI/CD) permite bypassear el 2FA por completo.

#### Acciones de refactor

1. **Eliminar la guarda condicional** en `RandomGenerator.ts`. El generador debe producir siempre un código aleatorio.
2. **Extraer la generación de código 2FA** a una interfaz (`ICodeGenerator`) con implementación concreta (`CryptoRandomGenerator`) y una implementación mock para tests que reciba el código por inyección de dependencias.
3. **Actualizar los tests** que dependían de `TEST_2FA_CODE` para usar la implementación mock inyectada.

#### Validación

- `POST /auth/2fa/send` siempre envía un código diferente.
- Sin la variable de entorno, ningún código es predecible.
- Tests usan mock con código controlado sin ensuciar el entorno global.

---

### 0.2 Validar variables de entorno críticas al startup

| Atributo       | Valor                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Card**       | `[DEBT][PEDRO S9][FIX] bootstrap/ — Validar variables de entorno críticas al startup (2h)` |
| **Estimación** | 2h                                                                                         |
| **Criticidad** | 🟠 Alto                                                                                    |
| **Archivos**   | `wiring/auth.ts`, `infrastructure/services/JwtTokenService.ts`, bootstrap del servidor     |

#### Diagnóstico

`JwtTokenService` usa `process.env.JWT_SECRET as string` sin verificar que el valor exista. Si la variable no está definida, el servidor arranca pero los JWT se firman con `undefined`, generando fallos en runtime en lugar de fallar rápido al iniciar.

Actualmente no hay un punto centralizado de validación de variables de entorno.

#### Acciones de refactor

1. **Crear una función `validateEnv()`** en el bootstrap que se ejecute antes de iniciar el servidor.
2. **Definir una lista de variables críticas** con sus validaciones:
   - `JWT_SECRET`: string no vacío, mínimo 32 caracteres
   - `MONGO_URI` / `MONGODB_URI`: string con formato URI válido — además resolver INC-04 (unificar nombre)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: validar existencia si el servicio de email está habilitado
   - `RESET_TOKEN_EXPIRATION_MIN`: número entero positivo (con default)
3. **Hacer fail-fast**: si alguna variable crítica falta o es inválida, el proceso debe abortar con `process.exit(1)` mostrando un mensaje claro de qué variable falta.
4. **Tipar las variables de entorno** mediante un objeto `Config` tipado que reemplace los accesos directos a `process.env` en todo el código.

#### Validación

- Servidor no arranca si falta `JWT_SECRET`.
- Mensaje de error claro indica exactamente qué variable falta.
- Tests de integración validan el comportamiento esperado.

---

## Fase 1 — Arquitectura de Sesiones

### 1.1 Implementar refresh tokens JWT

| Atributo       | Valor                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **Card**       | `[DEBT][PEDRO S9][FEAT] auth/ — Implementar refresh tokens JWT (5h)`     |
| **Estimación** | 5h                                                                       |
| **Criticidad** | 🔴 Crítico                                                               |
| **Archivos**   | `infrastructure/services/JwtTokenService.ts`, nuevas rutas/controladores |

#### Diagnóstico

El sistema solo emite access tokens JWT. No hay refresh tokens, lo que fuerza a elegir entre JWTs de larga duración (mayor riesgo si se roban) o JWTs de corta duración (re-login constante, mala UX).

Actualmente:

- `JwtTokenService` solo tiene `sign(payload)` y `verify(token)`.
- No hay almacenamiento de sesiones activas.
- No hay endpoint para renovar tokens.

#### Acciones de refactor

1. **Extender `JwtTokenService`**:
   - `signAccessToken(payload)`: access token con expiración corta (ej. 15 min).
   - `signRefreshToken(payload)`: refresh token con expiración larga (ej. 7 días).
   - `verifyAccessToken(token)`: verifica access token.
   - `verifyRefreshToken(token)`: verifica refresh token y valida que no esté revocado.

2. **Crear repositorio de refresh tokens**:
   - Almacenar refresh tokens en MongoDB (colección `refresh_tokens`).
   - Campos: `tokenHash` (SHA-256), `userId`, `expiresAt`, `revoked` (boolean).
   - Permitir revocación individual o masiva por `userId`.

3. **Crear `RefreshTokenUseCase`**:
   - Recibe refresh token, verifica hash contra BD, verifica expiración, verifica no revocado.
   - Si válido: emite nuevo par (access + refresh) y revoca el refresh anterior (rotación).
   - Si inválido/expirado/revocado: responde 401 y fuerza re-login.

4. **Crear endpoint `POST /auth/refresh`**:
   - Recibe `{ refreshToken: string }`.
   - Sin autenticación JWT (el refresh token es la credencial).

5. **Actualizar login flows**:
   - Login local: emitir access + refresh token.
   - Login con Google: emitir access + refresh token.
   - Verify 2FA: emitir access + refresh token.

#### Validación

- Access token expira en 15 min, refresh token en 7 días.
- Refrescar un token revoca el anterior (rotación).
- Revocar todos los refresh de un usuario fuerza re-login.
- Endpoint `/auth/refresh` responde 401 si el token fue ya usado.

---

### 1.2 Agregar claims `aud` / `iss` al JWT

| Atributo       | Valor                                                              |
| -------------- | ------------------------------------------------------------------ |
| **Card**       | `[DEBT][PEDRO S9][SEC] auth/ — Agregar claims aud/iss al JWT (1h)` |
| **Estimación** | 1h                                                                 |
| **Criticidad** | 🟢 Bajo                                                            |
| **Archivos**   | `infrastructure/services/JwtTokenService.ts`                       |

#### Diagnóstico

Los JWT actuales solo contienen `{ id, email, kind }`. No tienen claims estándar como `aud` (audiencia), `iss` (emisor), `iat` (emitido en). Esto permite que un token emitido por este servicio sea aceptado por otro servicio que comparta el mismo `JWT_SECRET`.

#### Acciones de refactor

1. **Agregar claims estándar al payload del JWT**:
   - `iss`: identificar al emisor (ej. `'barberia-api'`), configurable vía variable de entorno.
   - `aud`: identificar la audiencia (ej. `'barberia-client'`), configurable vía variable de entorno.
   - `iat`: timestamp de emisión.
   - `exp`: ya existe por el `expiresIn` de la librería JWT.

2. **Validar claims al verificar**:
   - `verify` debe rechazar tokens cuyo `iss` o `aud` no coincidan con los valores esperados.
   - Esto previene ataques de "confused deputy" en el futuro.

3. **Actualizar tests** para incluir los nuevos claims.

#### Validación

- Token firmado incluye `iss`, `aud`, `iat`.
- Token con `iss` incorrecto es rechazado aunque la firma sea válida.
- Tests unitarios verifican claims.

---

## Fase 2 — Resiliencia de Canales de Comunicación

### 2.1 Propagar errores de envío de email en 2FA y reset password

| Atributo       | Valor                                                                              |
| -------------- | ---------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][FIX] auth/ — Propagar errores de envío de email (2h)`            |
| **Estimación** | 2h                                                                                 |
| **Criticidad** | 🟠 Alto                                                                            |
| **Archivos**   | `SendTwoFactorCodeUseCase.ts`, `RequestPasswordResetUseCase.ts`, `EmailService.ts` |

#### Diagnóstico

Ambos use cases tienen:

```
this.emailService.sendMail(...).catch(err => console.error(err))
```

El usuario recibe `200 OK` aunque el email nunca se despachó. El sistema no tiene manera de notificar al usuario ni al operador del fallo.

#### Acciones de refactor

1. **Eliminar el catch silencioso** en ambos use cases.
2. **Agregar un umbral de tolerancia**:
   - Si el email falla, el use case debe lanzar `AppError` con código 500 y mensaje "Error al enviar el email. Intente nuevamente."
   - Opcional: implementar reintentos (1-2 retry con backoff) antes de fallar.
3. **No almacenar el código/token en BD si el email falló**: el código o token debe persistirse solo después de confirmar que el email se encoló correctamente (o se envió).
4. **Agregar log estructurado** del error (con `logger.error` en lugar de `console.error`) incluyendo `userId`, tipo de email, y error.
5. **Evaluar encolamiento asíncrono**: si el volumen lo justifica, implementar una cola de emails (bull/rabbit) que desacople el envío del request y permita reintentos programáticos.

#### Validación

- Si SMTP falla, el endpoint responde 500 y no persiste el código/token.
- Si SMTP funciona, el código/token se persiste y el usuario recibe el email.
- Logs estructurados capturan cada fallo con contexto suficiente para debugging.

---

### 2.2 Segregar rate limiting: login vs register/reset

| Atributo       | Valor                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][SEC] auth/ — Segregar rate limiting (2h)`         |
| **Estimación** | 2h                                                                  |
| **Criticidad** | 🟠 Alto                                                             |
| **Archivos**   | `app.ts` o donde se configura `authLimiter`, rutas `auth.routes.ts` |

#### Diagnóstico

Un solo `authLimiter` (10 requests / 15 min) se aplica a todo el router `/auth/*`. Un ataque de fuerza bruta sobre login también bloquea register y reset. Al revés, un pico de registros puede bloquear login.

#### Acciones de refactor

1. **Crear rate limiters específicos**:
   - `loginLimiter`: 5 requests / 15 min por IP (más restrictivo, principal vector de ataque).
   - `registerLimiter`: 10 requests / 15 min (permite onboarding pero evita registros masivos automatizados).
   - `resetLimiter`: 3 requests / 15 min por email (más restrictivo para evitar abuso).
   - `twoFALimiter`: 5 requests / 15 min por email (evita inundación de códigos SMS/email).
   - `googleLimiter`: 5 requests / 15 min por IP (mitiga ataques de fuerza bruta con tokens).

2. **Aplicar cada limiter a su ruta específica** en lugar de un limiter global sobre todo el router.

3. **Configurar límites vía variables de entorno** con defaults seguros.

4. **Agregar header de respuesta** con información de rate limit (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

5. **Evaluar rate limit por email** (no solo por IP) para login y reset, para prevenir ataques distribuidos.

#### Validación

- Login bloqueado no afecta capacidad de registrarse.
- Reset bloqueado por email no bloquea IP completa.
- Headers de rate limit visibles en respuesta.
- Tests de integración validan límites independientes.

---

## Fase 3 — 2FA Obligatorio Universal

> ⚠️ **Decisión de negocio:** 2FA es obligatorio para todo login con **email+password**. El login con **Google Sign-In** no requiere 2FA del sistema (Google ya maneja su propio 2FA). El discriminador es el método de autenticación, no el usuario. No existe opt-out, no existe flag, no existe opción de desactivación.

### 3.1 Convertir 2FA en paso obligatorio del login local

| Atributo       | Valor                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][FEAT] auth/ — Implementar flag twoFactorEnabled por usuario (3h)`                       |
| **Estimación** | 3h                                                                                                        |
| **Criticidad** | 🟡 Medio → **🔴 Crítico** (con la política de obligatoriedad universal)                                   |
| **Archivos**   | `LoginUserUseCase.ts`, `SendTwoFactorCodeUseCase.ts`, `VerifyTwoFactorUseCase.ts`, rutas `auth.routes.ts` |

#### Diagnóstico

Hoy el 2FA es opt-in: el usuario puede llamar a `/auth/2fa/send` de forma voluntaria, y el login local (`POST /auth/login`) emite JWT directamente sin exigir 2FA. Esto es incompatible con la política de seguridad actual.

#### Acciones de refactor

1. **Modificar `POST /auth/login` (login local)**:
   - Eliminar la emisión directa de JWT tras validar credenciales.
   - Después de verificar email+password, el use case debe:
     - Generar y almacenar un código 2FA (hash SHA-256 + expiración 5 min en el usuario).
     - Enviar el código por email (con manejo de error de Fase 2.1).
     - Responder `{ requiresTwoFactor: true }`.
   - Este endpoint pasa de ser terminal a ser un paso intermedio obligatorio.

2. **`POST /auth/2fa/verify` se convierte en el paso final obligatorio del login local**:
   - Ya implementa verificación y emisión de JWT.
   - Asegurar que limpia el código post-verificación (ya lo hace).
   - Verificar que el código no esté expirado (ya lo hace).
   - **No requiere cambios mayores**, solo confirmar que funciona como paso final.

3. **`POST /auth/google` (Google Sign-In) NO se modifica**:
   - Sigue emitiendo JWT directamente, como hoy.
   - Google es su propio proveedor de identidad con su propio 2FA.
   - No se le exige 2FA del sistema.
   - No se modifica `AuthenticateWithGoogleUseCase`.

4. **Usuarios Google-only no pueden crear contraseña local**:
   - Eliminar cualquier flujo que permita a un usuario de Google setear una contraseña.
   - Si no existe tal flujo hoy, asegurar que no se introduzca en el futuro.

5. **`POST /auth/2fa/send` queda como está**:
   - Ya requiere email+password como paso previo.
   - Un usuario Google-only no tiene `passwordHash`, por lo que `bcrypt.compare` falla.
   - Estructuralmente no pueden iniciar el flujo — no se necesita bloqueo explícito adicional.

6. **NO crear flag `twoFactorEnabled` en el modelo**:
   - No hay lógica condicional por usuario.
   - No hay endpoint para activar/desactivar.
   - El discriminador es el método de login (`authProvider`), no un flag.
   - El modelo de usuario no se modifica.

#### Impacto en otras fases

| Fase                         | Impacto                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fase 0.1** (TEST_2FA_CODE) | Más crítico aún: si el bypass existe y 2FA es obligatorio para login local, cualquiera que conozca la env var bypassea la única barrera de autenticación por contraseña                      |
| **Fase 2.1** (errores email) | Si el email de 2FA falla, el usuario con password queda completamente bloqueado sin poder loguearse. Ya no es un "intente de nuevo", es un bloqueo total para login local. Prioridad máxima. |
| **Fase 2.2** (rate limiting) | Rate limit para `/auth/2fa/send` debe ser más alto que para login, porque cada login exitoso genera un 2FA send                                                                              |
| **Fase 4.3** (lastLogin)     | El `lastLoginAt` debe actualizarse en verify 2FA para login local, y en login Google para usuarios Google                                                                                    |

#### Validación

- `POST /auth/login` jamás emite JWT. Siempre responde `requiresTwoFactor: true`.
- `POST /auth/google` emite JWT directamente (sin 2FA del sistema).
- `POST /auth/2fa/verify` es el único endpoint que completa el login local y emite JWT.
- Un usuario Google-only no puede llamar a `/auth/2fa/send` (no tiene contraseña).
- No existe flag `twoFactorEnabled` ni en modelo ni en código.
- No existe endpoint para activar/desactivar 2FA — es inherente al método de login.

---

## Fase 4 — Google Login y Calidad de Datos

### 4.1 Manejar Google login cuando email ya existe como cuenta local

| Atributo       | Valor                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][FIX] auth/ — Manejar Google login cuando email ya existe como cuenta local (2h)` |
| **Estimación** | 2h                                                                                                 |
| **Criticidad** | 🟡 Medio                                                                                           |
| **Archivos**   | `AuthenticateWithGoogleUseCase.ts`                                                                 |

#### Diagnóstico

Cuando un usuario con cuenta local (email+password) intenta loguearse con Google, el sistema rechaza con 401 y mensaje confuso. No ofrece vinculación de cuentas.

Actualmente en `AuthenticateWithGoogleUseCase.ts`:

- Si el email existe y NO es Admin/Empleado, se rechaza si tiene `googleId` diferente.
- Si el email existe y NO tiene `googleId`, el mensaje puede ser confuso.

#### Acciones de refactor

1. **Detectar el caso de cuenta local sin Google vinculado**: si el usuario existe con `authProvider: 'local'` y el email coincide, responder con un código específico (ej. `ACCOUNT_EXISTS_LOCAL`) y un mensaje claro.

2. **Implementar flujo de vinculación**:
   - Si el usuario existe como local y el token de Google es válido, solicitar al frontend que envíe la contraseña local para verificar identidad.
   - Si la contraseña es correcta, vincular Google ID y cambiar `authProvider` a ambos (`local|google`).
   - Si la contraseña es incorrecta, responder error.

3. **Opción simplificada (si no se desea vinculación)**: mejorar el mensaje de error para que sea claro: "Ya existe una cuenta con este email registrada con contraseña. Inicie sesión con su contraseña o use la opción 'Olvidé mi contraseña'."

#### Validación

- Usuario local recibe mensaje claro y puede vincular Google autenticándose con password.
- Usuario con Google vinculado previamente puede loguearse normalmente.
- Usuario local sin Google vinculado no puede loguearse con Google (no hay cuenta híbrida automática).

---

### 4.2 Corregir placeholders en Google login

| Atributo       | Valor                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][FIX] auth/ — Corregir placeholders name/lastname Google login (1h)` |
| **Estimación** | 1h                                                                                    |
| **Criticidad** | 🟢 Bajo                                                                               |
| **Archivos**   | `AuthenticateWithGoogleUseCase.ts`                                                    |

#### Diagnóstico

Asignación actual: `payload.givenName || payload.name || 'Usuario'` y `payload.familyName || '-'`. Datos basura entran al sistema cuando Google no provee ciertos campos del perfil.

#### Acciones de refactor

1. **Cambiar lógica de asignación de nombre**:
   - Priorizar `payload.name` (display name completo) sobre `payload.givenName`.
   - Si no hay nombre, forzar al usuario a completarlo: responder con `{ requiresProfileCompletion: true, token: partialToken }` y redirigir a un formulario de completar perfil.
   - Opción simplificada si no se quiere flujo de completar perfil: usar `payload.name` y si es `undefined`, pedir nombre en la request de Google login.

2. **Cambiar lógica de apellido**:
   - Si no hay `familyName`, dejarlo como `undefined` (nullable) o string vacío en lugar de `'-'`.

3. **Actualizar validaciones del modelo** para aceptar `lastname` opcional.

#### Validación

- Usuario registrado con Google completo tiene su nombre real.
- Usuario registrado con Google sin nombre no tiene placeholders en el sistema.
- Perfiles sin datos requeridos gatillan flujo de completar perfil.

---

### 4.3 Registrar último login del usuario

| Atributo       | Valor                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][FEAT] auth/ — Registrar último login del usuario (2h)`                                                          |
| **Estimación** | 2h                                                                                                                                |
| **Criticidad** | 🟢 Bajo                                                                                                                           |
| **Archivos**   | `domain/entities/User.ts`, `LoginUserUseCase.ts`, `AuthenticateWithGoogleUseCase.ts`, `VerifyTwoFactorUseCase.ts`, modelo MongoDB |

#### Diagnóstico

No hay registro de `lastLoginAt` en el modelo de usuario. No se puede auditar accesos, detectar actividad sospechosa, ni mostrar al usuario su última sesión.

#### Acciones de refactor

1. **Agregar campo `lastLoginAt: Date | null`** al modelo de usuario:
   - Entity `User`: agregar propiedad.
   - Schema MongoDB: agregar campo.
   - DTO de respuesta `/auth/me`: incluirlo.

2. **Actualizar `lastLoginAt` en todos los flujos de login**:
   - `LoginUserUseCase` (login local con contraseña).
   - `AuthenticateWithGoogleUseCase` (login Google).
   - `VerifyTwoFactorUseCase` (verify 2FA exitoso).

3. **Nota importante**: solo actualizar en login exitoso, no en fallos. Esto permite auditoría de accesos legítimos.

#### Validación

- `/auth/me` devuelve `lastLoginAt` con timestamp del último login.
- Login local actualiza la fecha.
- Login Google actualiza la fecha.
- Verify 2FA actualiza la fecha.
- Login fallido no modifica el campo.

---

## Fase 5 — Housekeeping y Deuda Técnica

### 5.1 Eliminar `repeatPassword` del schema Joi o consumirlo en `RegisterUserUseCase`

| Atributo       | Valor                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][FIX] auth/ — Eliminar repeatPassword del schema Joi (1h)`                                             |
| **Estimación** | 1h                                                                                                                      |
| **Criticidad** | 🟢 Bajo                                                                                                                 |
| **Archivos**   | `interface-adapters/validators/auth.validator.ts`, `application/use-cases/auth/RegisterUserUseCase.ts`, DTO de registro |

#### Diagnóstico

`registerSchema` valida `repeatPassword` como obligatorio y debe coincidir con `password`. Sin embargo, el `RegisterUserUseCase` recibe un DTO que no contiene `repeatPassword`. La validación existe en Joi pero está desacoplada del use case.

#### Acciones de refactor

**Opción A — Eliminar del schema (recomendada si se valida en frontend):**

1. Eliminar `repeatPassword` del schema Joi.
2. Documentar que la validación de coincidencia es responsabilidad del frontend.

**Opción B — Elevar al use case (si se quiere mantener validation server-side):**

1. Agregar `repeatPassword` al DTO de entrada (`RegisterUserDTO`).
2. Agregar validación explícita en el `RegisterUserUseCase`: si `password !== repeatPassword`, lanzar error.
3. Mantener la validación Joi como defensa adicional.

**Recomendación:** Opción B. La validación de coincidencia de contraseñas debe estar en el servidor como defensa en profundidad.

#### Validación

- Registro con `password` y `repeatPassword` diferentes responde 400.
- La lógica está centralizada en el use case, no solo en Joi.
- Tests cubren el caso de mismatch.

---

### 5.2 Limpiar `authProvider` condicional del schema Joi de registro

| Atributo       | Valor                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Card**       | `[DEBT][PEDRO S9][REFACTOR] auth/ — Limpiar authProvider condicional del schema Joi (1h)` |
| **Estimación** | 1h                                                                                        |
| **Criticidad** | 🟢 Bajo                                                                                   |
| **Archivos**   | `interface-adapters/validators/auth.validator.ts`                                         |

#### Diagnóstico

El schema Joi `registerSchema` tiene una validación condicional `Joi.when('authProvider', ...)` que hace opcional `password` si `authProvider === 'google'`. Esto es código muerto: el DTO de registro no incluye `authProvider` y el use case hardcodea `'local'`. La condición nunca se evalúa en el flujo real.

#### Acciones de refactor

1. **Eliminar la validación condicional** del schema Joi.
2. **Simplificar el schema** a solo los campos reales del registro: `email`, `password`, `name`, `lastname`, `phone`.
3. Si se desea mantener la validación de `repeatPassword` (ver 5.1), agregarlo aquí.

#### Validación

- Schema Joi solo valida campos reales del registro.
- Tests de registro siguen funcionando sin cambios.
- No hay reglas condicionales muertas en el validador.

---
