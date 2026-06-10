# ADR-004: Política de fortaleza de contraseñas

## Contexto

El value object `Password` solo validaba longitud mínima. No había restricciones de complejidad, permitiendo contraseñas como `123456` que son triviales de adivinar.

El frontend (`validation.ts`) tenía `minLength: 6`, pero no había reglas paralelas en el backend ni se mostraban requisitos al usuario.

## Decisión

Se refuerza la validación de contraseñas en tres capas:

### 1. Dominio (`Password.ts`)

```ts
static create(raw: string): Password {
  if (!raw || raw.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
  if (!/[A-Z]/.test(raw)) throw new Error('La contraseña debe contener al menos una mayúscula');
  if (!/[a-z]/.test(raw)) throw new Error('La contraseña debe contener al menos una minúscula');
  if (!/[0-9]/.test(raw)) throw new Error('La contraseña debe contener al menos un número');
  return new Password(raw);
}
```

### 2. Validación Joi (backend API)

`registerSchema` en `auth.validator.ts` replica las reglas con `.min(8).pattern(/[A-Z]/).pattern(/[a-z]/).pattern(/[0-9]/)` para rechazar antes de llegar al caso de uso.

### 3. Frontend

- `constants/validation.ts`: `minLength` actualizado a 8, se agregan patrones `uppercase`, `lowercase`, `digit`
- `useFormValidation.ts`: validación contra esos patrones
- `RegisterForm.tsx`: placeholder actualizado para reflejar los requisitos
- `PasswordStrength` (componente existente) muestra fortaleza en tiempo real

## Consecuencias

- **Positivo**: Se previenen contraseñas débiles tanto en backend como frontend.
- **Negativo**: Usuarios con contraseñas existentes débiles no se ven afectados (solo se valida en creación/cambio).
- **Negativo**: Tests existentes que usaban `123456` como contraseña fallaron y requirieron actualización a valores como `Abcd1234`.
- **Nota**: La policy se aplica a registro, creación de empleados y reset-password, no al login.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| Solo validación frontend | Eludible; la seguridad debe estar en backend |
| zxcvbn (estimación de fortaleza) | Dependencia externa; sobreingeniería para este proyecto |
| Caracteres especiales obligatorios | Añade fricción sin beneficio claro de seguridad |

## Estado

Aceptada.
