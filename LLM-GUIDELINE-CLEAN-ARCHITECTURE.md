# LLM Guideline — Clean Architecture Backend

> **Propósito:** Este documento es un manual definitivo para que un modelo de lenguaje (LLM) integrado al IDE pueda modificar, refactorizar o agregar nuevos módulos **siguiendo fielmente la Clean Architecture ya establecida** en el proyecto `backend-barber`.

---

## Índice

1. [Mapa Arquitectónico General](#1-mapa-arquitectónico-general)
2. [Estructura de Carpetas](#2-estructura-de-carpetas)
3. [Reglas de Importación Entre Capas](#3-reglas-de-importación-entre-capas)
4. [Patrón para Agregar un Nuevo Módulo](#4-patrón-para-agregar-un-nuevo-módulo)
5. [Patrón para Refactorizar Código Existente](#5-patrón-para-refactorizar-código-existente)
6. [Convenciones de Nomenclatura](#6-convenciones-de-nomenclatura)
7. [Patrón de Testing para Cada Capa](#7-patrón-de-testing-para-cada-capa)
8. [Manejo de Errores](#8-manejo-de-errores)
9. [Anti-patrones → NO HACER](#9-anti-patrones--no-hacer)
10. [Checklist Rápido para el LLM](#10-checklist-rápido-para-el-llm)

---

## 1. Mapa Arquitectónico General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERFACE ADAPTERS                           │
│  (controllers, presenters, middlewares, validators, routes)         │
│  Depende de: application, domain                                    │
│  NO importa: infrastructure                                         │
├───────────────────────┬─────────────────────────────────────────────┤
│                       │                                             │
│    APPLICATION        │        INFRASTRUCTURE                       │
│  (use-cases, ports,   │  (repositories, services, mappers,          │
│   DTOs, errors)       │   models, config, scripts)                  │
│                       │                                             │
│  Depende de: domain   │  Depende de: application (ports),           │
│  NO importa: infra    │               domain (entities, mappers)    │
│  NO importa: Express  │  NO importa: interface-adapters             │
│  NO importa: Mongoose │                                             │
├───────────────────────┴─────────────────────────────────────────────┤
│                              DOMAIN                                 │
│  (entities, value-objects, repositories interfaces, types)         │
│  NO importa NADA externo (ni Express, ni Mongoose, ni Joi,         │
│   ni JWT, ni bcrypt, ni Nodemailer)                                │
├─────────────────────────────────────────────────────────────────────┤
│                              WIRING                                 │
│  (composición de dependencias — DI manual)                         │
│  ES EL ÚNICO lugar que importa TODAS las capas                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Regla de Oro de las Dependencias

> Las dependencias apuntan **siempre hacia adentro**. El dominio no sabe nada del mundo exterior. La aplicación solo conoce el dominio. La infraestructura implementa los puertos de la aplicación. Los adaptadores de interfaz orquestan los casos de uso. El wiring es el único que lo conecta todo.

### Flujo de una Request

```
HTTP Request
      │
      ▼
  [routes] ──usan──► [validators] (Joi)
      │
      ▼
  [middlewares] (auth, validación)
      │
      ▼
  [controllers] ──llaman──► [use-cases] (application)
                                  │
                                  ▼
                          [domain entities]
                          [value objects]
                          [repository interfaces]
                                  │
                                  ▼
                          [infrastructure repos/services]
                                  │
                                  ▼
                          MongoDB / bcrypt / JWT / Nodemailer
      │
      ▼
  [presenter] ──formatea──► HTTP Response
```

---

## 2. Estructura de Carpetas

```
backend-barber/src/
├── domain/
│   ├── entities/
│   │   ├── User.ts
│   │   └── PasswordResetToken.ts
│   ├── value-objects/
│   │   ├── Email.ts
│   │   ├── Password.ts
│   │   └── Phone.ts
│   ├── repositories/
│   │   ├── IUserRepository.ts
│   │   └── IPasswordResetRepository.ts
│   └── types/
│       └── auth.ts
│
├── application/
│   ├── dto/
│   │   ├── auth/
│   │   │   ├── RegisterUserDTO.ts
│   │   │   ├── LoginUserDTO.ts
│   │   │   ├── GoogleLoginDTO.ts
│   │   │   ├── TwoFactorSendDTO.ts
│   │   │   └── TwoFactorVerifyDTO.ts
│   │   └── password/
│   │       ├── RequestResetDTO.ts
│   │       └── ResetPasswordDTO.ts
│   ├── errors/
│   │   └── AppError.ts
│   ├── ports/
│   │   ├── IPasswordHasher.ts
│   │   ├── ITokenService.ts
│   │   ├── IEmailService.ts
│   │   ├── IGoogleAuthService.ts
│   │   ├── IHashService.ts
│   │   ├── IRandomGenerator.ts
│   │   └── IDateTimeProvider.ts
│   └── use-cases/
│       ├── auth/
│       │   ├── RegisterUserUseCase.ts
│       │   ├── LoginUserUseCase.ts
│       │   ├── AuthenticateWithGoogleUseCase.ts
│       │   ├── SendTwoFactorCodeUseCase.ts
│       │   └── VerifyTwoFactorUseCase.ts
│       └── password/
│           ├── RequestPasswordResetUseCase.ts
│           └── ResetPasswordUseCase.ts
│
├── infrastructure/
│   ├── config/
│   │   ├── db.ts
│   │   └── mailer.ts
│   ├── mappers/
│   │   ├── UserMapper.ts
│   │   └── PasswordResetMapper.ts
│   ├── repositories/
│   │   └── mongodb/
│   │       ├── models/
│   │       │   ├── barber.model.ts
│   │       │   ├── client.model.ts
│   │       │   └── passwordReset.model.ts
│   │       ├── MongoUserRepository.ts
│   │       └── MongoPasswordResetRepository.ts
│   ├── scripts/
│   │   └── seed.ts
│   ├── services/
│   │   ├── BcryptPasswordHasher.ts
│   │   ├── DateTimeProvider.ts
│   │   ├── GoogleAuthService.ts
│   │   ├── HashService.ts
│   │   ├── JwtTokenService.ts
│   │   ├── NodemailerEmailService.ts
│   │   └── RandomGenerator.ts
│   └── types/
│       └── user-input.ts
│
├── interface-adapters/
│   ├── controllers/
│   │   └── auth/
│   │       ├── AuthController.ts
│   │       ├── AuthGoogleController.ts
│   │       ├── TwoFactorController.ts
│   │       └── PasswordRecoveryController.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── presenters/
│   │   └── AuthPresenter.ts
│   ├── routes/
│   │   └── auth.routes.ts
│   ├── types/
│   │   └── express.d.ts
│   └── validators/
│       ├── auth.validator.ts
│       └── recovery.validator.ts
│
├── wiring/
│   └── auth.ts
│
├── app.ts
└── index.ts
```

---

## 3. Reglas de Importación Entre Capas

Esta es la sección **más importante**. Violar estas reglas rompe la arquitectura.

### 3.1. Tabla de Importaciones Permitidas

| Archivo en... | Puede importar de... | NO puede importar de... |
|---|---|---|
| `domain/entities/*` | Nada externo. Solo types/libs nativas de Node. | Express, Mongoose, Joi, JWT, bcrypt, Nodemailer, `application/*`, `infrastructure/*`, `interface-adapters/*` |
| `domain/value-objects/*` | Nada externo. | Todo lo anterior. |
| `domain/repositories/*` | `domain/entities/*` | Todo lo externo. |
| `domain/types/*` | Nada (solo types planos). | Todo lo externo. |
| `application/dto/*` | Nada (son types planos). | Todo lo externo. |
| `application/ports/*` | Nada (son interfaces). | Todo lo externo. |
| `application/errors/*` | Nada (extends `Error` de Node). | Todo lo externo. |
| `application/use-cases/*` | `domain/*`, `application/dto/*`, `application/ports/*`, `application/errors/*` | `infrastructure/*`, `interface-adapters/*` |
| `infrastructure/services/*` | `application/ports/*` | `interface-adapters/*`, `domain/*` (excepto types) |
| `infrastructure/repositories/*` | `application/ports/*`, `domain/entities/*`, `infrastructure/mappers/*`, `infrastructure/models/*` | `interface-adapters/*`, `application/use-cases/*` |
| `infrastructure/mappers/*` | `domain/entities/*`, `infrastructure/models/*` | `application/*`, `interface-adapters/*` |
| `infrastructure/models/*` | Mongoose, `infrastructure/types/*` | `domain/*`, `application/*`, `interface-adapters/*` |
| `interface-adapters/controllers/*` | `application/use-cases/*`, `interface-adapters/presenters/*` | `infrastructure/*`, `domain/*` |
| `interface-adapters/presenters/*` | `application/errors/*` | `infrastructure/*`, `domain/*` |
| `interface-adapters/middlewares/*` | `application/ports/*` | `infrastructure/*` |
| `interface-adapters/validators/*` | Joi | `infrastructure/*` |
| `interface-adapters/routes/*` | `interface-adapters/controllers/*`, `interface-adapters/middlewares/*`, `interface-adapters/validators/*` | `infrastructure/*` |
| `wiring/*` | **TODO** (único lugar permitido) | N/A |

### 3.2. Regla Mnemotécnica

> **Una capa solo puede importar a su misma capa o a capas más internas.**
>
> `interface-adapters → application → domain`
>
> `infrastructure → application → domain`
>
> `wiring = todo`

---

## 4. Patrón para Agregar un Nuevo Módulo

Ejemplo conceptual: agregar un módulo "Reseñas" (`Review`). Seguir **estrictamente** este orden.

### Paso 1: Value Objects (domain)

```typescript
// domain/value-objects/Rating.ts
export class Rating {
  private constructor(private readonly value: number) {}

  static create(raw: number): Rating {
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
      throw new Error('Rating debe ser un entero entre 1 y 5');
    }
    return new Rating(raw);
  }

  getValue(): number {
    return this.value;
  }
}
```

### Paso 2: Entidad (domain)

```typescript
// domain/entities/Review.ts
export type ReviewProps = {
  id: string;
  userId: string;
  comment: string;
  rating: number;
  createdAt: Date;
};

export class Review {
  private props: ReviewProps;

  private constructor(props: ReviewProps) {
    this.props = { ...props };
  }

  static create(props: ReviewProps): Review {
    return new Review(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get comment(): string { return this.props.comment; }
  get rating(): number { return this.props.rating; }
  get createdAt(): Date { return this.props.createdAt; }

  toPrimitives(): ReviewProps {
    return { ...this.props };
  }
}
```

### Paso 3: Interfaz de Repositorio (domain)

```typescript
// domain/repositories/IReviewRepository.ts
import { Review } from '../entities/Review';

export interface IReviewRepository {
  findByUserId(userId: string): Promise<Review[]>;
  create(review: Review): Promise<Review>;
}
```

### Paso 4: DTOs (application)

```typescript
// application/dto/review/CreateReviewDTO.ts
export type CreateReviewDTO = {
  userId: string;
  comment: string;
  rating: number;
};
```

### Paso 5: Puertos (application) — solo si se necesita un servicio externo

```typescript
// application/ports/IAiModerationService.ts
export interface IAiModerationService {
  moderate(text: string): Promise<{ isApproved: boolean; reason?: string }>;
}
```

### Paso 6: Caso de Uso (application)

```typescript
// application/use-cases/review/CreateReviewUseCase.ts
import { Review } from '../../../domain/entities/Review';
import { IReviewRepository } from '../../../domain/repositories/IReviewRepository';
import { Rating } from '../../../domain/value-objects/Rating';
import { CreateReviewDTO } from '../../dto/review/CreateReviewDTO';
import { AppError } from '../../errors/AppError';
import { IAiModerationService } from '../../ports/IAiModerationService';

export class CreateReviewUseCase {
  constructor(
    private readonly reviewRepository: IReviewRepository,
    private readonly moderationService: IAiModerationService
  ) {}

  async execute(dto: CreateReviewDTO): Promise<{ message: string; reviewId: string }> {
    const rating = Rating.create(dto.rating);

    const moderation = await this.moderationService.moderate(dto.comment);
    if (!moderation.isApproved) {
      throw new AppError('El comentario no cumple con las políticas.', 400);
    }

    const review = Review.create({
      id: '',
      userId: dto.userId,
      comment: dto.comment,
      rating: rating.getValue(),
      createdAt: new Date(),
    });

    const created = await this.reviewRepository.create(review);

    return { message: 'Reseña creada', reviewId: created.id };
  }
}
```

### Paso 7: Modelo Mongoose (infrastructure)

```typescript
// infrastructure/repositories/mongodb/models/review.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewDocument extends Document {
  userId: mongoose.Types.ObjectId;
  comment: string;
  rating: number;
  createdAt: Date;
}

const reviewSchema = new Schema<IReviewDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IReviewDocument>('Review', reviewSchema);
```

### Paso 8: Mapper (infrastructure)

```typescript
// infrastructure/mappers/ReviewMapper.ts
import { Review } from '../../domain/entities/Review';
import { IReviewDocument } from '../repositories/mongodb/models/review.model';

export class ReviewMapper {
  static fromDocument(doc: IReviewDocument): Review {
    return Review.create({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      comment: doc.comment,
      rating: doc.rating,
      createdAt: doc.createdAt,
    });
  }

  static toDocumentData(review: Review): Record<string, unknown> {
    return {
      userId: review.userId,
      comment: review.comment,
      rating: review.rating,
      createdAt: review.createdAt,
    };
  }
}
```

### Paso 9: Repositorio Concreto (infrastructure)

```typescript
// infrastructure/repositories/mongodb/MongoReviewRepository.ts
import { Review } from '../../../domain/entities/Review';
import { IReviewRepository } from '../../../domain/repositories/IReviewRepository';
import { ReviewMapper } from '../../mappers/ReviewMapper';
import ReviewModel from './models/review.model';

export class MongoReviewRepository implements IReviewRepository {
  async findByUserId(userId: string): Promise<Review[]> {
    const docs = await ReviewModel.find({ userId });
    return docs.map(ReviewMapper.fromDocument);
  }

  async create(review: Review): Promise<Review> {
    const doc = await ReviewModel.create(ReviewMapper.toDocumentData(review));
    return ReviewMapper.fromDocument(doc);
  }
}
```

### Paso 10: Servicio Concreto (infrastructure) — si se necesita

```typescript
// infrastructure/services/OpenAiModerationService.ts
import { IAiModerationService } from '../../application/ports/IAiModerationService';

export class OpenAiModerationService implements IAiModerationService {
  async moderate(text: string): Promise<{ isApproved: boolean; reason?: string }> {
    // implementación real con OpenAI
    return { isApproved: true };
  }
}
```

### Paso 11: Controlador (interface-adapters)

```typescript
// interface-adapters/controllers/review/ReviewController.ts
import { Request, Response } from 'express';
import { CreateReviewUseCase } from '../../../application/use-cases/review/CreateReviewUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

export class ReviewController {
  constructor(private readonly createReview: CreateReviewUseCase) {}

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createReview.execute(req.body);
      return AuthPresenter.success(res, result, 201);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al crear la reseña');
    }
  };
}
```

### Paso 12: Validador Joi (interface-adapters)

```typescript
// interface-adapters/validators/review.validator.ts
import Joi from 'joi';

export const createReviewSchema = Joi.object({
  userId: Joi.string().required(),
  comment: Joi.string().min(10).max(500).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
});
```

### Paso 13: Rutas (interface-adapters)

```typescript
// interface-adapters/routes/review.routes.ts
import express from 'express';
import { ReviewController } from '../controllers/review/ReviewController';
import { validate } from '../middlewares/validation.middleware';
import { createReviewSchema } from '../validators/review.validator';

export const createReviewRouter = (deps: {
  reviewController: ReviewController;
}) => {
  const router = express.Router();

  router.post('/', validate({ body: createReviewSchema }), deps.reviewController.create);

  return router;
};
```

### Paso 14: Wiring (wiring/)

```typescript
// wiring/review.ts
import { CreateReviewUseCase } from '../application/use-cases/review/CreateReviewUseCase';
import { MongoReviewRepository } from '../infrastructure/repositories/mongodb/MongoReviewRepository';
import { OpenAiModerationService } from '../infrastructure/services/OpenAiModerationService';
import { ReviewController } from '../interface-adapters/controllers/review/ReviewController';
import { createReviewRouter } from '../interface-adapters/routes/review.routes';

export const buildReviewRouter = () => {
  const reviewRepository = new MongoReviewRepository();
  const moderationService = new OpenAiModerationService();
  const createReview = new CreateReviewUseCase(reviewRepository, moderationService);
  const reviewController = new ReviewController(createReview);

  return createReviewRouter({ reviewController });
};
```

### Paso 15: Montar en app.ts

```typescript
// src/app.ts (agregar)
import { buildReviewRouter } from './wiring/review';

// dentro del archivo:
app.use('/reviews', buildReviewRouter());
```

---

## 5. Patrón para Refactorizar Código Existente

Cuando te encuentres con código legacy que NO sigue Clean Architecture, seguí estos pasos:

### 5.1. Detectar violaciones comunes

```typescript
// ❌ MAL — código legacy típico
class AuthController {
  async register(req, res) {
    const bcrypt = require('bcrypt');              // ← import oculto
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await UserModel.create(req.body); // ← Mongoose directo
    const jwt = require('jsonwebtoken');           // ← JWT en controller
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ token });               // ← res.json directo
  }
}
```

### 5.2. Pasos de refactor (de adentro hacia afuera)

1. **Value Objects**: extraer validaciones de email, password, phone, etc.
2. **Entidad de dominio**: crear `User` con sus props y métodos.
3. **Interfaz de repositorio**: definir `IUserRepository` con `findByEmail`, `create`, etc.
4. **Puertos**: definir `IPasswordHasher`, `ITokenService`.
5. **DTO**: tipar los datos de entrada.
6. **Caso de uso**: mover la lógica de negocio del controller a `RegisterUserUseCase` usando los puertos.
7. **Modelo Mongoose**: schema puro, sin lógica.
8. **Mapper**: convertir entre modelo y entidad.
9. **Repositorio concreto**: implementar `IUserRepository`.
10. **Servicio concreto**: implementar `IPasswordHasher` con bcrypt.
11. **Controlador**: que solo llame al caso de uso y use el presenter.
12. **Validador Joi**: mover validación de request a schema.
13. **Routes**: limpiar, que solo definan endpoints.
14. **Wiring**: crear el archivo que compone todo.
15. **Eliminar el archivo legacy**.

### 5.3. Orden de modificación recomendado

```
Siempre tocar primero:
  1. domain/        (entidades, value objects, repos interfaces)
  2. application/   (dto, ports, use-cases)
  3. infrastructure/ (mappers, repos concretos, servicios)
  4. interface-adapters/ (controllers, validators, routes)
  5. wiring/        (composición)
```

**Nunca al revés.** Si empezás por el controller, vas a terminar acoplando lógica de negocio ahí.

---

## 6. Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Entidad de dominio | `PascalCase` | `User`, `Review`, `Appointment` |
| Value Object | `PascalCase` | `Email`, `Password`, `Phone`, `Rating` |
| Interfaz de repositorio | `I + PascalCase + Repository` | `IUserRepository`, `IReviewRepository` |
| Puerto (servicio) | `I + PascalCase + Service` | `IPasswordHasher`, `IEmailService` |
| DTO | `PascalCase + DTO` | `RegisterUserDTO`, `CreateReviewDTO` |
| Caso de uso | `Verbo + Sustantivo + UseCase` | `RegisterUserUseCase`, `CreateReviewUseCase` |
| Controlador | `PascalCase + Controller` | `AuthController`, `ReviewController` |
| Validador | `camelCase + Schema` | `registerSchema`, `createReviewSchema` |
| Middleware | `camelCase` o `create + PascalCase` | `validate`, `createAuthenticate` |
| Mapper | `PascalCase + Mapper` | `UserMapper`, `ReviewMapper` |
| Presenter | `PascalCase + Presenter` | `AuthPresenter` |
| Wiring | `build + PascalCase + Router` | `buildAuthRouter`, `buildReviewRouter` |
| Archivo de ruta | `snake-case.feature.routes.ts` | `auth.routes.ts`, `review.routes.ts` |
| Archivo de validator | `snake-case.feature.validator.ts` | `auth.validator.ts`, `review.validator.ts` |
| Archivo de test | `snake-case.nombre.test.ts` | `register-user.usecase.test.ts` |
| Carpeta de feature | `snake-case` (singular) | `auth/`, `review/`, `password/` |

---

## 7. Patrón de Testing para Cada Capa

### 7.1. Test de Value Objects (domain)

```typescript
// tests/domain/value-objects/email.test.ts
import { Email } from '../../../src/domain/value-objects/Email';

describe('Email', () => {
  it('debe crear un email valido', () => {
    const email = Email.create('test@example.com');
    expect(email.getValue()).toBe('test@example.com');
  });

  it('debe rechazar un email invalido', () => {
    expect(() => Email.create('invalido')).toThrow('Email invalido');
  });

  it('debe normalizar a minusculas', () => {
    const email = Email.create('Test@Example.COM');
    expect(email.getValue()).toBe('test@example.com');
  });
});
```

### 7.2. Test de Casos de Uso (application)

Usar `jest.Mocked` para simular los puertos.

```typescript
// tests/modules/auth/use-cases/register-user.usecase.test.ts
import { RegisterUserUseCase } from '../../../src/application/use-cases/auth/RegisterUserUseCase';
import { AppError } from '../../../src/application/errors/AppError';
import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../../src/application/ports/IPasswordHasher';
import { User } from '../../../src/domain/entities/User';

describe('RegisterUserUseCase', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    // Crear mocks de TODOS los métodos de la interfaz
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    useCase = new RegisterUserUseCase(userRepository, passwordHasher);
  });

  it('debe fallar si el email ya existe', async () => {
    userRepository.findByEmail.mockResolvedValue(User.create({ /* ... */ }));
    // ...
  });
});
```

### 7.3. Test de Controladores (interface-adapters)

Usar `createMockReq` / `createMockRes` de `tests/test-utils/expressMocks.ts`.

```typescript
// tests/interface-adapters/controllers/auth/auth.controller.test.ts
import { AuthController } from '../../../src/interface-adapters/controllers/auth/AuthController';
import { AppError } from '../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AuthController', () => {
  let registerUser: jest.Mocked<RegisterUserUseCase>;
  let controller: AuthController;

  beforeEach(() => {
    registerUser = { execute: jest.fn() } as any;
    controller = new AuthController(registerUser, loginUser);
  });

  it('debe responder 201 en registro exitoso', async () => {
    registerUser.execute.mockResolvedValue({ message: 'ok' });
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('debe responder 409 si hay AppError con statusCode 409', async () => {
    registerUser.execute.mockRejectedValue(new AppError('Email en uso', 409));
    const req = createMockReq({ email: 'existente@example.com' });
    const res = createMockRes();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email en uso' });
  });
});
```

### 7.4. Test de Rutas con Supertest (interface-adapters — integración)

```typescript
// tests/interface-adapters/routes/auth.routes.test.ts
import request from 'supertest';
import express from 'express';
import { createAuthRouter } from '../../../src/interface-adapters/routes/auth.routes';

describe('POST /auth/register', () => {
  it('debe validar que el email sea obligatorio', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter({ /* mocks */ }));

    const res = await request(app)
      .post('/auth/register')
      .send({ password: '123456' });

    expect(res.status).toBe(400);
  });
});
```

### 7.5. Test de Repositorios (infrastructure — integración con MongoDB)

Usar `MongoMemoryServer`. El setup ya está en `jest.setup.ts`.

```typescript
// tests/infrastructure/mongodb/mongo-user.repository.test.ts
import { MongoUserRepository } from '../../../src/infrastructure/repositories/mongodb/MongoUserRepository';

describe('MongoUserRepository', () => {
  let repo: MongoUserRepository;

  beforeAll(async () => {
    // mongoose ya está conectado por jest.setup.ts
    repo = new MongoUserRepository();
  });

  it('debe crear y encontrar un usuario por email', async () => {
    // ...
  });
});
```

---

## 8. Manejo de Errores

### 8.1. En Casos de Uso (application)

Siempre usar `AppError` para errores esperados:

```typescript
import { AppError } from '../../errors/AppError';

// En el caso de uso:
if (!user) {
  throw new AppError('Usuario no encontrado.', 404);
}
if (!isValid) {
  throw new AppError('Credenciales inválidas.', 401);
}
```

### 8.2. En Controladores (interface-adapters)

Siempre delegar en `AuthPresenter.handleError`:

```typescript
try {
  const result = await this.someUseCase.execute(req.body);
  return AuthPresenter.success(res, result, 200);
} catch (error) {
  return AuthPresenter.handleError(res, error, 'Mensaje de fallback');
}
```

El presentador se encarga de:
- Si es `AppError`: respeta el `statusCode` y el mensaje
- Si no es `AppError`: responde 500 con el mensaje de fallback

---

## 9. Anti-patrones → NO HACER

### ❌ 1. Importar Mongoose o Express en domain o application

```typescript
// MAL
import mongoose from 'mongoose';
export class User extends mongoose.Document { ... }
```

```typescript
// BIEN
export class User { /* TypeScript puro */ }
```

### ❌ 2. Poner lógica de negocio en controladores

```typescript
// MAL
class AuthController {
  async register(req, res) {
    const hash = await bcrypt.hash(req.body.password, 10);
    // ... lógica de negocio aquí
  }
}
```

```typescript
// BIEN
class AuthController {
  async register(req, res) {
    const result = await this.registerUser.execute(req.body);
    return AuthPresenter.success(res, result, 201);
  }
}
```

### ❌ 3. Instanciar dependencias dentro de casos de uso o controladores

```typescript
// MAL
class RegisterUserUseCase {
  async execute(dto) {
    const repo = new MongoUserRepository(); // ← new oculto
  }
}
```

```typescript
// BIEN
class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}
  // La inyección viene desde el wiring
}
```

### ❌ 4. Crear entidades sin value objects cuando corresponde

```typescript
// MAL
if (!dto.email.includes('@')) throw new Error('...');
const user = User.create({ email: dto.email }); // email es string crudo
```

```typescript
// BIEN
const email = Email.create(dto.email);
const user = User.create({ email: email.getValue() });
```

### ❌ 5. Validar con if en controladores en vez de Joi

```typescript
// MAL
if (!req.body.email) return res.status(400).json({ error: 'Email requerido' });
```

```typescript
// BIEN (el middleware validate lo hace automático)
router.post('/register', validate({ body: registerSchema }), controller.register);
```

### ❌ 6. Pasar req/res a los casos de uso

```typescript
// MAL
class RegisterUserUseCase {
  async execute(req: Request, res: Response) { ... }
}
```

```typescript
// BIEN
class RegisterUserUseCase {
  async execute(dto: RegisterUserDTO): Promise<Result> { ... }
}
```

### ❌ 7. Usar tipos de Express en el dominio

```typescript
// MAL
import { Request } from 'express';
export class User {
  constructor(req: Request) { ... }
}
```

### ❌ 8. Tocar el wiring para cada cambio chico

El wiring se toca solo cuando:
- Se agrega un nuevo caso de uso
- Se cambia una implementación concreta (ej: bcrypt → argon2)
- Se agrega un nuevo controlador o ruta

---

## 10. Checklist Rápido para el LLM

Antes de escribir cualquier archivo nuevo, verificá:

- [ ] **¿El archivo pertenece a la capa correcta?** (domain / application / infrastructure / interface-adapters)
- [ ] **¿Las importaciones respetan la tabla de reglas?** (nunca importar de capas superiores)
- [ ] **¿La entidad de dominio tiene constructor privado + static create?** (patrón establecido)
- [ ] **¿El value object encapsula validación y es inmutable?**
- [ ] **¿El caso de uso recibe sus dependencias por constructor?** (nunca `new` adentro)
- [ ] **¿El caso de uso recibe un DTO y devuelve un objeto plano?** (nunca `req`/`res`)
- [ ] **¿El controlador solo llama al caso de uso y usa el presenter?** (sin lógica de negocio)
- [ ] **¿Las rutas tienen middleware de validación Joi?**
- [ ] **¿El wiring centraliza todas las dependencias del nuevo módulo?**
- [ ] **¿Los errores se lanzan como `AppError` en los casos de uso?**
- [ ] **¿El test usa mocks para puertos (use cases) y crea instancias reales (value objects)?**
- [ ] **¿Seguiste el orden domain → application → infrastructure → interface-adapters → wiring?**

---

> **Documento mantenido por:** equipo de desarrollo
> **Última actualización:** mayo 2026
> **Propósito:** Garantizar que cualquier modificación al backend respete la Clean Architecture establecida.
