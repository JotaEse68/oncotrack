import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "oncotrack" });
}

// Captura errores no manejados de Server Components, Route Handlers y
// Server Actions para que aparezcan en Vercel Observability como eventos
// de error propios, no solo mezclados en el log de texto plano.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routeType: string }
) {
  console.error("[onRequestError]", {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    error: err instanceof Error ? err.message : String(err),
  });
}
