export const legalConfig = {
  business: {
    name: 'Barbería Santiago Abbona',
    legalName: 'Santiago Abbona',
    rut: '[A completar: RUT]',
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
            text: `La plataforma es operada por ${B.legalName}, nombre comercial "${B.name}", con RUT ${B.rut}, con domicilio en ${B.address}. Ante cualquier consulta podés contactarte por email a ${B.email} o por teléfono al ${B.phone}.`,
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
              'Si la barbería debe cancelar un turno, te lo comunicaremos a la brevedad y coordinaremos la reprogramación o el reembolso correspondiente.',
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
            text: 'Podés cancelar tu turno dentro del plazo indicado en la "Política de Cancelación y Reembolsos", que forma parte de estos Términos.',
          },
          {
            kind: 'list',
            items: [
              'Si ya pagaste y cancelás dentro del plazo, se gestionará el reembolso o crédito correspondiente.',
              'La no concurrencia al turno sin aviso (no-show) puede generar consecuencias según la política aplicable.',
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
        id: 'responsabilidades-usuario',
        heading: '7. Responsabilidades del usuario',
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
        heading: '8. Responsabilidad de la barbería',
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
        heading: '9. Propiedad intelectual',
        blocks: [
          {
            kind: 'p',
            text: 'El logo, la marca, los diseños, las fotografías, el software y el contenido del sitio son titularidad de la barbería o de sus licenciantes. Queda prohibida su reproducción o uso sin autorización previa por escrito.',
          },
        ],
      },
      {
        id: 'modificaciones',
        heading: '10. Modificaciones',
        blocks: [
          {
            kind: 'p',
            text: 'La barbería puede modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigencia desde su publicación en esta página e informaremos la fecha de última actualización.',
          },
        ],
      },
      {
        id: 'legislacion',
        heading: '11. Legislación aplicable y jurisdicción',
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
            text: `El responsable de la base de datos personales es ${B.legalName}, con RUT ${B.rut}, domicilio en ${B.address}. Consultas: ${B.email} / ${B.phone}.`,
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
            text: 'Al registrarte aceptás los Términos y Condiciones y esta Política de Privacidad. El envío de comunicaciones comerciales (promociones, novedades y ofertas) requiere un consentimiento adicional y separado que podés revocar en cualquier momento.',
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
      'Reglas claras sobre cancelaciones, reprogramaciones y reembolsos de turnos.',
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
            text: `Si cancelás con menos de ${legalConfig.cancelMinHours} horas de anticipación, la cancelación tardía podrá generar las consecuencias indicadas en esta política.`,
          },
          {
            kind: 'p',
            text: 'Si no te presentás al turno (no-show) sin avisar, se registrará la inasistencia. La acumulación de inasistencias puede implicar restricciones a la reserva de nuevos turnos.',
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
              'Si no hay disponibilidad para reprogramar, se te ofrecerá un nuevo turno o el reembolso correspondiente.',
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
            text: 'Si la barbería cancela tu turno por cualquier motivo, te lo comunicaremos y tendrás derecho a:',
          },
          {
            kind: 'list',
            items: [
              'Reprogramar el turno sin costo, o',
              'Recibir un reembolso del importe abonado, o',
              'Un crédito a favor para futuros servicios.',
            ],
          },
        ],
      },
      {
        id: 'pagos-mercadopago',
        heading: '4. Pagos con Mercado Pago',
        blocks: [
          {
            kind: 'p',
            text: 'Cuando corresponda un reembolso de un pago realizado en línea, el mismo se procesará a través de Mercado Pago. El plazo efectivo de acreditación del dinero depende de los tiempos de procesamiento de Mercado Pago y de la entidad emisora de la tarjeta.',
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
        ],
      },
      {
        id: 'desistimiento',
        heading: '6. Nota sobre contratación a distancia',
        blocks: [
          {
            kind: 'p',
            text: '[Esta política podrá completarse con información adicional sobre el derecho de desistimiento en contratación a distancia, conforme a la normativa aplicable.]',
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
        id: 'tipos',
        heading: '2. Tipos de cookies que utilizamos',
        blocks: [
          {
            kind: 'list',
            items: [
              'Cookies necesarias: esenciales para el funcionamiento de la plataforma (por ejemplo, mantener tu sesión iniciada).',
              'Cookies funcionales: recuerdan tus preferencias para mejorar tu experiencia.',
              'Cookies de análisis (analytics): nos ayudan a entender cómo se usa la plataforma para mejorarla.',
              'Cookies publicitarias: se utilizan únicamente si se habilitan comunicaciones comerciales y según el consentimiento correspondiente.',
            ],
          },
          {
            kind: 'p',
            text: '[A completar: proveedores de cookies —por ejemplo, Google Analytics, Mercado Pago, etc.— y su finalidad]',
          },
        ],
      },
      {
        id: 'deshabilitar',
        heading: '3. Cómo deshabilitarlas',
        blocks: [
          {
            kind: 'p',
            text: 'Podés configurar tu navegador para rechazar o eliminar las cookies. Tené en cuenta que algunas funciones de la plataforma pueden no funcionar correctamente si deshabilitás las cookies necesarias.',
          },
        ],
      },
    ],
  },
];
