export const legalConfig = {
  business: {
    name: 'Barbería Santiago Abbona',
    legalName: 'Santiago Abbona',
    address: 'Avenida Artigas 397, Uruguay',
    email: 'santiagoabbona@gmail.com',
    phone: '+598 92 757 878',
  },
  termsVersion: '1.0',
  privacyVersion: '1.0',
  cancellationsVersion: '1.0',
  cookiesVersion: '1.0',
  lastUpdated: '15 de agosto de 2026',
  cancelMinHours: 2,
};

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] };

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  version: string;
  description: string;
  sections: LegalSection[];
};

const B = legalConfig.business;

export const legalDocuments: LegalDocument[] = [
  {
    slug: 'terminos',
    title: 'Términos y Condiciones de Uso',
    version: legalConfig.termsVersion,
    description:
      'Estos Términos y Condiciones regulan el uso de la plataforma y la reserva de turnos.',
    sections: [
      {
        id: 'identificacion',
        heading: '1. Identificación del negocio',
        blocks: [
          {
            kind: 'p',
            text: `La plataforma es operada por ${B.legalName}, nombre comercial "${B.name}", con domicilio en ${B.address}. Ante cualquier consulta podés contactarte por email a ${B.email} o por teléfono al ${B.phone}.`,
          },
        ],
      },
      {
        id: 'objeto',
        heading: '2. Objeto del servicio',
        blocks: [
          {
            kind: 'p',
            text: 'La plataforma permite a los usuarios:',
          },
          {
            kind: 'list',
            items: [
              'Registrarse y crear una cuenta de usuario.',
              'Reservar turnos para los servicios ofrecidos por la barbería.',
              'Pagar en línea los turnos a través de Mercado Pago.',
              'Pagar en el local el día del turno.',
              'Comprar productos y/o servicios que la barbería ofrezca en su tienda.',
            ],
          },
        ],
      },
      {
        id: 'registro',
        heading: '3. Registro de usuarios',
        blocks: [
          { kind: 'p', text: 'Para usar la plataforma podés registrarte proporcionando datos personales verdaderos y completos.' },
          { kind: 'p', text: 'Sos responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades realizadas con tu cuenta.' },
          {
            kind: 'list',
            items: [
              'Está prohibido crear cuentas falsas o con datos de terceros sin autorización.',
              'Está prohibido crear múltiples cuentas con el fin de eludir sanciones o restricciones.',
              'La barbería se reserva el derecho de suspender o eliminar cuentas ante un uso indebido.',
            ],
          },
        ],
      },
      {
        id: 'turnos',
        heading: '4. Funcionamiento de los turnos',
        blocks: [
          { kind: 'p', text: 'Para reservar un turno deberás seleccionar barbero, servicio, fecha y hora, y confirmar la reserva.' },
          { kind: 'p', text: 'Un turno se considera confirmado cuando la reserva es registrada y se te notifica la confirmación.' },
          {
            kind: 'list',
            items: [
              'La duración del turno depende del servicio seleccionado.',
              'Si llegás tarde, es posible que el turno deba acortarse o reprogramarse según la disponibilidad.',
              'Si la barbería debe cancelar un turno, te lo comunicaremos a la brevedad y coordinaremos la reprogramación del mismo.',
            ],
          },
        ],
      },
      {
        id: 'cancelaciones',
        heading: '5. Cancelaciones y reprogramaciones',
        blocks: [
          {
            kind: 'p',
            text: 'Podés cancelar tu turno dentro del plazo indicado en la "Política de Cancelación, Reprogramación y Reembolsos", que forma parte de estos Términos.',
          },
          {
            kind: 'list',
            items: [
              'Los pagos realizados en línea no son reembolsables: si cancelás un turno que ya pagaste, el importe abonado no será devuelto.',
              'Si no asistís a un turno reservado sin avisar previamente, se registrará la inasistencia según se detalla en la política de cancelaciones.',
              'Las reprogramaciones están sujetas a disponibilidad.',
            ],
          },
        ],
      },
      {
        id: 'precios-pagos',
        heading: '6. Precios y pagos',
        blocks: [
          { kind: 'p', text: 'Los precios de los servicios y productos se informan de manera clara antes de confirmar la operación.' },
          {
            kind: 'list',
            items: [
              'Pago en línea: se procesa a través de Mercado Pago. El pago se considera realizado cuando la transacción es aprobada.',
              'Pago en el local: se abona el día del turno, salvo que se haya contratado un pago anticipado.',
              'Los impuestos se incluyen en el precio final informado cuando corresponda.',
            ],
          },
        ],
      },
      {
        id: 'membresias',
        heading: '7. Membresías',
        blocks: [
          {
            kind: 'p',
            text: 'La membresía mensual de la barbería incluye beneficios vigentes por un período de 30 días:',
          },
          {
            kind: 'list',
            items: [
              'Cuatro (4) cupones de corte para canjear en turnos.',
              'Diez por ciento (10%) de descuento en productos de la tienda.',
            ],
          },
          {
            kind: 'p',
            text: 'Los cupones se canjean al reservar un turno con la membresía. La membresía es personal e intransferible. El pago puede realizarse en línea a través de Mercado Pago o en el local; si el pago queda pendiente de confirmación, la membresía no se activará hasta que se verifique.',
          },
        ],
      },
      {
        id: 'responsabilidades-usuario',
        heading: '8. Responsabilidades del usuario',
        blocks: [
          {
            kind: 'list',
            items: [
              'Proporcionar información correcta y actualizada.',
              'No utilizar la plataforma de forma fraudulenta o para actividades ilícitas.',
              'No intentar vulnerar la seguridad de la plataforma.',
              'No suplantar la identidad de terceros.',
            ],
          },
        ],
      },
      {
        id: 'responsabilidad-barberia',
        heading: '9. Responsabilidad de la barbería',
        blocks: [
          {
            kind: 'p',
            text: 'La barbería se compromete a prestar los servicios contratados de forma diligente. La disponibilidad de la plataforma puede verse afectada por tareas de mantenimiento o causas de fuerza mayor; en esos casos se procurará restablecer el servicio a la brevedad.',
          },
          {
            kind: 'p',
            text: 'Esta cláusula no limita los derechos que te reconoce la ley uruguaya, en particular la Ley N° 17.250 de Relaciones de Consumo.',
          },
        ],
      },
      {
        id: 'propiedad-intelectual',
        heading: '10. Propiedad intelectual',
        blocks: [
          {
            kind: 'p',
            text: 'El logo, la marca, los diseños, las fotografías, el software y el contenido del sitio son titularidad de la barbería o de sus licenciantes. Queda prohibida su reproducción o uso sin autorización previa por escrito.',
          },
        ],
      },
      {
        id: 'modificaciones',
        heading: '11. Modificaciones',
        blocks: [
          {
            kind: 'p',
            text: 'La barbería puede modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigencia desde su publicación en esta página e informaremos la fecha de última actualización.',
          },
        ],
      },
      {
        id: 'legislacion',
        heading: '12. Legislación aplicable y jurisdicción',
        blocks: [
          {
            kind: 'p',
            text: 'Estos Términos y Condiciones se rigen por las leyes de la República Oriental del Uruguay. Para cualquier controversia será competente la justicia ordinaria de Montevideo, sin perjuicio de los derechos que la legislación de defensa del consumidor reconoce a los usuarios.',
          },
        ],
      },
    ],
  },
  {
    slug: 'privacidad',
    title: 'Política de Privacidad',
    version: legalConfig.privacyVersion,
    description:
      'Conocé qué datos recopilamos, cómo los usamos y qué derechos tenés sobre ellos.',
    sections: [
      {
        id: 'responsable',
        heading: '1. Responsable del tratamiento',
        blocks: [
          {
            kind: 'p',
            text: `El responsable de la base de datos personales es ${B.legalName}, domicilio en ${B.address}. Consultas: ${B.email} / ${B.phone}.`,
          },
        ],
      },
      {
        id: 'datos-recopilados',
        heading: '2. Datos que recopilamos',
        blocks: [
          {
            kind: 'list',
            items: [
              'Datos de identificación y contacto: nombre, apellido, email, teléfono.',
              'Datos de cuenta: credenciales de acceso y preferencias.',
              'Historial de turnos reservados.',
              'Historial de compras y pagos.',
              'Datos técnicos: dirección IP y registros de uso, cuando corresponda.',
              'Cookies, según se detalla en la Política de Cookies.',
            ],
          },
        ],
      },
      {
        id: 'finalidades',
        heading: '3. Finalidades del tratamiento',
        blocks: [
          {
            kind: 'list',
            items: [
              'Crear y administrar tu cuenta.',
              'Gestionar la reserva de turnos.',
              'Enviar confirmaciones y recordatorios.',
              'Procesar pagos.',
              'Contactarte ante cambios o novedades de tu reserva.',
              'Seguridad y prevención de fraude.',
              'Cumplir obligaciones legales.',
            ],
          },
        ],
      },
      {
        id: 'consentimiento',
        heading: '4. Consentimiento',
        blocks: [
          {
            kind: 'p',
            text: 'Al registrarte aceptás los Términos y Condiciones y esta Política de Privacidad.',
          },
        ],
      },
      {
        id: 'compartir',
        heading: '5. Con quién compartimos tus datos',
        blocks: [
          {
            kind: 'list',
            items: [
              'Mercado Pago recibe los datos necesarios para procesar los pagos en línea.',
              'Proveedores de infraestructura y servicios que utilizamos para operar la plataforma (por ejemplo, servicios de hosting, almacenamiento en la nube e imágenes).',
            ],
          },
          {
            kind: 'p',
            text: 'No vendemos tus datos personales a terceros.',
          },
        ],
      },
      {
        id: 'almacenamiento',
        heading: '6. Dónde se almacenan los datos',
        blocks: [
          {
            kind: 'p',
            text: 'Los datos se almacenan en infraestructura en la nube: MongoDB Atlas para la base de datos, AWS para servicios complementarios y Cloudinary para el almacenamiento de imágenes.',
          },
        ],
      },
      {
        id: 'conservacion',
        heading: '7. Tiempo de conservación',
        blocks: [
          {
            kind: 'p',
            text: 'Conservamos tus datos únicamente durante el tiempo necesario para las finalidades descritas en esta política y para cumplir con las obligaciones legales aplicables. Al finalizar ese plazo, los datos se eliminan o se anonimizan.',
          },
        ],
      },
      {
        id: 'derechos',
        heading: '8. Derechos del usuario',
        blocks: [
          {
            kind: 'p',
            text: 'La Ley N° 18.331 de Protección de Datos Personales y la Unidad Reguladora y de Control de Datos Personales (URCDP) te reconocen los siguientes derechos:',
          },
          {
            kind: 'list',
            items: [
              'Acceso a tus datos personales.',
              'Rectificación de datos inexactos.',
              'Actualización de tus datos.',
              'Supresión o eliminación, cuando corresponda.',
              'Oposición al tratamiento, cuando corresponda.',
            ],
          },
          {
            kind: 'p',
            text: `Para ejercer estos derechos escribinos a ${B.email}.`,
          },
        ],
      },
      {
        id: 'seguridad',
        heading: '9. Seguridad de la información',
        blocks: [
          {
            kind: 'p',
            text: 'Adoptamos medidas técnicas y organizativas razonables para proteger tus datos personales contra accesos no autorizados, pérdida o alteración.',
          },
        ],
      },
      {
        id: 'urcdp',
        heading: '10. Registro ante la URCDP',
        blocks: [
          {
            kind: 'p',
            text: 'La base de datos de datos personales aún no está registrada ante la URCDP.',
          },
        ],
      },
      {
        id: 'contacto-privacidad',
        heading: '11. Contacto',
        blocks: [
          {
            kind: 'p',
            text: `Ante cualquier consulta sobre esta política o el tratamiento de tus datos, contactanos en ${B.email} o ${B.phone}.`,
          },
        ],
      },
    ],
  },
  {
    slug: 'cancelaciones',
    title: 'Política de Cancelación, Reprogramación y Reembolsos',
    version: legalConfig.cancellationsVersion,
    description:
      'Reglas claras sobre cancelaciones, reprogramaciones y reembolsos de turnos. Los pagos en línea no son reembolsables.',
    sections: [
      {
        id: 'cancelacion-turno',
        heading: '1. Cancelación de tu turno',
        blocks: [
          {
            kind: 'p',
            text: `Podés cancelar tu turno sin costo con al menos ${legalConfig.cancelMinHours} horas de anticipación a la hora reservada.`,
          },
          {
            kind: 'p',
            text: `Si intentás cancelar con menos de ${legalConfig.cancelMinHours} horas de anticipación, la cancelación será rechazada por la plataforma y el turno se mantendrá vigente. En caso de que el turno haya sido pagado en línea, el importe no será reembolsado.`,
          },
        ],
      },
      {
        id: 'reprogramacion',
        heading: '2. Reprogramación',
        blocks: [
          {
            kind: 'list',
            items: [
              'Podés reprogramar tu turno dentro de los plazos y la disponibilidad existente.',
              'Las reprogramaciones están sujetas a la disponibilidad de agenda.',
              'Si no hay disponibilidad para reprogramar, se te ofrecerá un nuevo turno.',
            ],
          },
        ],
      },
      {
        id: 'cancelacion-barberia',
        heading: '3. Cancelación por parte de la barbería',
        blocks: [
          {
            kind: 'p',
            text: 'Si la barbería cancela tu turno por cualquier motivo, te lo comunicaremos y podrás reprogramar el turno sin costo.',
          },
        ],
      },
      {
        id: 'pagos-mercadopago',
        heading: '4. Pagos con Mercado Pago',
        blocks: [
          {
            kind: 'p',
            text: 'Los pagos realizados en línea no son reembolsables. Si cancelás tu turno o no te presentás al mismo, el importe abonado no será devuelto.',
          },
        ],
      },
      {
        id: 'pagos-local',
        heading: '5. Pagos en el local',
        blocks: [
          {
            kind: 'p',
            text: 'Si reservaste con pago en el local, la reserva queda registrada con tus datos y no se realiza ningún cobro anticipado. Si cancelás el turno, simplemente la reserva se libera.',
          },
          {
            kind: 'p',
            text: `Si canjeaste un cupón de membresía y cancelás el turno con al menos ${legalConfig.cancelMinHours} horas de anticipación, el cupón se restaura para su uso en un futuro turno. Si cancelás fuera de ese plazo, el cupón se considera utilizado.`,
          },
        ],
      },
      {
        id: 'inasistencias',
        heading: '6. Inasistencias',
        blocks: [
          {
            kind: 'p',
            text: 'Si no asistís a un turno reservado sin avisar previamente, se registrará la inasistencia. La acumulación de inasistencias puede limitar tu posibilidad de reservar nuevos turnos.',
          },
          {
            kind: 'p',
            text: 'Al acumular tres inasistencias, no podrás reservar nuevos turnos hasta que la barbería lo habilite. El registro de inasistencias se puede consultar y aclarar contactando a la barbería.',
          },
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Política de Cookies',
    version: legalConfig.cookiesVersion,
    description:
      'Cómo usamos las cookies y tecnologías similares en esta plataforma.',
    sections: [
      {
        id: 'que-son',
        heading: '1. ¿Qué son las cookies?',
        blocks: [
          {
            kind: 'p',
            text: 'Las cookies son pequeños archivos que se almacenan en tu dispositivo cuando visitás un sitio web. Permiten reconocer tu navegador y recordar información sobre tu visita.',
          },
        ],
      },
      {
        id: 'que-usamos',
        heading: '2. Cookies que utilizamos',
        blocks: [
          {
            kind: 'p',
            text: 'Actualmente solo utilizamos cookies estrictamente necesarias para el funcionamiento de la plataforma:',
          },
          {
            kind: 'list',
            items: [
              'refreshToken: mantiene tu sesión iniciada y permite la renovación automática del acceso sin que tengas que volver a loguearte.',
            ],
          },
          {
            kind: 'p',
            text: 'No utilizamos cookies de análisis, funcionales ni publicitarias. No realizamos seguimiento de tu actividad ni compartimos datos con terceros con fines de marketing o analítica.',
          },
          {
            kind: 'p',
            text: 'Si en el futuro incorporamos herramientas de analítica o publicidad, esta política será actualizada y se solicitará tu consentimiento antes de activarlas.',
          },
        ],
      },
      {
        id: 'deshabilitar',
        heading: '3. Cómo deshabilitarlas',
        blocks: [
          {
            kind: 'p',
            text: 'Podés configurar tu navegador para bloquear o eliminar cookies. Tené en cuenta que la cookie necesaria (refreshToken) es indispensable para mantener tu sesión activa: si la deshabilitás, se cerrará tu sesión y deberás iniciar sesión nuevamente cada vez que accedas a la plataforma.',
          },
        ],
      },
    ],
  },
];
