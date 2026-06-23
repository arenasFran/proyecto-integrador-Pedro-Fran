# LLM Engineering Guideline — Pragmatic Architecture & Quality First

## Objetivo

La arquitectura existe para servir al negocio.

El objetivo NO es aplicar Clean Architecture, DDD, Hexagonal Architecture o cualquier patrón de forma dogmática.

El objetivo es:

- Resolver problemas reales.
- Minimizar complejidad accidental.
- Mantener velocidad de desarrollo.
- Mantener claridad del código.
- Mantener seguridad e integridad de datos.
- Introducir abstracciones únicamente cuando aporten valor.

---

# Regla Fundamental

Antes de crear cualquier archivo, clase, interfaz o capa adicional, responder:

1. ¿Qué problema real resuelve?
2. ¿Qué complejidad elimina?
3. ¿Qué cambio futuro facilita?
4. ¿Qué costo de mantenimiento agrega?

Si no existe una respuesta clara y concreta, NO crear la abstracción.

---

# Principio de Simplicidad

Siempre comenzar por la solución más simple posible.

Preferir:

Route
→ Controller
→ Repository
→ Database

Antes que:

Route
→ Controller
→ UseCase
→ Service
→ Repository Interface
→ Repository
→ Mapper
→ Presenter
→ Database

La complejidad debe ganarse.

Nunca asumirse.

---

# Regla de Escalado

Las abstracciones aparecen cuando el problema las exige.

No antes.

## CRUD simple

- Route
- Controller
- Repository

Nada más.

## Procesos complejos

Crear Use Cases cuando:

- Existe lógica de negocio relevante.
- Hay múltiples pasos coordinados.
- Hay reglas de negocio importantes.
- Hay interacción con varios servicios o repositorios.

---

# Casos de Uso (Use Cases)

Crear un Use Case únicamente si:

- Existe lógica de negocio relevante.
- Coordina múltiples operaciones.
- Aplica reglas de negocio.
- Interactúa con varios repositorios o servicios.

NO crear Use Cases para:

- findAll()
- findById()
- create CRUD simple
- update CRUD simple
- delete CRUD simple

Si el método es un pasamanos hacia el repositorio, mantenerlo en el controller.

---

# Repositorios

Usar implementaciones concretas por defecto.

Crear interfaces únicamente cuando:

- Existan múltiples implementaciones reales.
- Exista una necesidad clara de mocking.
- Exista una dependencia externa reemplazable.
- Haya una decisión arquitectónica concreta que justifique la abstracción.

Una implementación única NO justifica una interfaz.

---

# Value Objects

Crear Value Objects únicamente cuando:

- Protejan invariantes importantes.
- Contengan comportamiento.
- Eviten errores frecuentes.
- Representen conceptos relevantes del dominio.

Evitar wrappers triviales alrededor de string o number.

---

# DTOs

Los DTOs son opcionales.

No crear DTOs cuando:

- Son idénticos a req.body.
- Son idénticos a entity.props.
- Son idénticos a la respuesta HTTP.

Crear DTOs únicamente cuando:

- Existe transformación.
- Existe un contrato externo importante.
- Mejoran claramente la legibilidad.

---

# Mappers

No crear mappers que solo copian propiedades.

Crear mappers únicamente cuando:

- Existan modelos incompatibles.
- Haya transformación de formatos.
- Haya agregación de datos.
- Exista adaptación entre contextos distintos.

---

# Controllers

Los controllers deben ser simples.

Pueden:

- Validar inputs normalizados.
- Llamar repositorios.
- Llamar use cases.
- Manejar respuestas HTTP.

No deben contener lógica de negocio compleja.

Sin embargo:

No extraer lógica a un Use Case si esa lógica son únicamente unas pocas líneas CRUD.

---

# Dominio

Las entidades deben contener:

- Estado relevante.
- Comportamiento de negocio.
- Invariantes importantes.

Evitar:

- Getters repetitivos.
- Boilerplate innecesario.
- Código ceremonial.

---

# Testing

Prioridad:

1. Tests de integración.
2. Tests de flujos críticos.
3. Tests unitarios.

No testear:

- Getters triviales.
- DTOs.
- Mappers triviales.
- Código sin lógica.

Testear:

- Reglas de negocio.
- Casos límite.
- Flujos completos.
- Integración entre componentes.

---

# Seguridad Obligatoria

Toda nueva funcionalidad debe analizar:

- Autenticación.
- Autorización.
- Validación de inputs.
- Rate limiting.
- Protección contra IDOR.
- Protección contra escalamiento de privilegios.
- Protección contra inyección.
- Manejo seguro de errores.

Nunca confiar en datos enviados por el cliente.

---

# Ownership

Toda operación sobre recursos debe verificar ownership.

Ejemplos:

- Un usuario no puede leer recursos ajenos.
- Un usuario no puede modificar recursos ajenos.
- Un usuario no puede eliminar recursos ajenos.
- Un usuario no puede liberar locks ajenos.

---

# Integridad de Datos

Toda modificación debe responder:

- ¿Puede haber concurrencia?
- ¿Puede haber race conditions?
- ¿La operación es atómica?
- ¿Qué ocurre si falla a mitad del flujo?
- ¿Se pueden generar estados inválidos?
- ¿Se rompe alguna invariante de negocio?

---

# Concurrencia

Si dos usuarios ejecutan simultáneamente la misma operación:

Analizar:

- Race conditions.
- Duplicados.
- Estados inconsistentes.
- Locks.
- Transacciones.
- Idempotencia.

---

# Transacciones

Utilizar transacciones cuando una operación:

- Modifica múltiples colecciones.
- Coordina múltiples pasos críticos.
- Puede dejar datos inconsistentes si falla parcialmente.

---

# Flujos Críticos

Requieren tests de integración obligatorios:

- Login.
- Registro.
- Recuperación de contraseña.
- Reserva de turnos.
- Cancelación.
- Reagendamiento.
- Pagos.
- Operaciones administrativas.

---

# Indicadores de Sobreingeniería

Detenerse y reconsiderar si:

- Se crean más de 5 archivos para una funcionalidad simple.
- Se crea una interfaz con una sola implementación.
- Se crea un Use Case que solo llama un repositorio.
- Se crea un Mapper que solo copia propiedades.
- Se crea un DTO idéntico a una entidad.
- Se crea un Value Object sin comportamiento.
- Se agregan más líneas de arquitectura que de negocio.

---

# Proceso Obligatorio Antes de Implementar

1. Analizar el problema.
2. Proponer la solución más simple posible.
3. Justificar cada nueva abstracción.
4. Reutilizar componentes existentes.
5. Evitar duplicación.
6. Implementar.
7. Verificar seguridad.
8. Verificar integridad de datos.
9. Verificar que no se introdujo complejidad innecesaria.

---

# Instrucción Obligatoria para el LLM

Antes de generar código:

- Explicar brevemente qué archivos nuevos se crearán.
- Justificar por qué cada archivo es necesario.
- Justificar cada nueva capa.
- Si una abstracción no puede justificarse claramente, no crearla.

---

# Regla Final

La arquitectura es una herramienta.

No un objetivo.

Favorecer siempre:

- claridad
- simplicidad
- mantenibilidad
- seguridad
- integridad de datos
- velocidad de desarrollo

sobre pureza arquitectónica.
