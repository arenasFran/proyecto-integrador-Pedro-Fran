# ADR-006: Token parcial JWT para flujo de registro Google

## Contexto

El flujo de autenticación con Google tiene dos escenarios:

1. **Usuario existente** — se autentica directamente, se generan access + refresh tokens completos.
2. **Usuario nuevo sin nombre** — Google no siempre retorna `name`/`givenName`. El frontend necesita un token para enviar al endpoint `/auth/google/complete-profile` y completar el registro, pero el usuario aún no existe en la base de datos.

El problema original: `AuthenticateWithGoogleUseCase` firmaba un token con `id: ''` usando `signAccessToken`. Luego `verifyAccessToken` rechazaba el `id` vacío con `!id`, rompiendo el flujo. Se intentó un `as unknown as { email: string }` para sortear el type check, lo cual era un parche inseguro.

## Decisión

Se agregan dos métodos específicos al contrato `ITokenService`:

```typescript
signPartialToken(email: string): string;
verifyPartialToken(token: string): { email: string };
```

### Características del token parcial

- **Payload mínimo**: solo `{ email, type: 'partial' }` — sin `id`, `kind` ni reclamaciones de issuer/audience.
- **Expiración corta**: 5 minutos (vs 15m del access token).
- **Sin issuer/audience**: no es un token de sesión, solo un ticket de completitud de perfil.
- **`type: 'partial'`**: discriminador para que `verifyPartialToken` rechace tokens de otros tipos.

### Implementación en `JwtTokenService`

```typescript
signPartialToken(email: string): string {
  return jwt.sign({ email, type: 'partial' }, secret, { expiresIn: '5m', algorithm: 'HS256' });
}

verifyPartialToken(token: string): { email: string } {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { email?: string; type?: string };
  if (!decoded || typeof decoded === 'string' || !decoded.email || decoded.type !== 'partial') {
    throw new Error('Token parcial inválido');
  }
  return { email: decoded.email };
}
```

## Consecuencias

- **Positivo**: `CompleteGoogleProfileUseCase` ahora usa `verifyPartialToken` en lugar de un cast inseguro, eliminando el `as unknown as`.
- **Positivo**: El flujo Google tiene un token con semántica clara y validación específica.
- **Positivo**: `signAccessToken`/`verifyAccessToken` no se contaminan con lógica de casos parciales.
- **Negativo**: Un método más en la interfaz `ITokenService`, todas las implementaciones mock deben incluirlo.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| `signAccessToken` con `id: ''` y `as unknown as` | Inseguro, rompe el type system, `verifyAccessToken` lo rechaza |
| Guard temporal en `verifyAccessToken` para permitir `id` vacío | Debilita la validación del access token real para todos los flujos |
| Endpoint separado sin token (ej. cookie de sesión server-side) | Complejidad innecesaria, el partial token es stateless y simple |

## Estado

Aceptada.
