import type { Cita, Medicacion } from "@/lib/db";

/**
 * Eventos de calendario (.ics) — spec avisos B1.
 * El aviso lo da el propio móvil (su calendario), sin servidor y en
 * cualquier plataforma. UID estable: reimportar actualiza, no duplica.
 */

function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function fechaCompacta(iso: string): string {
  return iso.replaceAll("-", "");
}

/** "2026-07-12" + "09:30" → "20260712T093000" (hora local flotante). */
function fechaHora(iso: string, hora: string): string {
  return `${fechaCompacta(iso)}T${hora.replace(":", "")}00`;
}

function diaSiguiente(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(y, m - 1, d + 1);
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const dd = String(f.getDate()).padStart(2, "0");
  return `${f.getFullYear()}-${mm}-${dd}`;
}

/** Sumar 1h a "HH:mm" (fin por defecto de la cita). */
function horaFin(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function alarma(trigger: string, texto: string): string[] {
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(texto)}`,
    `TRIGGER:${trigger}`,
    "END:VALARM",
  ];
}

function envolver(lineas: string[]): string {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OncoTrack//ES",
      ...lineas,
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}

export function icsCita(cita: Cita): string {
  const quien = cita.especialista ?? "cita médica";
  const lineas: string[] = ["BEGIN:VEVENT", `UID:cita-${cita.id}@oncotrack`];
  lineas.push(`DTSTAMP:${fechaCompacta(cita.fecha)}T000000Z`);
  if (cita.hora) {
    lineas.push(`DTSTART:${fechaHora(cita.fecha, cita.hora)}`);
    lineas.push(`DTEND:${fechaHora(cita.fecha, horaFin(cita.hora))}`);
  } else {
    lineas.push(`DTSTART;VALUE=DATE:${fechaCompacta(cita.fecha)}`);
    lineas.push(`DTEND;VALUE=DATE:${fechaCompacta(diaSiguiente(cita.fecha))}`);
  }
  lineas.push(`SUMMARY:${escapar(`Cita: ${quien}`)}`);
  if (cita.centro) lineas.push(`LOCATION:${escapar(cita.centro)}`);
  lineas.push(
    `DESCRIPTION:${escapar(`${cita.notas ? `${cita.notas}\n` : ""}Anotada en OncoTrack.`)}`
  );
  lineas.push(...alarma("-P1D", `Mañana: ${quien}`));
  if (cita.hora) lineas.push(...alarma("-PT2H", `En 2 horas: ${quien}`));
  lineas.push("END:VEVENT");
  return envolver(lineas);
}

export function icsToma(med: Medicacion): string {
  const fecha = med.proximaFecha!;
  const lineas: string[] = [
    "BEGIN:VEVENT",
    `UID:toma-${med.id}@oncotrack`,
    `DTSTAMP:${fechaCompacta(fecha)}T000000Z`,
    `DTSTART;VALUE=DATE:${fechaCompacta(fecha)}`,
    `DTEND;VALUE=DATE:${fechaCompacta(diaSiguiente(fecha))}`,
    `SUMMARY:${escapar(`Toma: ${med.nombre}`)}`,
  ];
  if (med.dosis) lineas.push(`DESCRIPTION:${escapar(med.dosis)}`);
  lineas.push(...alarma("PT9H", `Hoy toca ${med.nombre}`));
  lineas.push("END:VEVENT");
  return envolver(lineas);
}

/** Descarga el .ics; el móvil lo abre con su calendario. Solo cliente. */
export function descargarICS(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
