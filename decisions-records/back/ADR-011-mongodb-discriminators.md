# ADR-011: Discriminators de Mongoose para Barbers y Clients

## Contexto

El sistema tiene dos poblaciones de usuarios con campos muy diferentes:

- **Staff** (barberos/administradores): tienen `schedule`, `slotDuration`, `specialties`, `isActive`, y autenticación (email, password)
- **Clientes** (registrados y no registrados): tienen `contactEmail`, y los registrados además tienen autenticación (email, password, googleId, 2FA)

Originalmente se modeló como un solo `User` con clase abstracta (commit `89c859b`), pero la divergencia de campos lo hacía difícil de mantener.

## Decisión

Se usan **dos colecciones MongoDB separadas**, cada una con discriminators de Mongoose:

### Colección `barbers`
- **Discriminator key:** `kind`
- **Base** (`Barber`): `email`, `password`, `name`, `lastname`, `phone`, `twoFactor*`, campos de lockout
- **Discriminators:**
  - `Admin` (kind: `'Admin'`) — puede gestionar el sistema
  - `Empleado` (kind: `'Empleado'`) — barbero con horarios y servicios
- Ambos discriminators comparten schema de `schedule`, `specialties`, `slotDuration`, `isActive`, `age`, `photoUrl`
- Fuente: `barber.model.ts:96-99`

### Colección `clients`
- **Discriminator key:** `kind`
- **Base** (`Client`): `name`, `lastname`, `phone`, `contactEmail`
- **Discriminators:**
  - `Registrado` (kind: `'Registrado'`) — tiene email, password, googleId, 2FA, lockout
  - `NoRegistrado` (kind: `'NoRegistrado'`) — solo datos de contacto, sin autenticación
- Fuente: `client.model.ts:48-51`

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Colección única `users` con todos los campos nullable | Muchos campos nulos por registro; índices sparse difíciles de mantener |
| Clase abstracta `User` con herencia en una sola colección | Mongoose no soporta herencia polimórfica simple en una colección con discriminators complejos |
| Colecciones totalmente separadas sin entidad compartida | El login necesita buscar en ambas; no tener `User` unificado duplica la lógica de autenticación |

## Consecuencias

- **Positivo**: Cada colección almacena solo los campos relevantes para ese tipo de usuario
- **Positivo**: Mongoose valida en runtime que `kind` sea uno de los valores esperados
- **Positivo**: Es trivial agregar un nuevo discriminator (ej: `SuperAdmin`) sin modificar colecciones existentes
- **Negativo**: `MongoUserRepository.findByEmail()` debe consultar dos colecciones secuencialmente, duplicando la latencia de login
- **Negativo**: `UserMapper` debe manejar dos formas de documento (atenuado por ADR-001 con Raw interfaces)

## Estado

Aceptada.
