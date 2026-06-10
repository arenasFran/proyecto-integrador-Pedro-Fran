# ADR-003: Lockout de cuenta por intentos fallidos en 2FA y reset-password

## Contexto

Los endpoints de verificación 2FA y reset-password no tenían límite de intentos. Un atacante podía:

- Probar combinaciones de código 2FA indefinidamente (código de 6 dígitos = 1M combinaciones)
- Probar tokens de reset-password sin restricción

Además, el reset-password usaba el token para identificar al usuario, pero no verificaba el email del usuario, permitiendo que un atacante con acceso al token pero sin conocer el email pudiera intentar resetear la contraseña.

## Decisión

Se implementa un sistema de lockout con las siguientes reglas:

### Dominio (User entity)

Se agregan 4 campos a `User`:

- `twoFactorFailedAttempts: number` — contador de fallos 2FA
- `twoFactorLockedUntil: Date | null` — fin del bloqueo 2FA
- `resetFailedAttempts: number` — contador de fallos reset-password
- `resetLockedUntil: Date | null` — fin del bloqueo reset-password

### Umbrales

- **Máximo de intentos fallidos**: 5
- **Duración del bloqueo**: 15 minutos
- El contador se resetea a 0 en cada intento exitoso

### Repositorio

Se agrega el método `updateUserSecurity(userId, update)` a `IUserRepository` que permite actualizar estos campos de forma granular mediante el tipo `UserSecurityUpdate`.

### Reset-password

`ResetPasswordUseCase` ahora:
1. Recibe `IDateTimeProvider` para comparar fechas
2. Busca al usuario por `email` (requerido en el DTO) para verificar bloqueo antes de consumir el token
3. Incrementa `resetFailedAttempts` cuando el token es inválido
4. Bloquea al alcanzar el límite

## Consecuencias

- **Positivo**: Los ataques de fuerza bruta sobre código 2FA se vuelven inviables (máximo 5 intentos cada 15 minutos).
- **Positivo**: El lockout de reset-password impide abusar de tokens inválidos.
- **Negativo**: Los campos de lockout persisten en MongoDB, agregando complejidad a los mappers y modelos.
- **Negativo**: Los tests existentes requerían `updateUserSecurity` y `constantTimeEqual` en los mocks.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| Rate limiting global (express-rate-limit) | Afecta a usuarios legítimos por IP compartida; no distingue entre usuarios |
| Bloqueo solo en memoria (Redis, Map) | Se pierde al reiniciar el servidor; con múltiples réplicas no funciona |
| Captcha después de N intentos | Dependencia externa; no soluciona el problema de raíz |

## Estado

Aceptada.
