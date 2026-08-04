/**
 * Credenciales isa-patyia — dos tokens, dos servicios.
 *
 * | Kind | Token              | Origen              | Uso |
 * | app  | AppSession JWT     | system-login        | Gateway, bridge MSSQL, publish instrucciones, portal-jwt BD, permisos |
 * | paty | JWT portal InSoft  | ContaPyme (staging=prod) | Chat directo AyudasCP-IA (conversaciones, mensajes SSE) |
 *
 * Regla: nunca enviar el JWT Paty al orquestador/bridge ni el AppSession a ayudascp-ia-staging.
 */
import { Session } from "../core/platform.ts";
import type { PatyJwtRecord } from "../core/patyia-jwt.ts";

export type PatyiaTokenKind = "app" | "paty";

/** Evento DOM al cambiar el JWT Paty (sessionStorage). */
export const PATY_JWT_EVENT = "isa-patyia:paty-jwt";

/** Servicios → token requerido (referencia para nuevos endpoints). */
export const SERVICE_TOKEN: Record<string, PatyiaTokenKind> = {
  "gateway/bridge": "app",
  "gateway/publish": "app",
  "auth/portal-jwt": "app",
  "paty/chat-api": "paty",
};

/** Cabeceras ISA PatyIA (system-login). Orquestador + puente Azure + CRUD portal-jwt. */
export function appAuthHeaders(): Record<string, string> {
  if (!Session.isLoggedIn()) return {};
  return { ...Session.authHeader(), ...Session.appHeader() };
}

/** Cabeceras JWT Paty producción (AyudasCP-IA staging). Solo API chat directa. */
export function patyAuthHeaders(jwt: PatyJwtRecord, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${jwt.token}`,
    Accept: "application/json",
    ...extra,
  };
}

export function assertAppSession(): void {
  if (!Session.isLoggedIn()) {
    throw new Error("Inicia sesión en ISA PatyIA para continuar");
  }
}

export function assertPatyJwt(jwt: PatyJwtRecord | null | undefined): asserts jwt is PatyJwtRecord {
  if (!jwt?.token?.trim()) {
    throw new Error("Inicia sesión o configura un JWT ContaPyme para usar el chat Paty");
  }
}
