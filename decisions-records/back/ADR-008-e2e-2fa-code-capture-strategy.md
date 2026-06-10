# ADR-008: Estrategia de captura de código 2FA para tests E2E

## Contexto

El flujo de login local requiere 2FA obligatorio. En el entorno de producción se envía un código de 6 dígitos por email (SMTP). Para los tests E2E se necesita poder completar el paso de verificación 2FA sin depender de un servicio SMTP real.

Originalmente existía `TEST_2FA_CODE` (variable de entorno) que `RandomGenerator` leía para devolver un código determinista, permitiendo que los tests E2E hardcodearan `123456`. Este mecanismo fue eliminado en los commits `a5dc848` y `11cbeeb` por considerarse una brecha de seguridad: cualquier persona con acceso a la máquina del desarrollador podía predecir el código 2FA.

Quedaban tres opciones para resolver los tests E2E sin reintroducir la vulnerabilidad:

| Opción | Descripción |
|---|---|
| A — Mock desde Playwright | Interceptar `/auth/2fa/send` y `/auth/2fa/verify` con respuestas falsas |
| B — FakeEmailService con captura | Reemplazar el servicio de email real por uno que capture el código generado |
| C — Bypass vía env var | Agregar `BYPASS_2FA=true` que omita la verificación |

## Decisión

Se implementa la **Opción B**: `FakeEmailService`, un `IEmailService` que en lugar de enviar emails almacena el código 2FA en un `Map<email, code>` en memoria.

Se expone un endpoint `GET /__test/two-factor-code?email=...` exclusivo del test server para que el test E2E recupere el código real.

### Componentes creados

1. **`FakeEmailService`** (`src/infrastructure/services/FakeEmailService.ts`)
   - Implementa `IEmailService`
   - Extrae el código del HTML del email mediante regex (`/<strong>(\d+)<\/strong>/`)
   - Almacena en un `Map<string, string>` estático keyeado por email en minúsculas
   - Expone `getCode(email)` y `clear()` estáticos

2. **Inyección en wiring** (`src/wiring/auth.ts`)
   - `buildAuthRouter()` ahora acepta `emailService?: IEmailService` opcional
   - Si no se provee, usa `NodemailerEmailService` (comportamiento original)

3. **Endpoint test** (`tests/test-server.ts`)
   - `GET /__test/two-factor-code?email=...` recupera el código capturado
   - Solo montado en el servidor de tests E2E

4. **Helper E2E** (`e2e/helpers/api.ts`)
   - `getTwoFactorCode(email)` realiza la llamada al endpoint test y retorna el código

## Consecuencias

- **Positivo**: El código 2FA sigue siendo generado por `crypto.randomInt()` — no hay predictibilidad ni override.
- **Positivo**: No se modifica el entorno de producción. `FakeEmailService` y el endpoint `__test` existen solo en test-server.ts.
- **Positivo**: El código es efímero — reside en memoria y se descarta al cerrar el test server.
- **Positivo**: Los tests E2E ejercitan el flujo real de 2FA (generación, hash, verificación), no una ruta mockeada.
- **Negativo**: El test depende de un endpoint test-only, lo que agrega un punto de acoplamiento.
- **Negativo**: El `Map` estático no soporta concurrencia entre tests paralelos que usen el mismo email — mitigado porque `buildTestUser()` genera emails únicos.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| A — Mock desde Playwright | No ejercita el flujo real de generación y verificación del backend; el test pasa incluso si el backend de 2FA está roto |
| C — Bypass vía env var | Riesgo de seguridad similar a `TEST_2FA_CODE`: cualquiera con acceso a la máquina podría bypassear 2FA |

## Lecciones aprendidas durante la implementación

### 1. Orden de life-cycle en Playwright `request` context

En la primera versión del helper `getTwoFactorCode()`, se llamaba a `context.dispose()` antes de `response.json()`. Playwright invalida todas las respuestas asociadas al destruir el context, produciendo `apiResponse.json: Response has been disposed`. La corrección fue leer el body (`response.json()`) primero y hacer dispose después.

### 2. `_id` vs `id` en respuesta de creación de barberos

El test `crud.spec.ts` parseaba `createdProfessional._id` del response de creación, pero `BarberResponseDTO` devuelve `id` (mapeado desde `_id` de Mongo en el mapper). Esto causó que `professionalId` quedara `undefined` y los `waitForResponse` posteriores nunca matchearan las URLs reales. Se corrigió usando `id` en lugar de `_id`.

## Estado

Aceptada. Los 8 tests E2E existentes corren exitosamente validando el flujo completo de autenticación con 2FA obligatorio, registro, panel de profesionales y manejo de errores.
