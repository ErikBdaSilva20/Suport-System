// Utilitário de dev: promove um usuário local a manager/admin.
// A Story 6.3 documenta que o gateway real ainda não tem rota própria para
// isso no v1 — a promoção é manual (console/banco). Este script simula
// exatamente esse caminho manual contra o Postgres local do docker-compose.
//
// Uso: node scripts/promote.js usuario@exemplo.com manager

import pg from 'pg';

const [, , email, role] = process.argv;

if (!email || !['manager', 'admin', 'rep'].includes(role)) {
  console.error('Uso: node scripts/promote.js <email> <rep|manager|admin>');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://helpdesk:helpdesk@localhost:5433/helpdesk',
});

const { rowCount } = await pool.query('update "user" set role = $1 where email = $2', [role, email]);
await pool.end();

if (rowCount === 0) {
  console.error(`Nenhum usuário encontrado com o e-mail ${email}.`);
  process.exit(1);
}

console.log(`${email} agora é ${role}.`);
