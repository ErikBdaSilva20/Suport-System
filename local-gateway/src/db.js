import pg from 'pg';

const { Pool, types } = pg;

// int8/bigserial (tickets.number) vem como string do driver por padrão (evita
// perda de precisão em valores > 2^53). Como é só um contador sequencial de
// ticket, é seguro converter para number aqui — mantém o contrato de
// types.gen.ts (number: number) igual ao que um serializer real de gateway
// também faria para esse intervalo de valores.
types.setTypeParser(20, val => parseInt(val, 10));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
