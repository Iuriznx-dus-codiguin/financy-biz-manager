// Substituto local de https://deno.land/std@0.224.0/http/server.ts usado só por `deno check`
// quando deno.land não está acessível. Não é empacotado no deploy.
export function serve(handler: (req: Request) => Response | Promise<Response>): void {
  Deno.serve(handler);
}
