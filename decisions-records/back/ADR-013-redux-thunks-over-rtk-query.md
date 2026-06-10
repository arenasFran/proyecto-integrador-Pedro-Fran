# ADR-013: Redux Toolkit con createAsyncThunk sobre RTK Query

## Contexto

El frontend usa Redux Toolkit para manejo de estado global. Se necesitaba decidir cómo hacer llamadas API asíncronas: usando RTK Query (la capa de fetching/caching integrada de RTK) o `createAsyncThunk` (thunks manuales) con una capa de servicios separada.

## Decisión

Se usa `createAsyncThunk` combinado con una capa de servicios separada (ej: `auth.service.ts`, `professional.service.ts`, `appointment.service.ts`), en lugar de RTK Query. El store tiene tres slices:

- `authSlice` — 7 thunks (login 2FA, registro, Google auth, perfil, refresh, recovery)
- `barbersSlice` — 5 thunks (CRUD de barberos)
- `bookingSlice` — 4 thunks (reserva de turnos, temp-lock)

Cada thunk llama a un método de servicio y sus casos `pending/fulfilled/rejected` se manejan en el slice. La instancia Axios (`api.ts`) provee interceptores para inyección de token y rotación automática de refresh token.

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| RTK Query | Preferencia del equipo por control explícito del flujo de datos; RTK Query abstrae demasiado |
| React Query / TanStack Query | Ya se usa Redux; agregar otra librería de fetching sería redundante |
| Plain fetch + useEffect | Sin manejo centralizado de estado loading/error; llevaría a duplicación |

## Consecuencias

- **Positivo**: Control total sobre cuándo y cómo se fetchea y cachea la data; sin invalidación "mágica"
- **Positivo**: La capa de servicios es testeable independientemente de Redux
- **Negativo**: Boilerplate: cada endpoint necesita un thunk, un método de servicio y casos pending/fulfilled/rejected en el slice
- **Negativo**: Sin invalidación automática de caché; datos obsoletos se manejan manualmente (ej: refetch en navegación)
- **Negativo**: No hay deduplicación automática de requests concurrentes (el interceptor Axios maneja race conditions de refresh token, pero no dedup general)

## Estado

Aceptada.
