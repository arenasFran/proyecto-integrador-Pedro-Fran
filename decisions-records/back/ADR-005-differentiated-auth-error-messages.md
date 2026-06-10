# ADR-005: Mensajes de error diferenciados por proveedor de autenticación

## Contexto

Durante la auditoría de seguridad, se identificó que al intentar autenticar con Google una cuenta que fue creada originalmente con email/contraseña (local), el mensaje de error revelaba el tipo de cuenta:

> "Esta cuenta fue creada con credenciales locales. Por favor, inicia sesión con tu correo y contraseña."

Y viceversa, al intentar login local en una cuenta Google:

> "Esta cuenta fue creada con Google. Por favor, inicia sesión con Google."

Esto filtra información: un atacante puede determinar si un email está registrado y con qué método. La recomendación de seguridad era unificar los mensajes a un genérico como "Credenciales inválidas".

## Decisión

Se decidió **mantener los mensajes diferenciados** por las siguientes razones:

1. **UX del usuario legítimo**: Un usuario real que olvidó cómo se registró se beneficia del mensaje específico. Si recibe "Credenciales inválidas" podría pensar que su cuenta no existe e intentar registrarse de nuevo, creando duplicados.

2. **El email ya es información pública**: En la mayoría de los flujos el email se ingresa primero (login, reset-password, registro). Un atacante ya puede determinar si un email existe mediante el endpoint de registro o request-reset.

3. **Mitigación práctica**: El vector de ataque (enumeración de cuentas) no se elimina por completo con mensajes genéricos, ya que existen otros endpoints que revelan existencia (request-reset responde "Si el email existe, recibirás un correo" pero el timing puede diferir).

## Consecuencias

- **Positivo**: Mejor experiencia para usuarios legítimos que olvidaron su método de registro.
- **Positivo**: Reduce tickets de soporte por duplicación de cuentas.
- **Negativo**: Un atacante puede determinar el método de autenticación de un email específico.
- **Aceptado**: El riesgo se considera bajo dado que el email ya es identificable por otros medios, y el beneficio UX supera el riesgo de seguridad marginal.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| Mensaje genérico ("Credenciales inválidas") | Mala UX; no ayuda al usuario a resolver el problema |
| Ocultar solo en login pero mostrar en registro | Complejidad inconsistente |

## Estado

Aceptada.
