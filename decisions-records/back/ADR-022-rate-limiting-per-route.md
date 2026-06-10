# ADR-022: Rate Limiting por Ruta con express-rate-limit

## Contexto

Sin rate limiting, un atacante podría: brute-force el código 2FA, probar contraseñas en múltiples cuentas, o agotar la cuota SMTP solicitando resets de contraseña repetidamente. Un limitador global único era insuficiente porque usuarios legítimos golpeando diferentes endpoints interferirían entre sí.

## Decisión

Se configuran seis instancias independientes de `express-rate-limit` en `app.ts`, cada una con su propia ventana y máximo:

| Limitador | Rutas | Max default | Ventana |
|---|---|---|---|
| `loginLimiter` | (implícito via 2FA/send) | 5 | 15 min |
| `registerLimiter` | `/auth/register` | 10 | 15 min |
| `resetLimiter` | `/auth/request-reset`, `/auth/reset-password` | 3 | 15 min |
| `twoFALimiter` | `/auth/2fa/send`, `/auth/2fa/verify` | 5 | 15 min |
| `googleLimiter` | `/auth/google` | 5 | 15 min |
| `refreshLimiter` | `/auth/refresh` | 10 | 15 min |

Cada uno responde con `{ error: "Demasiados..." }` y headers `RateLimit-*` via `standardHeaders: true`. Los valores son configurables via variables de entorno (`RATE_LIMIT_LOGIN_MAX`, etc.).

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Limitador global único (100 req/15min) | Un burst en un endpoint bloquearía endpoints no relacionados |
| Token bucket con Redis | `express-rate-limit` con store en memoria es más simple; Redis agregaría infraestructura |
| Captcha después de N intentos | Dependencia externa; no soluciona el problema de raíz |

## Consecuencias

- **Positivo**: Cada endpoint sensible tiene límites independientes, evitando contaminación cruzada
- **Positivo**: Los valores de rate limit son configurables via env vars sin modificar código
- **Positivo**: Headers `RateLimit-*` permiten al cliente saber su estado de rate limit
- **Negativo**: El store en memoria se resetea al reiniciar el servidor; despliegues multi-réplica necesitarían un store compartido (Redis)
- **Negativo**: IP compartida (NAT): múltiples usuarios desde la misma oficina/campus comparten el mismo contador

## Estado

Aceptada.
