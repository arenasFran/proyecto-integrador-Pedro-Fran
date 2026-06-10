# ADR-010: Flujo 2FA Obligatorio para Login Local

## Contexto

El login original era directo (email + contraseña → JWT). Un requerimiento de seguridad estableció que el 2FA debe ser obligatorio para todos los logins locales. No se permite un bypass ni una opción "recordar dispositivo". El endpoint `/auth/login` directo fue eliminado (commit `7033dd9`).

## Decisión

El flujo de login local tiene exactamente tres pasos sin atajo:

1. `POST /auth/2fa/send` — valida email+password, si es correcto envía un código de 6 dígitos por email (SMTP) y almacena su hash SHA-256 con expiración en el documento del usuario
2. El usuario lee el código en su email
3. `POST /auth/2fa/verify` — valida email+código, si el hash coincide y no expiró, emite access JWT (15 min) y refresh JWT (7 días)

No existe mecanismo de omisión. La antigua variable `TEST_2FA_CODE` fue eliminada (commit `11cbeeb`). La estrategia de captura de código en tests E2E se documentó en ADR-008.

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| 2FA opcional (preferencia del usuario) | El requerimiento de seguridad lo exige obligatorio |
| 2FA basado en TOTP (Google Authenticator) | Requiere que el usuario instale una app; el email no agrega fricción adicional |
| 2FA vía SMS | Costo de gateway SMS; el email ya está presente para recuperación de contraseña |

## Consecuencias

- **Positivo**: Seguridad fuerte de cuenta; la contraseña sola no es suficiente para acceder
- **Positivo**: El factor adicional (email) usa un canal que el usuario ya proveyó en registro
- **Negativo**: El usuario debe tener acceso a su email para login; no hay login offline
- **Negativo**: Demoras en la entrega SMTP pueden frustrar la experiencia de usuario
- **Negativo**: Los tests E2E deben interceptar el código del email (resuelto en ADR-008 con `FakeEmailService`)

## Estado

Aceptada.
