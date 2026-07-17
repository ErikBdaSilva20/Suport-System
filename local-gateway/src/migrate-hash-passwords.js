// One-off: hasheia in-place qualquer senha ainda em texto puro (sem "salt:hash").
// Roda uma vez pra migrar contas criadas antes do fix de hashing. Seguro rodar
// de novo — só toca linhas que ainda não têm o formato "<salt>:<hash>".
import { pool } from './db.js';
import { hashPassword } from './password.js';

const { rows } = await pool.query('select id, email, password from "user"');
const plaintext = rows.filter((r) => !r.password.includes(':'));

for (const user of plaintext) {
  const hashed = await hashPassword(user.password);
  await pool.query('update "user" set password = $1 where id = $2', [hashed, user.id]);
  console.log(`hasheado: ${user.email}`);
}

console.log(`${plaintext.length} conta(s) migrada(s).`);
await pool.end();
