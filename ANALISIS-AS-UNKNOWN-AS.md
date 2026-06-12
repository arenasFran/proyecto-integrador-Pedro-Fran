# Auditoría `as unknown as` — Análisis y Alternativas

## El problema

En `MongoBarberRepository.ts` (4 ocurrencias) se usa el siguiente patrón:

```ts
return BarberMapper.fromDocument(doc as unknown as IEmployee | IAdmin);
```

`doc` proviene de Mongoose `.lean()`, que devuelve `LeanDocument<IBarberBase>`. Este tipo es un POJO plano, sin los métodos de `Document`. Como `IEmployee` e `IAdmin` extienden `Document`, las asignaciones directas fallan — no por diferencias de datos, sino por incompatibilidad de tipos de clase.

La solución actual (`as unknown as`) **elimina todo el sistema de tipos** en ese punto: primero anula el tipo a `unknown`, luego fuerza el tipo deseado. No hay validación de que los datos reales coincidan con lo esperado.

---

## Alternativas analizadas

### 1. Eliminar `.lean()`

```ts
const doc = await BarberModel.findById(id); // sin .lean()
```

- **Pros:** `doc` retorna `HydratedDocument<IBarberBase>`, que es compatible con `IEmployee | IAdmin`. Sin cast, sin validación extra.
- **Contras:** Mongoose `findById` sin `lean()` retorna objetos Mongoose completos con todos los métodos, getters/setters, y seguimiento de cambios. Esto es más lento y pesado en memoria que un POJO simple. Además, `BarberMapper.fromDocument` solo necesita propiedades planas, no necesita métodos de documento.
- **Industria:** Se usa `lean()` precisamente para evitar HydratedDocuments cuando solo se leen datos. Sacrificar `lean()` por tipo es una solución regresiva.

### 2. Interfaces planas (Data Transfer Objects)

Crear interfaces que **no extiendan `Document`** para representar los datos planos:

```ts
// barber.model.ts
export interface IBarberBaseData {
  _id: string;
  email: string;
  name: string;
  password: string;
  kind?: 'Admin' | 'Empleado';
  // ...
}

// MongoBarberRepository.ts
type LeanDoc = (IBarberBaseData & { kind: 'Empleado' }) | (IBarberBaseData & { kind: 'Admin' });
const doc = await BarberModel.findById(id).lean();
return BarberMapper.fromDocument(doc as unknown as LeanDoc);
```

- **Pros:** Las interfaces planas reflejan exactamente lo que `.lean()` devuelve. No hay dependencias externas.
- **Contras:** Sigue requiriendo algún tipo de cast porque TypeScript no sabe qué discriminador retornó MongoDB. Además, duplicas definiciones de tipos (las basadas en `Document` y las planas). Si el schema cambia, hay que mantener ambos sets sincronizados.
- **Industria:** Patrón común antes de Zod. Sigue siendo un cast manual sin validación runtime.

### 3. Discriminador directo (usar el modelo hijo)

```ts
const doc = await Employee.findById(id).lean();
return BarberMapper.fromDocument(doc as unknown as IEmployee | IAdmin);
```

- **Pros:** Si usas `Employee.find()` en vez de `BarberModel.find()`, el tipo inferido es más cercano a `IEmployee`.
- **Contras:** `Employee.findById` retorna `LeanDocument<IEmployee>`, que sigue sin asignar a `IEmployee` porque `IEmployee` extiende `Document`, y `LeanDocument` elimina los métodos. Además, no resuelve el caso donde un mismo método acepta tanto `IEmployee` como `IAdmin`.
- **Industria:** Útil cuando cada método sabe exactamente qué discriminator necesita, pero poco práctico con repositorios polimórficos.

### 4. Type guard manual

```ts
function isEmployeeData(doc: unknown): doc is IEmployeeData {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;
  return (
    typeof d.email === 'string' &&
    typeof d.name === 'string' &&
    typeof d.password === 'string' &&
    (d.kind === 'Empleado' || d.kind === 'Admin')
  );
}

// Uso:
if (!isEmployeeData(doc)) throw new Error('Datos inválidos');
return BarberMapper.fromDocument(doc);
```

- **Pros:** Sin dependencias. Valida en runtime que las propiedades existan. TypeScript infiere el tipo automáticamente tras el guard.
- **Contras:** Validación manual, verbosa, propensa a omitir campos. Escala mal si hay muchos schemas o si evolucionan frecuentemente.
- **Industria:** Se usa para casos puntuales, no como estrategia general. Es mantenible solo si tienes pocos tipos y cambian poco.

### 5. Zod (y io-ts, Valibot, ArkType)

```ts
import { z } from 'zod';

const EmployeeSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string(),
  kind: z.literal('Empleado'),
  specialties: z.array(z.string()),
  // ...
});

// Uso:
const parsed = EmployeeSchema.or(AdminSchema).parse(doc);
return BarberMapper.fromDocument(parsed);
// parsed es inferido automáticamente como IEmployeeData | IAdminData
```

- **Pros:**
  - Validación runtime completa: si MongoDB devuelve datos corruptos, el error se captura aquí, no en una NullPointerException 20 calls después.
  - El tipo se **infiere automáticamente** del schema: zero gap entre validación y tipo.
  - Esquemas componibles y reutilizables. Escalan bien.
  - `z.infer<typeof EmployeeSchema>` es el tipo, no hay duplicación manual.
- **Contras:**
  - Dependencia externa (~7KB gzip).
  - Curva de aprendizaje inicial del DSL.
  - Puede ser overkill si el schema es trivial y no cambia nunca.
- **Industria:** Líder indiscutible. Zod es el estándar de facto para validación runtime en TypeScript (18M+ descargas semanales). Usado por proyectos como tRPC, Next.js, Astro. Se considera *best practice* poner Zod en todas las fronteras del sistema (DB, API externa, archivos, environment variables).

---

## Recomendación

| Contexto | Alternativa recomendada | Razón |
|----------|------------------------|-------|
| **`MongoBarberRepository.ts`** (producción, 4 críticos) | **Zod** | Es una frontera de sistema (DB). Los datos externos deben validarse en runtime, no silenciarse con cast. Es la práctica estándar en la industria. |
| **`useFormValidation`** (producción, 5 moderados) | **Hook genérico** | No necesita validación runtime. Solo arreglar la firma de TypeScript. |

Si no quieres instalar dependencias, la alternativa más segura es **type guard manual** + **interfaces planas**, aunque implica más código y mantenimiento manual.
