# ADR-023: Interceptor Axios con Cola de Refresh Token

## Contexto

Cuando el access token JWT expira (15 min), cualquier llamada API retorna 401. El frontend necesita refrescar el token automáticamente y reintentar la request fallida. Si múltiples requests concurrentes fallan simultáneamente, no deben disparar refrescos separados.

## Decisión

El archivo `api.ts` implementa un interceptor de respuesta de Axios con el siguiente comportamiento:

1. En 401, verifica que la URL NO sea `/auth/` (para evitar loops en endpoints de auth)
2. Si ya hay un refresh en progreso (`isRefreshing = true`), encola la request fallida en `failedQueue`
3. Si no, setea `isRefreshing = true`, hace POST a `/auth/refresh` con el refresh token almacenado
4. En éxito: actualiza ambos tokens en `localStorage`, reproduce la cola, reintenta la request original
5. En fracaso: limpia tokens, redirige a `/login`, rechaza todas las requests encoladas

### Exclusión de rutas `/auth/`
Las rutas de autenticación (`/auth/login`, `/auth/register`, etc.) se excluyen del interceptor para evitar ciclos de refresh cuando el refresh token mismo falla (fix commit `b240bd7`).

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| RTK Query con `baseQuery` retry | Se eligió thunks sobre RTK Query (ADR-013) |
| Refresh antes de cada request (preemptivo) | Agrega latencia a cada llamada API; el token dura 15 min, no need |
| Redirigir a login en primer 401 | Mala UX; una sesión legítima debe refrescarse silenciosamente |

## Consecuencias

- **Positivo**: Refresh silencioso; el usuario se desloguea solo cuando el refresh token también expiró/revocó
- **Positivo**: 401s concurrentes se encolan y resuelven con un solo refresh
- **Negativo**: Los tokens se almacenan en `localStorage`, vulnerable a XSS
- **Negativo**: El interceptor maneja una cola manual con closures; máquina de estados compleja
- **Negativo**: La exclusión de `/auth/` es un string match hardcodeado; si se agregan nuevos endpoints de auth, deben excluirse también

## Estado

Aceptada.
