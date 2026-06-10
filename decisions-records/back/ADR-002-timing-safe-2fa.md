# ADR-002: Protección contra timing attacks en verificación 2FA

## Contexto

El código 2FA se almacena hasheado con SHA-256 en el usuario (`codeHash`). Al verificarlo, se comparaba el hash del código ingresado con el almacenado usando `===`, que cortocircuita al primer carácter diferente, filtrando información vía tiempo de respuesta.

Un atacante podría —con miles de peticiones— deducir el hash carácter por carácter midiendo tiempos de respuesta, reduciendo drásticamente el espacio de búsqueda.

## Decisión

Se agrega el método `constantTimeEqual(a: string, b: string): boolean` a `IHashService` e implementa en `HashService` usando `crypto.timingSafeEqual`:

```ts
constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

Se reemplaza la comparación `user.twoFactor.codeHash === hash(input)` en `VerifyTwoFactorUseCase` por:

```ts
this.hashService.constantTimeEqual(user.twoFactor.codeHash, this.hashService.sha256(dto.code))
```

## Consecuencias

- **Positivo**: La comparación toma tiempo constante independientemente del contenido, eliminando el vector de timing attack.
- **Negativo**: `crypto.timingSafeEqual` lanza error si los buffers tienen distinto length; se maneja con un early return antes de la llamada, pero ese early return sí filtra longitud. Se considera aceptable porque la longitud del hash SHA-256 es fija (64 caracteres hex), por lo que un atacante ya conoce la longitud esperada.
- **Negativo**: Dependencia de `Buffer` (Node.js). No portable a entornos no-Node (Edge, deno), pero el proyecto es Express puro.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| `===` | Vulnerable a timing attack |
| `constant-time-compare` (librería npm) | Dependencia externa innecesaria; Node provee la API nativa |
| Double-HMAC | Sobredimensionado para hashes SHA-256 del mismo algoritmo y misma longitud |

## Estado

Aceptada.
