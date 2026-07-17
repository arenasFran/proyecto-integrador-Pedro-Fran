# Guía de credenciales y flujos MercadoPago

**Fecha:** 2026-07-17

---

## 1. Arquitectura de cuentas y aplicaciones

Tenés dos cuentas de MercadoPago con sus respectivas aplicaciones:

```
Cuenta personal (Pedro Wattimo)
└── integradorTest
    ├── Credenciales: TEST-xxxxxxxx (sandbox)
    ├── Test users: comprador + vendedor
    └── Se usa para: testing básico de preferencias

TestAccountUyVendedor
└── integradorVendedor
    ├── Credenciales: APP_USR-xxxxxxxx (producción)
    ├── Es la app creada DESDE el test user vendedor
    └── Se usa para: Wallet Brick + Checkout Bricks
```

| Cuenta | Aplicación | Tipo credenciales | Test users |
|---|---|---|---|
| Pedro Wattimo | integradorTest | `TEST-` | Comprador + Vendedor |
| TestAccountUyVendedor | integradorVendedor | `APP_USR-` | — (ella misma es el vendedor) |

---

## 2. Qué credenciales para qué flujo

Según la [documentación oficial de MercadoPago para MLU](https://www.mercadopago.com/developers/es/docs/checkout-bricks/integration-test/test-payment-flow):

> "Para probar pagos con redirección a Mercado Pago, necesitarás dos cuentas de prueba: una vendedora y una compradora. En la cuenta vendedora, crea una aplicación y utiliza sus credenciales de producción para crear una preferencia e inicializar el brick. Ingresa a Mercado Pago con la cuenta de prueba compradora."

### Resumen rápido

| Flujo | Access Token | Public Key | ¿Loguearse en MP? | Tarjeta |
|---|---|---|---|---|
| Turno anónimo (guest) | `TEST-` de integradorTest | `TEST-` de integradorTest | No | APRO |
| Tienda logueado | `APP_USR-` de integradorVendedor | `APP_USR-` de integradorVendedor | Sí, comprador test | APRO |
| Membresía | `APP_USR-` de integradorVendedor | `APP_USR-` de integradorVendedor | Sí, comprador test | APRO |

---

## 3. Credenciales actuales en uso

### Backend (`backend-barber/.env`)

```env
MP_ACCESS_TOKEN=APP_USR-6182256402491286-070919-fd7e1e3e1bb3e2d55362919f97b3a976-3530227348
MP_PUBLIC_KEY=APP_USR-2ca61f88-396f-493c-8981-19a248d6a766
MP_WEBHOOK_SECRET=11d39df5db098cf8405bbce93231182ced4cbb55f044094b11c2121508c9023e
MP_NOTIFICATION_URL=https://juggling-lens-bony.ngrok-free.dev/api/payments/webhook
```

### Frontend (`frontend-barber/.env`)

```env
VITE_MP_PUBLIC_KEY=APP_USR-2ca61f88-396f-493c-8981-19a248d6a766
```

---

## 4. Cómo testear cada flujo

### Flujo A — Turno (anónimo, guest en MP)

Si querés que un usuario **anónimo** pague un turno sin loguearse en MP:

| Variable | Credencial |
|---|---|
| `MP_ACCESS_TOKEN` | `TEST-1265997876821937-070811-...` |
| `VITE_MP_PUBLIC_KEY` | `TEST-eacb4b4f-7e36-47cc-807c-125edda4ea64` |

1. Sin loguearte en la app, reservá un turno
2. Elegí **Pagar online**
3. Se abre Wallet Brick → click en el botón
4. En el checkout de MP **NO te loguees**, pagá como invitado
5. Usá tarjeta `5031 7557 3453 0604`, CVV `123`, venc `11/30`, titular `APRO`, doc `12345678`
6. El pago se aprueba

> Nota: Los turnos anónimos son el único flujo que funciona 100% con TEST-.
> Si necesitás este flujo, cambiá temporalmente las credenciales a TEST-.

---

### Flujo B — Tienda (logueado, Wallet Brick)

| Variable | Credencial |
|---|---|
| `MP_ACCESS_TOKEN` | `APP_USR-6182256402491286-070919-...` ✅ |
| `VITE_MP_PUBLIC_KEY` | `APP_USR-2ca61f88-396f-493c-8981-19a248d6a766` ✅ |

1. Logueate en la app con tu usuario (el que tengas registrado)
2. Andá a la tienda, elegí un producto
3. **Pagar online con MercadoPago**
4. Se abre Wallet Brick → click en el botón
5. En el checkout de MP, **logueate con el comprador de prueba**:
   - Usuario: `TESTUSER7718411867332724890`
   - Contraseña: `2ghnLnmCpv`
   - Código verificación (si pide): `184495`
6. Pagá con tarjeta `5031 7557 3453 0604`, CVV `123`, venc `11/30`, titular `APRO`
7. El pago se aprueba

---

### Flujo C — Membresía (logueado, Wallet Brick)

Mismas credenciales que Flujo B. Idéntico procedimiento:

1. Logueate en la app
2. Andá a Membresía
3. **Suscribirme online**
4. Se abre Wallet Brick (mismo modal que tienda)
5. Click en el botón → checkout de MP
6. **Logueate con el comprador de prueba** (datos arriba)
7. Pagá con tarjeta APRO
8. El webhook activa la membresía

---

## 5. ¿Por qué necesito APP_USR- para Wallet Brick?

La [documentación oficial de Checkout Bricks](https://www.mercadopago.com/developers/es/docs/checkout-bricks/integration-test/test-payment-flow) es **explícita**:

1. El Wallet Brick es parte de **Checkout Bricks**, no de Checkout Pro vanilla
2. Checkout Bricks requiere que las preferencias se creen con **credenciales de producción** (APP_USR-) de la cuenta vendedora de prueba
3. Cuando el usuario llega al checkout de MP, debe **loguearse con la cuenta compradora de prueba**
4. Esto simula exactamente el flujo real: un vendedor real + un comprador real

Usar `TEST-` de tu cuenta personal (Pedro Wattimo) mezcla una cuenta real como vendedor (`collector_id: 407441027`) con credenciales de sandbox. Eso **no es un escenario soportado por MP** para Checkout Bricks.

---

## 6. Datos de las cuentas de prueba

| Rol | Username | Password | Código verif. |
|---|---|---|---|
| **Comprador** | `TESTUSER7718411867332724890` | `2ghnLnmCpv` | `184495` |
| **Vendedor** | `TESTUSER6255136428372026124` | `avV1VIlQpM` | `227348` |

Ambas están en la app `integradorTest`, cuenta Pedro Wattimo.
La app `integradorVendedor` se creó desde la cuenta vendedora de prueba.

---

## 7. Webhook Secret

⚠️ **El `MP_WEBHOOK_SECRET` actual** (`11d39df5db098cf...`) puede no ser el correcto para `integradorVendedor`.

Para obtener el secreto correcto:
1. Ir al [panel de MP](https://www.mercadopago.com.uy/developers/panel/app)
2. Seleccionar **integradorVendedor**
3. **Webhooks > Configurar notificaciones**
4. Revelar la clave secreta
5. Actualizar `MP_WEBHOOK_SECRET` en el `.env`

Si no configuraste webhooks en `integradorVendedor`, hacelo:
- URL: `https://juggling-lens-bony.ngrok-free.dev/api/payments/webhook`
- Eventos: **Pagos** y **Planes y suscripciones**
- Guardar → copiar la clave secreta generada

---

## 8. Tarjetas de prueba (MLU)

| Tarjeta | Número | CVV | Venc | Titular | Doc |
|---|---|---|---|---|---|
| Aprobada | `5031 7557 3453 0604` | 123 | 11/30 | `APRO` | 12345678 |
| Rechazada | `3084 4785 0837 2929` | 123 | 11/30 | `OTHE` | 12345678 |
| Pendiente | `5031 7557 3453 0604` | 123 | 11/30 | `CONT` | 12345678 |
