# ADR-007: HMAC-SHA256 con secret para hash de refresh tokens

## Contexto

El sistema de refresh tokens almacena un hash del token en MongoDB para:

1. Validar el token en renovaciones (`RefreshTokenUseCase`)
2. Detectar reuso (rotación) y revocar la sesión

El hash se calculaba con `crypto.createHash('sha256')`, que es una función hash pura y **determinística**: dos refresh tokens idénticos producen el mismo hash. Esto abre un vector de ataque:

- Si un atacante obtiene acceso a la base de datos (hashes almacenados), puede realizar un ataque de **diccionario o tabla rainbow** contra los hashes.
- Aunque los refresh tokens JWT tienen 256+ bits de entropía, usar una función hash sin clave pierde la oportunidad de añadir una capa de defensa en profundidad.

Además, el mismo `HashService.sha256` se usa para hashear:
- Códigos 2FA (almacenados en el documento del usuario)
- Tokens de reseteo de password (almacenados en colección `PasswordReset`)

Todos estos casos se benefician de un HMAC.

## Decisión

Se reemplaza `crypto.createHash('sha256')` por `crypto.createHmac('sha256', secret)` en `HashService`.

```typescript
sha256(input: string): string {
  const secret = getConfig().refreshHashSecret;
  return crypto.createHmac('sha256', secret).update(input).digest('hex');
}
```

### Gestión del secret

**Inicialmente** `REFRESH_HASH_SECRET` se definió como `optionalEnv` con default `''`, lo que permitía arrancar sin configurarlo. Sin embargo, un secret HMAC vacío anula toda la protección: `createHmac('sha256', '')` produce el mismo output que `createHash('sha256')`.

**Posteriormente** (ADR-006/C1) se corrigió esta brecha cambiando a `requireEnv`:

- `REFRESH_HASH_SECRET` ahora es una variable **requerida**.
- Se agregó a `requiredVars` en `env.ts`.
- El servidor **no arranca** si no está configurada.
- Cada despliegue debe generar un secret único y fuerte (recomendado: `openssl rand -hex 64`).

### Impacto en datos existentes

Los hashes existentes en MongoDB fueron generados con SHA-256 puro. Al cambiar a HMAC, los tokens emitidos antes del deploy dejarán de validarse. **Esto es aceptable** porque:

- Los refresh tokens tienen expiración de 7 días.
- La rotación invalida el token anterior al renovar.
- No hay migración de datos necesaria.

## Consecuencias

- **Positivo**: Los hashes almacenados ya no son determinísticos — un atacante con acceso a la BD no puede precomputar hashes.
- **Positivo**: Defensa en profundidad contra rainbow tables.
- **Positivo**: Misma interfaz `IHashService`, cambio localizado a una línea.
- **Positivo**: El servidor no arranca sin el secret, eliminando el riesgo de despliegue inseguro.
- **Negativo**: Tokens activos emitidos antes del deploy dejarán de funcionar al renovar (rotación natural en 7 días).
- **Negativo**: Dependencia de una variable de entorno adicional obligatoria (`REFRESH_HASH_SECRET`).

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| SHA-256 + salt aleatorio por token | Requiere almacenar el salt, no hay ventaja frente a HMAC con secret fijo |
| bcrypt/scrypt para hash de tokens | Costoso innecesariamente para tokens con alta entropía; HMAC es suficiente |
| No hacer nada (mantener SHA-256 puro) | Riesgo de seguridad evitable con un cambio mínimo |
| `optionalEnv` con default vacío | Permite despliegue inseguro sin que el operador se dé cuenta (brecha C1) |

## Estado

Aceptada. Modificada para requerir el secret (C1).
