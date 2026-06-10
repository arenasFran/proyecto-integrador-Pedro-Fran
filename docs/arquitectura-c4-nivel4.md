# Arquitectura — Nivel 4 (Código)

Diagrama de clases que muestra las entidades, interfaces y relaciones concretas del backend organizadas por capa de Clean Architecture.

---

## Diagrama General de Clases

```mermaid
classDiagram
    %% ========== DOMAIN LAYER ==========
    namespace Domain {
        class User {
            <<entity>>
            +id: string
            +email: string
            +name: string
            +lastname: string
            +phone: string
            +kind: UserRole
            +authProvider: AuthProvider
            +passwordHash: string
            +googleId: string
            +twoFactor: TwoFactorState
            +lastLoginAt: Date
            +twoFactorFailedAttempts: number
            +twoFactorLockedUntil: Date
            +resetFailedAttempts: number
            +resetLockedUntil: Date
            +create(props) User
            +withPasswordHash(hash) User
            +withTwoFactor(state) User
            +withTwoFactorFailedAttempts(attempts, until) User
            +withTwoFactorLockoutReset() User
            +withResetFailedAttempts(attempts, until) User
            +withResetLockoutReset() User
            +withLastLoginAt(date) User
            +toPrimitives() UserProps
        }
        class Barber {
            <<entity>>
            +specialties: string[]
            +age: number
            +photoUrl: string
            +isActive: boolean
            +slotDuration: number
            +schedule: BarberSchedule
            +passwordHash: string
            +create(props) Barber
            +toPrimitives() BarberProps
        }
        class Client {
            <<entity>>
            +contactEmail: string
            +kind: 'Registrado' | 'NoRegistrado'
            +create(props) Client
            +toPrimitives() ClientProps
        }
        class Appointment {
            <<entity>>
            +id: string
            +barberId: string
            +clientId: string
            +clientName: string
            +clientLastname: string
            +clientPhone: string
            +clientEmail: string
            +serviceId: string
            +serviceName: string
            +servicePrice: number
            +serviceDuration: number
            +date: string
            +startTime: string
            +endTime: string
            +status: AppointmentStatus
            +cancelReason: string
            +cancelledAt: Date
            +createdAt: Date
            +updatedAt: Date
            +create(props) Appointment
            +cancel(reason)
            +confirm()
            +complete()
            +toPrimitives() AppointmentPrimitives
        }
        class Service {
            <<entity>>
            +id: string
            +name: string
            +duration: number
            +price: number
            +isActive: boolean
        }
        class RefreshToken {
            <<entity>>
            +id: string
            +tokenHash: string
            +userId: string
            +expiresAt: Date
            +revoked: boolean
            +createdAt: Date
            +create(props) RefreshToken
            +isExpired(now) boolean
            +revoke() RefreshToken
        }
        class PasswordResetToken {
            <<entity>>
            +id: string
            +userId: string
            +expiresAt: Date
            +create(props) PasswordResetToken
        }
        class Email {
            <<value object>>
            +create(raw) Email
            +getValue() string
        }
        class Password {
            <<value object>>
            +create(raw) Password
        }
        class Phone {
            <<value object>>
            +create(raw) Phone
            +getValue() string
        }
        class Price {
            <<value object>>
            +create(amount) Price
            +getValue() number
        }
        class DurationMinutes {
            <<value object>>
            +create(minutes) DurationMinutes
            +getValue() number
        }
        class SlotService {
            <<domain service>>
            +execute(date, schedule, slotDuration, occupiedSlots) SlotsResult
            +isValidDate(date) boolean
        }
        class AppointmentStatus {
            <<type>>
            'Pendiente' | 'Confirmado' | 'Cancelado' | 'Completado'
        }
        class VALID_TRANSITIONS {
            <<const>>
            Pendiente: ['Confirmado', 'Cancelado']
            Confirmado: ['Completado', 'Cancelado']
            Cancelado: []
            Completado: []
        }
        class AuthTypes {
            <<type>>
            AuthProvider: 'local' | 'google'
            BarberKind: 'Admin' | 'Empleado'
            ClientKind: 'Registrado' | 'NoRegistrado'
        }
        class IUserRepository {
            <<interface>>
            +findByEmail(email) User
            +findByPhone(phone) User
            +createRegisteredClient(user) User
            +updatePassword(userId, hash) void
            +updateTwoFactor(userId, update) void
            +updateLastLogin(userId) void
            +updateUserSecurity(userId, update) void
        }
        class IBarberRepository {
            <<interface>>
            +findEmployeeById(id) Barber
            +findAllEmployees() Barber[]
            +createEmployee(barber) Barber
            +updateEmployee(id, update) Barber
            +deactivateEmployee(id) void
            +deleteEmployee(id) void
            +updateSchedule(id, schedule) Barber
        }
        class IClientRepository {
            <<interface>>
            +findByEmail(email) Client
            +findByPhone(phone) Client
            +createUnregistered(data) Client
        }
        class IAppointmentRepository {
            <<interface>>
            +findById(id) Appointment
            +findMany(filters) Appointment[]
            +findByBarberAndDate(barberId, date) Appointment[]
            +findByClientAndDate(clientId, date) Appointment[]
            +findByContactAndDate(date, email, phone) Appointment[]
            +create(data) Appointment
            +update(id, data) Appointment
            +updateStatus(id, data) Appointment
        }
        class IRefreshTokenRepository {
            <<interface>>
            +create(tokenHash, userId, expiresAt) RefreshToken
            +findByTokenHash(hash) RefreshToken
            +revoke(tokenHash) void
            +revokeAllByUserId(userId) void
        }
        class IPasswordResetRepository {
            <<interface>>
            +create(userId, tokenHash, expiresAt) void
            +verifyAndConsume(tokenHash) PasswordResetToken
        }
        class IServiceRepository {
            <<interface>>
            +findAll() Service[]
            +findById(id) Service
        }
        class ITempLockRepository {
            <<interface>>
            +create(data) void
            +deleteMany(filter) void
            +deleteOne(barberId, date, startTime) void
            +findByBarberAndDate(barberId, date) TempLockData[]
        }
    }

    %% ========== APPLICATION LAYER ==========
    namespace Application {
        class ITokenService {
            <<interface>>
            +sign(payload) string
            +verify(token) TokenPayload
            +signAccessToken(payload) string
            +signRefreshToken(payload) string
            +verifyAccessToken(token) TokenPayload
            +verifyRefreshToken(token) TokenPayload
            +signPartialToken(email) string
            +verifyPartialToken(token) ~{email: string}~
        }
        class IEmailService {
            <<interface>>
            +sendMail(message) Promise~void~
        }
        class IHashService {
            <<interface>>
            +sha256(input) string
            +constantTimeEqual(a, b) boolean
        }
        class IPasswordHasher {
            <<interface>>
            +hash(password) string
            +compare(password, hash) boolean
        }
        class IGoogleAuthService {
            <<interface>>
            +verifyIdToken(idToken) GoogleUser
        }
        class IDateTimeProvider {
            <<interface>>
            +now() Date
        }
        class IRandomGenerator {
            <<interface>>
            +generateNumericCode(length) string
            +generateHexToken(bytes) string
        }
        class AppError {
            +message: string
            +statusCode: number
        }
        class RegisterUserUseCase {
            +execute(dto) ~{message: string}~
        }
        class AuthenticateWithGoogleUseCase {
            +execute(dto) ~GoogleLoginResponse~
        }
        class CompleteGoogleProfileUseCase {
            +execute(dto) ~{token, refreshToken}~
        }
        class SendTwoFactorCodeUseCase {
            +execute(dto) ~{message}~
        }
        class VerifyTwoFactorUseCase {
            +execute(dto) ~{token, refreshToken}~
        }
        class RefreshTokenUseCase {
            +execute(refreshToken) ~{token, refreshToken}~
        }
        class RequestPasswordResetUseCase {
            +execute(dto) ~{message}~
        }
        class ResetPasswordUseCase {
            +execute(dto) ~{message}~
        }
        class CreateAppointmentUseCase {
            +execute(dto) ~{appointment}~
        }
        class CancelAppointmentUseCase {
            +execute(id, userId, userKind, reason) ~Appointment~
        }
        class RescheduleAppointmentUseCase {
            +execute(id, dto, userId, userKind) ~Appointment~
        }
        class GetAppointmentsUseCase {
            +execute(filters) Appointment[]
        }
        class GetAppointmentByIdUseCase {
            +execute(id, userId, userKind) Appointment
        }
        class UpdateAppointmentStatusUseCase {
            +execute(id, dto) Appointment
        }
        class CreateEmployeeBarberUseCase {
            +execute(dto) Barber
        }
        class GetAllEmployeesUseCase {
            +execute() Barber[]
        }
        class GetBarberByIdUseCase {
            +execute(barberId) Barber
        }
        class UpdateBarberUseCase {
            +execute(barberId, dto) Barber
        }
        class DeleteBarberUseCase {
            +execute(barberId) ~{message}~
        }
        class DeactivateBarberUseCase {
            +execute(barberId) ~{message}~
        }
        class GetBarberScheduleUseCase {
            +execute(barberId) BarberSchedule
        }
        class UpdateBarberScheduleUseCase {
            +execute(barberId, schedule) Barber
        }
        class GetAvailableSlotsUseCase {
            +execute(barberId, date) ~SlotsResult~
        }
        class GetAllServicesUseCase {
            +execute() Service[]
        }
        class CreateTempLockUseCase {
            +execute(dto) void
        }
    }

    %% ========== INFRASTRUCTURE LAYER ==========
    namespace Infrastructure {
        class MongoUserRepository {
            -UserModel: Model
            +findByEmail(email) User
            +findByPhone(phone) User
            +createRegisteredClient(user) User
            +updatePassword(userId, hash) void
            +updateTwoFactor(userId, update) void
            +updateLastLogin(userId) void
            +updateUserSecurity(userId, update) void
        }
        class MongoBarberRepository {
            -BarberModel: Model
            +findEmployeeById(id) Barber
            +findAllEmployees() Barber[]
            +createEmployee(barber) Barber
            +updateEmployee(id, update) Barber
            +deactivateEmployee(id) void
            +deleteEmployee(id) void
            +updateSchedule(id, schedule) Barber
        }
        class MongoClientRepository {
            -ClientModel: Model
            +findByEmail(email) Client
            +findByPhone(phone) Client
            +createUnregistered(data) Client
        }
        class MongoAppointmentRepository {
            -AppointmentModel: Model
            +findById(id) Appointment
            +findMany(filters) Appointment[]
            +findByBarberAndDate(barberId, date) Appointment[]
            +findByClientAndDate(clientId, date) Appointment[]
            +findByContactAndDate(date, email, phone) Appointment[]
            +create(data) Appointment
            +update(id, data) Appointment
            +updateStatus(id, data) Appointment
        }
        class MongoRefreshTokenRepository {
            -RefreshTokenModel: Model
            +create(tokenHash, userId, expiresAt) RefreshToken
            +findByTokenHash(hash) RefreshToken
            +revoke(tokenHash) void
            +revokeAllByUserId(userId) void
        }
        class MongoPasswordResetRepository {
            -PasswordResetModel: Model
            +create(userId, tokenHash, expiresAt) void
            +verifyAndConsume(tokenHash) PasswordResetToken
        }
        class MongoTempLockRepository {
            -TempLockModel: Model
            +create(data) void
            +deleteMany(filter) void
            +deleteOne(barberId, date, startTime) void
            +findByBarberAndDate(barberId, date) TempLockData[]
        }
        class StaticServiceRepository {
            -services: Service[]
            +findAll() Service[]
            +findById(id) Service
        }
        class JwtTokenService {
            -config: JwtTokenServiceConfig
            +sign(payload) string
            +verify(token) TokenPayload
            +signAccessToken(payload) string
            +signRefreshToken(payload) string
            +verifyAccessToken(token) TokenPayload
            +verifyRefreshToken(token) TokenPayload
            +signPartialToken(email) string
            +verifyPartialToken(token) ~{email}~
        }
        class BcryptPasswordHasher {
            +hash(password) string
            +compare(password, hash) boolean
        }
        class NodemailerEmailService {
            +sendMail(message) Promise~void~
        }
        class FakeEmailService {
            +sendMail(message) Promise~void~
            +getCode(email) string
            +clear() void
        }
        class GoogleAuthService {
            -client: OAuth2Client
            -clientId: string
            +verifyIdToken(token) GoogleUser
        }
        class HashService {
            +sha256(input) string
            +constantTimeEqual(a, b) boolean
        }
        class RandomGenerator {
            +generateNumericCode(length) string
            +generateHexToken(bytes) string
        }
        class DateTimeProvider {
            +now() Date
        }
        class AppointmentMapper {
            +fromDocument(doc) Appointment
            +toDocumentData(primitives) Record~string, unknown~
        }
        class BarberMapper {
            +fromDocument(doc) Barber
            +toPersist(barber) Record~string, unknown~
        }
        class ClientMapper {
            +fromDocument(doc) Client
            +toPersist(client) Record~string, unknown~
        }
        class UserMapper {
            +fromDocument(doc) User
        }
        class ServiceMapper {
            +fromDocument(doc) Service
        }
        class PasswordResetMapper {
            +fromDocument(doc) PasswordResetToken
        }
    }

    %% ========== INTERFACE-ADAPTERS LAYER ==========
    namespace InterfaceAdapters {
        class AuthController {
            +register(req, res) Response
            +refresh(req, res) Response
        }
        class AuthGoogleController {
            +googleLogin(req, res) Response
            +completeProfile(req, res) Response
        }
        class TwoFactorController {
            +sendTwoFactorCode(req, res) Response
            +verifyTwoFactorCode(req, res) Response
        }
        class PasswordRecoveryController {
            +requestReset(req, res) Response
            +resetPassword(req, res) Response
        }
        class BarberController {
            +getAllPublic(req, res) Response
            +create(req, res) Response
            +getAll(req, res) Response
            +getById(req, res) Response
            +update(req, res) Response
            +delete(req, res) Response
            +getSchedule(req, res) Response
            +updateSchedule(req, res) Response
            +getSlots(req, res) Response
        }
        class AppointmentController {
            +create(req, res) Response
            +getAll(req, res) Response
            +getById(req, res) Response
            +cancel(req, res) Response
            +updateStatus(req, res) Response
            +reschedule(req, res) Response
        }
        class ServiceController {
            +getAll(req, res) Response
        }
        class TempLockController {
            +create(req, res) Response
        }
        class AuthMiddleware {
            +createAuthenticate(tokenService) Middleware
            +authorize(...kinds) Middleware
            +authorizeSelfOrKinds(paramKey, ...kinds) Middleware
            +createOptionalAuth(tokenService) Middleware
        }
        class ValidationMiddleware {
            +validate(schemas) Middleware
        }
        class AuthPresenter {
            +static success(res, payload, status) Response
            +static handleError(res, error, fallback) Response
        }
        class BarberPresenter {
            +static success(res, payload, status) Response
            +static handleError(res, error, fallback) Response
        }
        class AppointmentPresenter {
            +static success(res, payload, status) Response
            +static handleError(res, error, fallback) Response
        }
        class ServicePresenter {
            +static success(res, payload, status) Response
            +static handleError(res, error, fallback) Response
        }
    }

    %% ========== RELATIONSHIPS ==========

    %% Domain Inheritance
    Barber --|> User : extends via discriminator (kind='Admin'|'Empleado')
    Client --|> User : extends via discriminator (kind='Registrado'|'NoRegistrado')

    %% Domain Associations
    Appointment --> Barber : barberId >
    Appointment --> Client : clientId ?
    Appointment --> Service : serviceId >
    Appointment --> AppointmentStatus : status

    %% Domain Interface Implementations (Infra)
    MongoUserRepository ..|> IUserRepository : implements
    MongoBarberRepository ..|> IBarberRepository : implements
    MongoClientRepository ..|> IClientRepository : implements
    MongoAppointmentRepository ..|> IAppointmentRepository : implements
    MongoRefreshTokenRepository ..|> IRefreshTokenRepository : implements
    MongoPasswordResetRepository ..|> IPasswordResetRepository : implements
    MongoTempLockRepository ..|> ITempLockRepository : implements
    StaticServiceRepository ..|> IServiceRepository : implements
    JwtTokenService ..|> ITokenService : implements
    BcryptPasswordHasher ..|> IPasswordHasher : implements
    NodemailerEmailService ..|> IEmailService : implements
    FakeEmailService ..|> IEmailService : implements
    GoogleAuthService ..|> IGoogleAuthService : implements
    HashService ..|> IHashService : implements
    RandomGenerator ..|> IRandomGenerator : implements
    DateTimeProvider ..|> IDateTimeProvider : implements

    %% Application → Domain (Use Cases depend on Repos)
    RegisterUserUseCase --> IUserRepository : depends
    RegisterUserUseCase --> IPasswordHasher : depends
    AuthenticateWithGoogleUseCase --> IUserRepository : depends
    AuthenticateWithGoogleUseCase --> IGoogleAuthService : depends
    AuthenticateWithGoogleUseCase --> ITokenService : depends
    AuthenticateWithGoogleUseCase --> IRefreshTokenRepository : depends
    AuthenticateWithGoogleUseCase --> IHashService : depends
    AuthenticateWithGoogleUseCase --> IDateTimeProvider : depends
    AuthenticateWithGoogleUseCase --> IPasswordHasher : depends
    CompleteGoogleProfileUseCase --> IUserRepository : depends
    CompleteGoogleProfileUseCase --> ITokenService : depends
    CompleteGoogleProfileUseCase --> IHashService : depends
    CompleteGoogleProfileUseCase --> IDateTimeProvider : depends
    CompleteGoogleProfileUseCase --> IRefreshTokenRepository : depends
    SendTwoFactorCodeUseCase --> IUserRepository : depends
    SendTwoFactorCodeUseCase --> IPasswordHasher : depends
    SendTwoFactorCodeUseCase --> IEmailService : depends
    SendTwoFactorCodeUseCase --> IRandomGenerator : depends
    SendTwoFactorCodeUseCase --> IHashService : depends
    SendTwoFactorCodeUseCase --> IDateTimeProvider : depends
    VerifyTwoFactorUseCase --> IUserRepository : depends
    VerifyTwoFactorUseCase --> ITokenService : depends
    VerifyTwoFactorUseCase --> IHashService : depends
    VerifyTwoFactorUseCase --> IDateTimeProvider : depends
    VerifyTwoFactorUseCase --> IRefreshTokenRepository : depends
    RefreshTokenUseCase --> ITokenService : depends
    RefreshTokenUseCase --> IRefreshTokenRepository : depends
    RefreshTokenUseCase --> IHashService : depends
    RefreshTokenUseCase --> IDateTimeProvider : depends
    RequestPasswordResetUseCase --> IUserRepository : depends
    RequestPasswordResetUseCase --> IPasswordResetRepository : depends
    RequestPasswordResetUseCase --> IEmailService : depends
    RequestPasswordResetUseCase --> IRandomGenerator : depends
    RequestPasswordResetUseCase --> IHashService : depends
    RequestPasswordResetUseCase --> IDateTimeProvider : depends
    ResetPasswordUseCase --> IUserRepository : depends
    ResetPasswordUseCase --> IPasswordResetRepository : depends
    ResetPasswordUseCase --> IPasswordHasher : depends
    ResetPasswordUseCase --> IHashService : depends
    ResetPasswordUseCase --> IDateTimeProvider : depends
    CreateAppointmentUseCase --> IAppointmentRepository : depends
    CreateAppointmentUseCase --> IBarberRepository : depends
    CreateAppointmentUseCase --> IClientRepository : depends
    CreateAppointmentUseCase --> IServiceRepository : depends
    CreateAppointmentUseCase --> IEmailService : depends
    CreateAppointmentUseCase --> ITempLockRepository : depends
    CancelAppointmentUseCase --> IAppointmentRepository : depends
    CancelAppointmentUseCase --> IEmailService : depends
    RescheduleAppointmentUseCase --> IAppointmentRepository : depends
    RescheduleAppointmentUseCase --> IBarberRepository : depends
    RescheduleAppointmentUseCase --> IServiceRepository : depends
    RescheduleAppointmentUseCase --> IEmailService : depends
    GetAppointmentsUseCase --> IAppointmentRepository : depends
    GetAppointmentByIdUseCase --> IAppointmentRepository : depends
    UpdateAppointmentStatusUseCase --> IAppointmentRepository : depends
    CreateEmployeeBarberUseCase --> IUserRepository : depends
    CreateEmployeeBarberUseCase --> IBarberRepository : depends
    CreateEmployeeBarberUseCase --> IPasswordHasher : depends
    GetAllEmployeesUseCase --> IBarberRepository : depends
    GetBarberByIdUseCase --> IBarberRepository : depends
    UpdateBarberUseCase --> IUserRepository : depends
    UpdateBarberUseCase --> IBarberRepository : depends
    UpdateBarberUseCase --> IPasswordHasher : depends
    DeleteBarberUseCase --> IBarberRepository : depends
    DeleteBarberUseCase --> IAppointmentRepository : depends
    DeleteBarberUseCase --> ITempLockRepository : depends
    DeleteBarberUseCase --> IEmailService : depends
    DeactivateBarberUseCase --> IBarberRepository : depends
    GetBarberScheduleUseCase --> IBarberRepository : depends
    UpdateBarberScheduleUseCase --> IBarberRepository : depends
    GetAvailableSlotsUseCase --> IBarberRepository : depends
    GetAvailableSlotsUseCase --> SlotService : depends
    GetAvailableSlotsUseCase --> IAppointmentRepository : depends
    GetAvailableSlotsUseCase --> ITempLockRepository : depends
    GetAllServicesUseCase --> IServiceRepository : depends
    CreateTempLockUseCase --> ITempLockRepository : depends

    %% Controller → Use Case
    AuthController --> RegisterUserUseCase : executes
    AuthController --> RefreshTokenUseCase : executes
    AuthGoogleController --> AuthenticateWithGoogleUseCase : executes
    AuthGoogleController --> CompleteGoogleProfileUseCase : executes
    TwoFactorController --> SendTwoFactorCodeUseCase : executes
    TwoFactorController --> VerifyTwoFactorUseCase : executes
    PasswordRecoveryController --> RequestPasswordResetUseCase : executes
    PasswordRecoveryController --> ResetPasswordUseCase : executes
    BarberController --> CreateEmployeeBarberUseCase : executes
    BarberController --> GetAllEmployeesUseCase : executes
    BarberController --> GetBarberByIdUseCase : executes
    BarberController --> UpdateBarberUseCase : executes
    BarberController --> DeleteBarberUseCase : executes
    BarberController --> GetBarberScheduleUseCase : executes
    BarberController --> UpdateBarberScheduleUseCase : executes
    BarberController --> GetAvailableSlotsUseCase : executes
    AppointmentController --> CreateAppointmentUseCase : executes
    AppointmentController --> GetAppointmentsUseCase : executes
    AppointmentController --> GetAppointmentByIdUseCase : executes
    AppointmentController --> CancelAppointmentUseCase : executes
    AppointmentController --> UpdateAppointmentStatusUseCase : executes
    AppointmentController --> RescheduleAppointmentUseCase : executes
    ServiceController --> GetAllServicesUseCase : executes
    TempLockController --> CreateTempLockUseCase : executes

    %% Controller → Presenter
    AuthController --> AuthPresenter : uses
    AuthGoogleController --> AuthPresenter : uses
    TwoFactorController --> AuthPresenter : uses
    PasswordRecoveryController --> AuthPresenter : uses
    BarberController --> BarberPresenter : uses
    AppointmentController --> AppointmentPresenter : uses
    ServiceController --> ServicePresenter : uses
    TempLockController --> BarberPresenter : uses

    %% Infrastructure Mappers
    MongoAppointmentRepository --> AppointmentMapper : uses
    MongoBarberRepository --> BarberMapper : uses
    MongoClientRepository --> ClientMapper : uses
    MongoUserRepository --> UserMapper : uses
    StaticServiceRepository --> ServiceMapper : uses
    MongoPasswordResetRepository --> PasswordResetMapper : uses
```

---

## Descripción

El Nivel 4 expone la estructura de clases concreta del backend siguiendo Clean Architecture. Se destacan:

- **Herencia por discriminador:** `Barber` (kind `Admin`|`Empleado`) y `Client` (kind `Registrado`|`NoRegistrado`) extienden `User` mapeado vía Mongoose discriminators a las colecciones `users`, `barbers` y `clients`.
- **Inversión de dependencias:** Los 25 `UseCases` en `application/` dependen de interfaces definidas en `domain/repositories/` y `application/ports/`. La capa `infrastructure/` las implementa sin que el core de negocio conozca detalles de MongoDB, JWT, bcrypt o Nodemailer.
- **Mappers como traducción:** Los repositorios de infraestructura usan `*Mapper` para convertir entre documentos de Mongoose y entidades de dominio, manteniendo el dominio puro (sin acoplamiento a la ODM).
- **Controllers como orquestadores HTTP:** Los controladores reciben `req/res` de Express, ejecutan un caso de uso y delegan la respuesta en un `Presenter`.
- **Wiring (no visible en clases):** Los módulos en `wiring/` construyen manualmente cada controlador inyectándole sus dependencias (use cases, repositorios, servicios) sin contenedor IoC.
- **Domain types:** `appointment.ts` define la máquina de estados `VALİD_TRANSITIONS` que los use cases deben respetar. `auth.ts` define tipos `AuthProvider`, `BarberKind`, `ClientKind`.
- **Autenticación en 2 pasos (2FA obligatorio):** No hay un endpoint `/login`. El flujo es: `POST /auth/2fa/send` (valida credenciales + envía código) → `POST /auth/2fa/verify` (valida código + emite tokens). Esto está orquestado por `SendTwoFactorCodeUseCase` y `VerifyTwoFactorUseCase`.
- **Refresh Token Rotation:** `RefreshTokenUseCase` revoca el token anterior al refrescar. Si se reutiliza un token ya revocado, se revocan **todos** los tokens del usuario (detección de robo).
- **Anti brute-force nativo:** `VerifyTwoFactorUseCase` y `ResetPasswordUseCase` implementan lockout tras 5 intentos fallidos (15 min de bloqueo), persistido en `twoFactorLockedUntil` / `resetLockedUntil` del usuario.
- **Retry con exponential backoff:** `SendTwoFactorCodeUseCase` y `RequestPasswordResetUseCase` reintentan el envío de email hasta 3 veces con backoff de 500ms → 1000ms.
- **TempLock con TTL index:** Los bloqueos temporales de slots se autoeliminan tras 300 segundos vía `expireAfterSeconds` en MongoDB, complementado con un índice único compuesto `{barberId, date, startTime}` que previene doble reserva a nivel DB.
- **Appointment unique index:** Índice único `{barberId, date, startTime}` en appointments previene double-booking incluso si la lógica de aplicación falla.
