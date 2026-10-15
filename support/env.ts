/**
 * Leitura de variáveis de ambiente. Falha cedo, nomeando a variável ausente,
 * em vez de deixar um `undefined` vazar para dentro de um teste.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente ausente: ${name}. Veja o .env.example.`);
  }
  return value;
}
