## Correcciones aplicadas post-review

### Solucionado

| # | Descripción | Archivos | Commit |
|---|---|---|---|
| 2 | **E2E test roto por rename de label** – el test usaba `getByLabel('Especialidades')` pero el formulario ahora expone el label `"Servicios"` | `e2e/professionals/crud.spec.ts` | `5049a8f` |
| 3 | **Inconsistencia UX: labels de lista vs formulario** – la data y el formulario usan `services`/`"Servicios"`, pero la lista aún mostraba `"especialidad"` en el placeholder del buscador y `"Sin especialidades"` en el estado vacío. Se actualizó a `"servicio"` / `"Sin servicios"` junto con las aserciones de los tests | `ProfessionalsList.tsx` (admin + client) · `index.test.tsx` (admin + client) | `045d2d7` |
| 5 | **Documentación: faltaba endpoint `deactivate` en colección Bruno** – se agregó `Desactivar barbero.yml` con método `PATCH /api/barbers/:id/deactivate` | `endpoints-barber/modules/barber crud/Desactivar barbero.yml` | `65fc019` |

### Pendiente (sin resolver)

| # | Descripción | Impacto |
|---|---|---|
| 1 | **`MongoBarberRepository.deactivateBarber()` usa `Employee` discriminator en vez de `BarberModel`** – al ser un discriminator de Mongoose, `Employee.findByIdAndUpdate()` filtra automáticamente por `kind: 'Empleado'`. Si se intenta desactivar un `Admin`, el update no matchea ningún documento y falla silenciosamente (el caso de uso retorna éxito igual). Afecta a `PATCH /:id/deactivate` y `DELETE /:id` (que internamente llama a `deactivateBarber`). | **Alto** – bug de lógica de negocio |
| 4 | **Frontend no expone el endpoint `deactivate`** – `professional.service.ts` no tiene método `deactivate()`, y `barbersSlice.ts` no tiene un thunk dedicado. La nueva funcionalidad `PATCH /api/barbers/:id/deactivate` queda inaccesible desde el frontend. | **Bajo-Medio** – se puede desactivar vía `update` con `{ isActive: false }` |
