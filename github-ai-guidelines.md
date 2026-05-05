# Lineamientos de IA para Interacción con GitHub

## 1. Estrategia de Ramas (Branch Strategy)

El proyecto adopta un **Feature Branch Workflow** adaptado a equipo pequeño.

| Rama               | Propósito                       | Ambiente        |
| ------------------ | ------------------------------- | --------------- |
| `main`             | Versiones estables y deployadas | Producción      |
| `develop`          | Integración de funcionalidades  | Staging / Local |
| `feature/<nombre>` | Nueva funcionalidad o mejora    | Local           |
| `hotfix/<nombre>`  | Corrección urgente desde `main` | Producción      |

**Reglas para la IA:**

- Nunca generar código directamente sobre `main` o `develop`.
- Siempre crear o sugerir la rama `feature/` correspondiente antes de proponer cambios.
- Los `hotfix/` deben ramificarse desde `main`, no desde `develop`.
- Nombrar ramas en **kebab-case** descriptivo: `feature/reserva-turno`, `hotfix/fix-slot-overlap`.

---

## 2. Commits

- Usar **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Mensajes en **español** para alinearse con el lenguaje del equipo.
- Commits atómicos: un cambio lógico por commit, no acumular múltiples features.
- No commitear archivos de entorno (`.env`, secrets, credenciales).

```
feat: agregar validación de solapamiento de turnos
fix: corregir cálculo de comisión en cierre de caja
docs: actualizar README con instrucciones de deploy
```

---

## 3. Pull Requests (PRs)

- Todo PR va de `feature/` → `develop` (nunca directo a `main`).
- **Obligatorio:** revisión cruzada y aprobación del otro integrante antes del merge.
- El PR debe incluir descripción del cambio, RF(s) cubiertos y cómo probar localmente.
- La IA puede sugerir el template del PR pero no aprobarlo ni mergearlo de forma autónoma.
- El merge a `main` solo ocurre cuando `develop` está validado y estable.

---

## 4. Versionado Semántico

Seguir el esquema `MAJOR.MINOR.PATCH`:

| Componente | Cuándo incrementar                                        |
| ---------- | --------------------------------------------------------- |
| `MAJOR`    | Cambios incompatibles o reestructuraciones significativas |
| `MINOR`    | Nueva funcionalidad (nuevo RF implementado)               |
| `PATCH`    | Corrección de bug sin afectar funcionalidad               |

La IA debe sugerir el bump de versión correcto al cerrar un sprint o preparar un release.

---

## 5. GitHub Actions (CI/CD)

- El deploy a producción se dispara **automáticamente** por cada push a `main`.
- La IA no debe sugerir push a `main` sin pasar por el flujo de PR y revisión.
- Tareas recomendadas en el workflow:
  - Lint y type-check (TypeScript)
  - Ejecución de tests unitarios
  - Build de producción
  - Deploy a Azure

---

## 6. Gestión del Repositorio

- El repositorio es centralizado en GitHub, accesible para todo el equipo.
- No pushear dependencias (`node_modules/`), archivos de build (`dist/`) ni archivos de IDE.
- Mantener `.gitignore` actualizado para el stack Node.js + React.
- Variables de entorno siempre en `.env` (no trackeado) con ejemplo en `.env.example`.

---

## 7. Lineamientos Adicionales para IA en el IDE

### Generación de código

- Respetar el stack definido: **Node.js, Express, TypeScript, MongoDB, React**.
- Todo código TypeScript debe ser tipado estrictamente (`strict: true`).
- Seguir la arquitectura cliente-servidor definida; no mezclar responsabilidades entre capas.

### Seguridad

- Nunca generar ni sugerir hardcodear credenciales, API keys o secrets en el código.
- El módulo de 2FA (autenticación de doble factor) para roles administrativos es obligatorio y no debe ser omitido o simplificado.
- Validar y sanitizar todas las entradas del usuario antes de persistirlas en MongoDB.

### Testing

- Al implementar un RF, sugerir al menos un test unitario asociado.
- Los módulos de IA (visagismo/análisis facial) requieren tests de precisión y manejo de errores (rostros no detectados, imágenes inválidas).
- Respetar el plan SQA: tests unitarios, de integración y UAT.

### Módulo de IA (Visagismo)

- El procesamiento de imagen debe realizarse en el **backend**, no en el cliente.
- El tiempo de respuesta objetivo es **< 5 segundos** por análisis facial.
- Incluir validación explícita de que la imagen contiene un rostro humano antes de procesar.
- Manejar errores de forma descriptiva para el usuario final.

### Chatbot (Telegram + n8n)

- La integración del chatbot debe estar desacoplada del core del sistema (no acoplar lógica de reservas directamente al bot).
- Cualquier cambio en el flujo de reservas debe reflejarse también en el flujo del chatbot.

### Nomenclatura y estructura

- Archivos en **camelCase** para TypeScript/JS, **PascalCase** para componentes React.
- Rutas de API en **kebab-case**: `/api/reservas-turno`, `/api/gestion-clientes`.
- Separar claramente módulos: `auth`, `reservas`, `clientes`, `profesionales`, `ecommerce`, `ia`, `dashboard`.

---

## 8. Resumen de Restricciones Absolutas

| ❌ Prohibido                             | ✅ Correcto                                  |
| ---------------------------------------- | -------------------------------------------- |
| Push directo a `main` o `develop`        | Crear rama `feature/` y abrir PR             |
| Secrets en código fuente                 | Usar variables de entorno                    |
| Merge sin revisión del par               | Revisión cruzada obligatoria antes del merge |
| Commits con múltiples features mezcladas | Un commit por cambio lógico                  |
| Deploy manual a producción               | Solo vía GitHub Actions al pushear a `main`  |
