```mermaid
flowchart TB
  %% ─── ESTILOS ───
  classDef anon fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
  classDef client fill:#1b4332,stroke:#2d6a4f,color:#e0e0e0
  classDef empleado fill:#3d2a1a,stroke:#7f4f24,color:#e0e0e0
  classDef admin fill:#3d1a1a,stroke:#9b2226,color:#e0e0e0
  classDef publicPg fill:#16213e,stroke:#0f3460,color:#e0e0e0
  classDef clientPg fill:#1b4332,stroke:#40916c,color:#e0e0e0
  classDef adminPg fill:#3d1a1a,stroke:#ae2012,color:#e0e0e0
  classDef gateway fill:#222,stroke:#555,color:#fff

  %% ─── ENTRADA ───
  START([Usuario llega al sitio]) --> Landing[LandingPage /]

  %% ─── SUBGRAPH: ANÓNIMO ───
  subgraph Anon[Usuario Anónimo]
    Landing -->|Click Login| Login[LoginPage /login]
    Landing -->|Click Registrarse| Register[RegisterPage /register]
    Landing -->|Click Reservar| Booking[BookingPage /reservar]
    Landing -->|Click Mis Turnos (sin login)| AnonymousLookup[Consulta Anónima /mis-turnos]

    Login -->|Email + Password| Send2FA[sendTwoFactorCode]
    Send2FA -->|Código 2FA| Verify2FA[verifyTwoFactorCode]
    Verify2FA -->|Rol Admin| AdminRedirect[→ /admin]
    Verify2FA -->|Rol Cliente| ClientRedirect[→ /mis-turnos]
    Verify2FA -->|Token inválido| Login

    Login -->|Google SSO| GoogleAuth[googleLogin]
    GoogleAuth -->|Perfil incompleto| ProfileComplete[Completar nombre/apellido]
    ProfileComplete -->|completeGoogleProfile| ClientRedirect
    GoogleAuth -->|Perfil ok| AdminRedirect

    Landing -->|Click Olvidé contraseña| Recovery[RecoveryPage /recovery]
    Recovery --> RequestReset[requestReset] --> ResetPassword[resetPassword]

    AnonymousLookup --> InputContact[Ingresar Email o Teléfono]
    InputContact --> FetchAnonymous[getAppointmentsAnonymous]
    FetchAnonymous --> ListAnonAppts[Listar Turnos]
    ListAnonAppts --> AnonCancel[Cancelar Turno (anónimo)]
    AnonCancel --> FetchAnonymous

    Register --> RegisterThunk[registerThunk] --> Login
  end

  %% ─── BOOKING FLOW ───
  Booking --> LoadBarbers[fetchPublicBarbers]
  Booking --> LoadServices[fetchServices]
  Booking --> StepBarber[Paso 1: Seleccionar Barbero]
  StepBarber --> StepService[Paso 2: Seleccionar Servicio]
  StepService --> StepDateTime[Paso 3: Fecha + Hora]
  StepDateTime -->|fetchAvailableSlots| SlotSelection[Seleccionar Turno]
  SlotSelection -->|createTempLock| ConfirmModal[Modal Confirmación]
  ConfirmModal -->|submitAppointment| SuccessModal[Turno Creado ✓]
  ConfirmModal -->|Cancelar / Cerrar| ReleaseLock[releaseTempLock]
  SuccessModal -->|Navegar a otra página| ReleaseLock

  %% ─── CLIENTE AUTENTICADO ───
  subgraph Cliente[Cliente Autenticado - kind: Cliente]
    Dashboard[Cualquier página] -->|Header dropdown| MyAppts[MyAppointmentsPage /mis-turnos]
    Dashboard -->|Header dropdown| LogoutAction[Cerrar Sesión]

    LogoutAction -->|logout| Login

    MyAppts --> ListApptsClient[Listar Turnos Propios]
    ListApptsClient -->|Confirmado| CancelClient[Cancelar Turno]
    ListApptsClient -->|Confirmado| RescheduleClient[Reprogramar Turno]
    CancelClient -->|cancelAppointment| MyAppts
    RescheduleClient -->|rescheduleAppointment| MyAppts

    MyAppts -->|Sin turnos| EmptyState[Empty State]
    EmptyState -->|Click Reservar turno → /reservar| Booking

    MyAppts -->|Historial| PastAppts[Turnos Completados / Cancelados]
  end

  %% ─── EMPLEADO ───
  subgraph EmpleadoRol[Empleado - kind: Empleado]
    NoteEmpleado[Sin UI frontend dedicada - Backend autoriza PATCH /:id/status via authorize Admin/Empleado]
  end

  %% ─── ADMIN ───
  subgraph AdminRol[Administrador - kind: Admin]
    AdminLogin[Login exitoso] --> AdminRedirect
    AdminRedirect --> AdminLayout[AdminLayout - Layout protegido]

    AdminLayout --> NavProfesionales[→ /admin/profesionales]
    AdminLayout --> NavTurnos[→ /admin/turnos]
    AdminLayout --> NavPerfil[→ /admin/perfil]
    AdminLayout --> LogoutAdmin[Cerrar Sesión]
    LogoutAdmin -->|logout| Login

    %% Profesionales
    NavProfesionales --> ProfPage[ProfessionalsPage]
    ProfPage --> ListProf[Listar Profesionales]
    ProfPage --> CreateProf[Crear Profesional]
    ProfPage --> EditProf[Editar Profesional]
    ProfPage --> DeleteProf[Desactivar Profesional]
    ProfPage --> ScheduleProf[Editar Horario Semanal]
    ProfPage --> SlotsProf[Ver Slots por Fecha]

    %% Turnos
    NavTurnos --> ApptsPage[AdminAppointmentsPage]
    ApptsPage --> FilterAppts[Filtros: Fecha / Barbero / Estado / Búsqueda]
    ApptsPage --> StatsTurnos[Stats: Total, Confirmados, Completados, Cancelados]
    ApptsPage --> TableAppts[Tabla de Turnos]
    TableAppts -->|Confirmado| CompleteAppt[Marcar Completado]
    TableAppts -->|Confirmado| NoShowAppt[Marcar NoShow]
    TableAppts -->|Confirmado| CancelAppt[Cancelar + Motivo]
    TableAppts -->|Confirmado| RescheduleAppt[Reprogramar Fecha/Hora/Barbero]
    CompleteAppt & NoShowAppt & CancelAppt & RescheduleAppt -->|updateStatus / cancel / reschedule| ApptsPage

    %% Perfil
    NavPerfil --> ProfilePage[AdminProfilePage]
    ProfilePage --> EditDatos[Editar Datos Personales]
    ProfilePage --> EditSchedule[Editar Horario Propio]
    ProfilePage --> ChangePassword[Cambiar Contraseña]
  end

  %% ─── GUARDS ───
  subgraph Guards[Route Guards - Frontend]
    RequireAdmin[RequireAdminRoute - Token valido + kind Admin] -->|Fallo| Login
    RequireAuth[RequireAuthRoute - Token valido] -->|Fallo| Login
  end

  %% ─── 404 ───
  START2(Ruta inexistente) --> NotFound[NotFoundPage *]
  NotFound -->|Click Volver al inicio| Landing

  %% ─── API ───
  subgraph Backend[API Endpoints]
    EP_CREATE[POST /api/appointments → create]:::gateway
    EP_LIST[GET /api/appointments → getAll]:::gateway
    EP_BYID[GET /api/appointments/:id → getById]:::gateway
    EP_CANCEL[PATCH /api/appointments/:id/cancel → cancel]:::gateway
    EP_STATUS[PATCH /api/appointments/:id/status → updateStatus]:::gateway
    EP_RESCHEDULE[PATCH /api/appointments/:id/reschedule → reschedule]:::gateway
    EP_ANONYMOUS[GET /api/appointments/anonymous → getAnonymous]:::gateway
    EP_TEMPLOCK[POST /api/appointments/temp-lock → createTempLock]:::gateway
    EP_RELEASE[DELETE /api/appointments/temp-lock/:tempLockId → releaseTempLock]:::gateway
    EP_LOGOUT[POST /auth/logout → logout]:::gateway
  end

  %% ─── CONEXIONES A BACKEND ───
  Booking -.-> EP_CREATE
  CancelClient -.-> EP_CANCEL
  RescheduleClient -.-> EP_RESCHEDULE
  CompleteAppt -.-> EP_STATUS
  NoShowAppt -.-> EP_STATUS
  CancelAppt -.-> EP_CANCEL
  RescheduleAppt -.-> EP_RESCHEDULE
  ListApptsClient -.-> EP_LIST
  FilterAppts -.-> EP_LIST
  FetchAnonymous -.-> EP_ANONYMOUS
  SlotSelection -.-> EP_TEMPLOCK
  ReleaseLock -.-> EP_RELEASE
  LogoutAction -.-> EP_LOGOUT
  LogoutAdmin -.-> EP_LOGOUT

  %% ─── COLORES POR ROL ───
  class Anon,Landing,Login,Register,Recovery,Booking,StepBarber,StepService,StepDateTime,SlotSelection,ConfirmModal,SuccessModal,AnonymousLookup,InputContact,FetchAnonymous,ListAnonAppts,AnonCancel,ReleaseLock anon
  class Cliente,Dashboard,MyAppts,ListApptsClient,CancelClient,RescheduleClient,PastAppts,EmptyState,LogoutAction client
  class EmpleadoRol,NoteEmpleado empleado
  class AdminRol,AdminRedirect,AdminLayout,NavProfesionales,NavTurnos,NavPerfil,ProfPage,ListProf,CreateProf,EditProf,DeleteProf,ScheduleProf,SlotsProf,ApptsPage,FilterAppts,StatsTurnos,TableAppts,CompleteAppt,NoShowAppt,CancelAppt,RescheduleAppt,ProfilePage,EditDatos,EditSchedule,ChangePassword,LogoutAdmin admin
  class Guards,RequireAdmin,RequireAuth,NotFound publicPg
```
