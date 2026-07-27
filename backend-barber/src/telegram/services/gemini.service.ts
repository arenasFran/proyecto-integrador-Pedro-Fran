import { getConfig } from '../../infrastructure/config/env';
import type { ServiceDTO, BarberDTO } from './backendClient';

export interface GeminiBookingIntent {
  intent: 'crear_turno' | 'cancelar_turno' | 'consultar_turnos' | 'saludo' | 'otro';
  servicio: string | null;
  barbero: string | null;
  fecha: string | null;
  hora: string | null;
  campos_faltantes: string[];
  confianza_baja: boolean;
}

const SYSTEM_PROMPT = `Sos un asistente que extrae intención de reserva de una barbería a partir de un mensaje de un cliente.
Reglas:
- Nunca inventes nombres de servicios ni de barberos que no estén en las listas provistas.
- Si el mensaje no permite determinar un campo con certeza, ponelo en null y agregalo a campos_faltantes.
- Si tenés dudas razonables sobre cualquier campo, poné confianza_baja: true.
- Nunca confirmes disponibilidad: eso lo valida otro sistema.
- Respondé ÚNICAMENTE JSON con este shape exacto, sin texto adicional ni markdown:
{"intent":"crear_turno|cancelar_turno|consultar_turnos|saludo|otro","servicio":string|null,"barbero":string|null,"fecha":"YYYY-MM-DD"|null,"hora":"HH:mm"|null,"campos_faltantes":string[],"confianza_baja":boolean}`;

function buildUserPrompt(
  text: string,
  ctx: { services: ServiceDTO[]; barbers: BarberDTO[]; todayISO: string }
): string {
  const services = ctx.services.map((s) => s.name).join(', ') || 'ninguno';
  const barbers = ctx.barbers.map((b) => `${b.name} ${b.lastname}`).join(', ') || 'ninguno';
  return `Fecha de hoy: ${ctx.todayISO}
Servicios disponibles: ${services}
Barberos disponibles: ${barbers}

Mensaje del cliente: "${text}"`;
}

function isValidIntent(value: unknown): value is GeminiBookingIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.intent === 'string' &&
    (v.servicio === null || typeof v.servicio === 'string') &&
    (v.barbero === null || typeof v.barbero === 'string') &&
    (v.fecha === null || typeof v.fecha === 'string') &&
    (v.hora === null || typeof v.hora === 'string') &&
    Array.isArray(v.campos_faltantes) &&
    typeof v.confianza_baja === 'boolean'
  );
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<unknown | null> {
  const { apiKey, model } = getConfig().gemini;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[GeminiService] Respuesta no OK (${res.status}).`);
      return null;
    }

    const body = await res.json().catch(() => null);
    const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== 'string') return null;

    return JSON.parse(rawText);
  } catch (error) {
    console.warn('[GeminiService] Error llamando a Gemini:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractBookingIntent(
  text: string,
  ctx: { services: ServiceDTO[]; barbers: BarberDTO[]; todayISO: string }
): Promise<GeminiBookingIntent | null> {
  const parsed = await callGemini(SYSTEM_PROMPT, buildUserPrompt(text, ctx));
  return isValidIntent(parsed) ? parsed : null;
}

export interface GeneralIntent {
  intent: 'productos' | 'misturnos' | 'cancelar' | 'reservar' | 'otro';
  confianza_baja: boolean;
}

const GENERAL_SYSTEM_PROMPT = `Sos un asistente que clasifica la intención de un mensaje de un cliente de una barbería, entre estas opciones:
- "productos": el cliente quiere saber qué productos hay disponibles o sus precios.
- "misturnos": el cliente quiere ver sus turnos reservados.
- "cancelar": el cliente quiere cancelar un turno.
- "reservar": el cliente quiere reservar un turno nuevo.
- "otro": cualquier otra cosa (saludos, preguntas no relacionadas, ambigüedad).
Si tenés dudas razonables, marcá confianza_baja: true.
Respondé ÚNICAMENTE JSON con este shape exacto, sin texto adicional ni markdown:
{"intent":"productos|misturnos|cancelar|reservar|otro","confianza_baja":boolean}`;

function isValidGeneralIntent(value: unknown): value is GeneralIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.intent === 'string' &&
    ['productos', 'misturnos', 'cancelar', 'reservar', 'otro'].includes(v.intent as string) &&
    typeof v.confianza_baja === 'boolean'
  );
}

export async function classifyGeneralIntent(text: string): Promise<GeneralIntent | null> {
  const parsed = await callGemini(GENERAL_SYSTEM_PROMPT, text);
  return isValidGeneralIntent(parsed) ? parsed : null;
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchService(name: string | null, services: ServiceDTO[]): ServiceDTO | undefined {
  if (!name) return undefined;
  const n = normalize(name);
  return (
    services.find((s) => normalize(s.name) === n) ??
    services.find((s) => normalize(s.name).includes(n) || n.includes(normalize(s.name)))
  );
}

export function matchBarber(name: string | null, barbers: BarberDTO[]): BarberDTO | undefined {
  if (!name) return undefined;
  const n = normalize(name);
  return (
    barbers.find((b) => normalize(`${b.name} ${b.lastname}`) === n) ??
    barbers.find(
      (b) =>
        normalize(`${b.name} ${b.lastname}`).includes(n) ||
        normalize(b.name) === n ||
        normalize(b.lastname) === n
    )
  );
}
