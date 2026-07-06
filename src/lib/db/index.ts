import Dexie, { type EntityTable } from "dexie";

// Una instalación = un paciente. Sin usuarios, sin roles, sin filtros (§2).

export interface Perfil {
  id?: number;
  nombre: string;
  fechaNacimiento?: string; // ISO yyyy-mm-dd
  diagnostico?: string;
  idioma?: string;
}

export interface Marcador {
  id?: number;
  nombre: string;
  fecha: string; // ISO yyyy-mm-dd
  valor: number;
  unidad: string;
  documentoId?: number;
}

export interface Sintoma {
  id?: number;
  fecha: string;
  tipo: string;
  escala: number; // 0-10
  nota?: string;
}

export interface TomaMedicacion {
  fecha: string;
  nota?: string;
}

export interface Medicacion {
  id?: number;
  nombre: string;
  dosis?: string;
  ultimaToma?: string;
  proximaFecha?: string;
  historial: TomaMedicacion[];
}

export interface Cita {
  id?: number;
  fecha: string; // ISO yyyy-mm-dd
  hora?: string; // HH:mm
  especialista?: string;
  centro?: string;
  notas?: string;
}

export interface Pregunta {
  id?: number;
  texto: string;
  citaId?: number;
  creada: string;
  resuelta: 0 | 1; // número para poder indexar en Dexie
}

export interface Documento {
  id?: number;
  nombre: string;
  tipo: string; // MIME
  fecha: string;
  blob: Blob;
}

export interface SesionApoyo {
  id?: number;
  fecha: string;
  tipo: "terapia" | "psico-oncologia" | "otra";
  notas?: string;
  proximaSesion?: string;
}

export interface MensajeAsistente {
  id?: number;
  fecha: string; // ISO datetime
  rol: "user" | "assistant";
  texto: string;
}

export interface RadarPerfil {
  id?: number;
  tipoTumor?: string;
  localizacion?: string;
  palabrasClave?: string;
  ultimaBusqueda?: string; // ISO datetime
  ultimoResumen?: string;
}

export interface Ajustes {
  id?: number;
  tema: "claro" | "oscuro";
  pinHash?: string;
  pinSalt?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  apiModelo?: string;
  ultimoBackup?: string; // ISO datetime
  registrosDesdeBackup: number;
  syncActivado: 0 | 1;
  onboardingVisto: 0 | 1;
  avisosActivados?: 0 | 1;
  ultimoAvisoISO?: string; // yyyy-mm-dd del último aviso mostrado (lo escribe el SW)
}

export const db = new Dexie("oncotrack") as Dexie & {
  perfil: EntityTable<Perfil, "id">;
  marcadores: EntityTable<Marcador, "id">;
  sintomas: EntityTable<Sintoma, "id">;
  medicacion: EntityTable<Medicacion, "id">;
  citas: EntityTable<Cita, "id">;
  preguntas: EntityTable<Pregunta, "id">;
  documentos: EntityTable<Documento, "id">;
  sesionesApoyo: EntityTable<SesionApoyo, "id">;
  conversacionesAsistente: EntityTable<MensajeAsistente, "id">;
  radarPerfil: EntityTable<RadarPerfil, "id">;
  ajustes: EntityTable<Ajustes, "id">;
};

db.version(1).stores({
  perfil: "++id",
  marcadores: "++id, nombre, fecha",
  sintomas: "++id, fecha, tipo",
  medicacion: "++id, nombre, proximaFecha",
  citas: "++id, fecha",
  preguntas: "++id, citaId, resuelta",
  documentos: "++id, fecha, tipo",
  sesionesApoyo: "++id, fecha",
  conversacionesAsistente: "++id, fecha",
  radarPerfil: "++id",
  ajustes: "++id",
});

const AJUSTES_DEFAULT: Ajustes = {
  id: 1,
  tema: "claro",
  registrosDesdeBackup: 0,
  syncActivado: 0,
  onboardingVisto: 0,
};

export async function getAjustes(): Promise<Ajustes> {
  const a = await db.ajustes.get(1);
  return a ?? { ...AJUSTES_DEFAULT };
}

export async function saveAjustes(patch: Partial<Ajustes>): Promise<void> {
  const actual = await getAjustes();
  await db.ajustes.put({ ...actual, ...patch, id: 1 });
}

/** Cuenta un registro nuevo para el recordatorio de backup (§4.6). */
export async function contarRegistroNuevo(): Promise<void> {
  const a = await getAjustes();
  await db.ajustes.put({
    ...a,
    id: 1,
    registrosDesdeBackup: a.registrosDesdeBackup + 1,
  });
}
