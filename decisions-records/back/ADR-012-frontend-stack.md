# ADR-012: Frontend Stack (Vite + Tailwind CSS 4 + Framer Motion)

## Contexto

El frontend requería un build tool, un framework de estilos y una librería de animaciones. Se instalaron las dependencias base en el commit `57fdd2f`.

## Decisión

Se adoptó el siguiente stack:

| Herramienta | Versión | Propósito |
|---|---|---|
| Vite | ^8.0.10 | Build tool y dev server con HMR |
| Tailwind CSS | ^4.2.4 | Framework CSS utility-first |
| Framer Motion | ^12.38.0 | Animaciones declarativas |
| React Router DOM | ^7.14.2 | Routing client-side |
| react-icons | ^5.6.0 | Iconografía |
| TypeScript | ~6.0.2 | Lenguaje |

Vite se configuró con `@vitejs/plugin-react` y proxy para `/auth` y `/api` hacia el backend. Tailwind CSS 4 se integró via `@tailwindcss/vite` (plugin nativo de Vite, sin PostCSS config adicional).

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Webpack | Vite es significativamente más rápido en desarrollo (HMR sub-second) |
| CSS Modules / styled-components | Tailwind utility-first es más rápido para prototipado y consistente en equipo |
| CSS transitions / animaciones vanilla | Framer Motion permite animaciones gestuales declarativas con spring physics |
| React Router v6 | v7 ya estaba disponible y es mantenida activamente |

## Consecuencias

- **Positivo**: HMR ultrarrápido con Vite (recarga en milisegundos)
- **Positivo**: Tailwind CSS 4 con plugin Vite elimina la mayor parte de configuración PostCSS
- **Positivo**: Framer Motion permite animaciones fluidas (ej: `AnimatedContainer`) con API declarativa
- **Negativo**: Tailwind CSS 4 es reciente (abril 2026); hay menos recursos de comunidad y posibles breaking changes
- **Negativo**: Framer Motion agrega ~30KB gzipped al bundle
- **Negativo**: react-router-dom v7 tiene cambios en la API respecto a v6; curvas de aprendizaje si el equipo venía de v6

## Estado

Aceptada.
