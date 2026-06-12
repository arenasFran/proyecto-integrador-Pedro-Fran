# Plan de Correcciones — Auditoría `feature/auth-2fa-obligatorio`

## 🔴 Bloqueantes

### 1. Refresh Token — Alinear respuesta con el frontend

**Problema:** Backend retorna `{ accessToken, refreshToken }`, frontend espera `{ message, token, refreshToken }`.

**Solución:** Modificar `RefreshTokenUseCase.ts` para que retorne el mismo contrato que los demás endpoints de auth.

**Archivos a modificar:**
- `backend-barber/src/application/use-cases/auth/RefreshTokenUseCase.ts`

**Cambio:**
```ts
// Antes
return { accessToken: newAccessToken, refreshToken: newRefreshToken };

// Después
return { message: 'Token renovado', token: newAccessToken, refreshToken: newRefreshToken };
```

**Verificación:** El frontend en `authSlice.ts:333-337` ya consume `action.payload.token` y `action.payload.refreshToken` — debe funcionar sin cambios.

---

### 2. Token Parcial — Crear método específico en ITokenService

**Problema:** `AuthenticateWithGoogleUseCase` firma un partial token con `id: ''`. `verifyAccessToken` rechaza `id` vacío con `!id` → `CompleteGoogleProfileUseCase` siempre falla.

**Solución:** Agregar `signPartialToken` / `verifyPartialToken` a `ITokenService` y `JwtTokenService`.

**Archivos a modificar:**

1. `backend-barber/src/application/ports/ITokenService.ts`
2. `backend-barber/src/infrastructure/services/JwtTokenService.ts`
3. `backend-barber/src/application/use-cases/auth/AuthenticateWithGoogleUseCase.ts`
4. `backend-barber/src/application/use-cases/auth/CompleteGoogleProfileUseCase.ts`

**Cambios:**

**ITokenService.ts** — agregar al interface:
```ts
signPartialToken(email: string): string;
verifyPartialToken(token: string): { email: string };
```

**JwtTokenService.ts** — implementar:
```ts
signPartialToken(email: string): string {
  return jwt.sign(
    { email, type: 'partial' },
    this.config.secret,
    { expiresIn: '5m', algorithm: 'HS256' }
  );
}

verifyPartialToken(token: string): { email: string } {
  const decoded = jwt.verify(token, this.config.secret, {
    algorithms: ['HS256'],
  }) as { email?: string; type?: string };
  if (!decoded || typeof decoded === 'string' || !decoded.email || decoded.type !== 'partial') {
    throw new Error('Token parcial inválido');
  }
  return { email: decoded.email };
}
```

**AuthenticateWithGoogleUseCase.ts:79**:
```ts
// Antes
const partialToken = this.tokenService.signAccessToken(partialPayload);

// Después
const partialToken = this.tokenService.signPartialToken(normalizedEmail);
```

**CompleteGoogleProfileUseCase.ts:22-23**:
```ts
// Antes
partialPayload = this.tokenService.verifyAccessToken(dto.partialToken) as unknown as { email: string };

// Después
const { email } = this.tokenService.verifyPartialToken(dto.partialToken);
```

---

### 3. Refresh Token Hash — Agregar HMAC en lugar de SHA-256 plano

**Problema:** SHA-256 sin salt es determinístico. Dos refresh tokens iguales producen el mismo hash.

**Solución:** Usar `crypto.createHmac` con un secret de entorno.

**Archivos a modificar:**
- `backend-barber/src/infrastructure/services/HashService.ts`
- `backend-barber/.env.example`

**HashService.ts:**
```ts
sha256(input: string): string {
  const secret = process.env.REFRESH_HASH_SECRET || '';
  return crypto.createHmac('sha256', secret).update(input).digest('hex');
}
```

**.env.example — agregar:**
```
REFRESH_HASH_SECRET=your-refresh-hmac-secret
```

---

## 🟡 Mejoras / Refactors

### 4. Eliminar endpoint `/auth/login` redundante

**Problema:** `/auth/login` y `/auth/2fa/send` hacen exactamente lo mismo validar credenciales + enviar código 2FA. El frontend solo usa `/auth/2fa/send`.

**Solución:** Eliminar `AuthController.register` del router y sus dependencias.

**Archivos a modificar:**
- `backend-barber/src/interface-adapters/routes/auth.routes.ts` — quitar línea 31
- `backend-barber/src/app.ts` — quitar línea 76 (`app.use("/auth/login", loginLimiter)`)
- `backend-barber/src/interface-adapters/controllers/auth/AuthController.ts` — eliminar método `login` (mantener `register` y `refresh`)
- `backend-barber/src/wiring/auth.ts` — eliminar `loginUser` del wiring

---

### 5. GoogleAuthService — Usar `this.clientId` en lugar de `process.env`

**Problema:** `verifyIdToken` lee `process.env.GOOGLE_CLIENT_ID` directamente, ignorando el valor inyectado por constructor.

**Solución:** Almacenar `clientId` como propiedad de instancia y usarla.

**Archivo a modificar:**
- `backend-barber/src/infrastructure/services/GoogleAuthService.ts`
- `backend-barber/src/wiring/auth.ts`

**GoogleAuthService.ts:**
```ts
export class GoogleAuthService implements IGoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.client = new OAuth2Client(clientId);
  }

  async verifyIdToken(token: string): Promise<GoogleUser> {
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: this.clientId,
    });
    // ...
  }
}
```

**wiring/auth.ts — actualizar instanciación:**
```ts
const googleAuthService = new GoogleAuthService(config.googleClientId!);
```

---

### 6. mailer — Lazy Singleton

**Problema:** Transporter de nodemailer creado al importar el módulo.

**Solución:** Convertir a lazy singleton.

**Archivo a modificar:**
- `backend-barber/src/infrastructure/config/mailer.ts`

**Cambio:**
```ts
import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from './env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const config = getConfig();
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass || '' }
        : undefined,
    });
  }
  return transporter;
}

export const sendMail = async (opts: { from?: string; to: string; subject: string; html?: string; text?: string }) => {
  const config = getConfig();
  return getTransporter().sendMail({ from: opts.from || config.smtp.from, ...opts });
};

export default { sendMail };
```

---

### 7. Type Safety — Eliminar casts inseguros

**Archivos a modificar:**
- `backend-barber/src/infrastructure/mappers/UserMapper.ts`
- `backend-barber/src/application/use-cases/auth/CompleteGoogleProfileUseCase.ts`

**UserMapper.ts** — Agregar `lastLoginAt` a las interfaces del modelo o usar `doc.get('lastLoginAt')`:
```ts
lastLoginAt: doc.get('lastLoginAt') as Date | undefined,
```

**CompleteGoogleProfileUseCase.ts** — ya se soluciona con el punto 2.

---

### 8. RandomGenerator — Eliminar `testCodeOverride`

**Archivo a modificar:**
- `backend-barber/src/infrastructure/services/RandomGenerator.ts`

**Cambio:**
```ts
export class RandomGenerator implements IRandomGenerator {
  generateNumericCode(length: number): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return crypto.randomInt(min, max).toString();
  }

  generateHexToken(bytes: number): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
```

---

### 9. AuthController.login — Simplificar if redundante

**Archivo a modificar:**
- `backend-barber/src/interface-adapters/controllers/auth/AuthController.ts`

**Cambio** (si se mantiene el endpoint, que según punto 4 se elimina):
```ts
login = async (req: Request, res: Response) => {
  try {
    const result = await this.loginUser.execute(req.body);
    return AuthPresenter.success(res, result, 200);
  } catch (error) {
    return AuthPresenter.handleError(res, error, 'Error interno del servidor.');
  }
};
```

---

### 10. lastError en retry loops — Log interno + mensaje seguro al cliente

**Archivos a modificar:**
- `backend-barber/src/application/use-cases/auth/LoginUserUseCase.ts`
- `backend-barber/src/application/use-cases/auth/SendTwoFactorCodeUseCase.ts`
- `backend-barber/src/application/use-cases/password/RequestPasswordResetUseCase.ts`

**Patrón a aplicar en cada uno:**
```ts
if (!sent) {
  console.error('Fallo al enviar email después de 3 intentos:', lastError);
  throw new AppError(
    'No se pudo enviar el código de verificación. Servicio de correo no disponible, intentá de nuevo.',
    500
  );
}
```

---

## Orden sugerido de implementación

| Prioridad | Item | Esfuerzo estimado |
|-----------|------|-------------------|
| 1 | #2 Token parcial (crítico — rompe flujo Google) | 30 min |
| 2 | #1 Refresh token (crítico — rompe renovación) | 5 min |
| 3 | #3 HMAC en hash (seguridad) | 5 min |
| 4 | #4 Eliminar /auth/login | 15 min |
| 5 | #5 GoogleAuthService this.clientId | 10 min |
| 6 | #6 mailer lazy singleton | 10 min |
| 7 | #10 lastError en retry loops | 15 min |
| 8 | #8 Eliminar testCodeOverride | 2 min |
| 9 | #7 Type safety casts | 10 min |
| 10 | #9 If redundante | 2 min |

**Total estimado:** ~1.5 horas.
