import { Router } from 'express';
import crypto from 'node:crypto';
import { pool } from './db.js';

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

const COOKIE_NAME = 'hd_session';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    signed: true,
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

// Anexa req.user = { id, name, email, role } lendo o cookie de sessão e revalidando
// contra o banco (assim uma promoção de papel feita via script já reflete na próxima
// requisição, sem precisar de novo login).
export async function loadSession(req, _res, next) {
  const userId = req.signedCookies[COOKIE_NAME];
  if (!userId) return next();
  const { rows } = await pool.query('select id, name, email, role from "user" where id = $1', [
    userId,
  ]);
  req.user = rows[0] ?? null;
  next();
}

export function requireSession(req, res, next) {
  if (!req.user) return res.status(401).type('text/plain').send('Não autenticado.');
  next();
}

export const authRouter = Router();

authRouter.post('/sign-up/email', async (req, res) => {
  const { email, password, name, intent } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).type('text/plain').send('Nome, e-mail e senha são obrigatórios.');
  }

  const existing = await pool.query('select id from "user" where email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).type('text/plain').send('E-mail já cadastrado.');
  }

  // "customer" (o cliente se autocadastrando) nunca vira admin, independente de
  // ordem — é a trava contra o 1º-usuário-vira-admin da fundação virar sequestro
  // de tenant por um cliente externo. O cadastro de equipe (intent ausente/'staff')
  // só serve pra virar o 1º admin; depois disso fica fechado — novos funcionários
  // são criados pelo admin (ver /admin/create-user), não por autocadastro.
  //
  // O gate conta só admins, não qualquer usuário: se um cliente se autocadastra
  // antes de qualquer funcionário, o tenant não pode ficar travado sem admin.
  let role;
  if (intent === 'customer') {
    role = 'rep';
  } else {
    const countResult = await pool.query(
      'select count(*)::int as count from "user" where role = $1',
      ['admin']
    );
    if (countResult.rows[0].count > 0) {
      return res
        .status(403)
        .type('text/plain')
        .send(
          'Cadastro de equipe fechado — peça a um administrador para criar sua conta em Configurações.'
        );
    }
    role = 'admin';
  }

  const { rows } = await pool.query(
    'insert into "user" (name, email, password, role) values ($1, $2, $3, $4) returning id',
    [name, email, password, role]
  );

  res.cookie(COOKIE_NAME, rows[0].id, cookieOptions());
  res.status(204).end();
});

authRouter.post('/sign-in/email', async (req, res) => {
  const { email, password } = req.body ?? {};
  const { rows } = await pool.query('select id, password from "user" where email = $1', [email]);
  const user = rows[0];
  if (!user || user.password !== password) {
    return res.status(401).type('text/plain').send('Email ou senha inválidos.');
  }

  res.cookie(COOKIE_NAME, user.id, cookieOptions());
  res.status(204).end();
});

authRouter.post('/sign-out', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

authRouter.get('/me', (req, res) => {
  if (!req.user) return res.status(401).type('text/plain').send('Não autenticado.');
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email }, role });
});

// Provisiona um funcionário direto (sem autocadastro) — só admin. A senha
// gerada só existe nesta resposta; não fica em log nem é reenviada depois.
authRouter.post('/admin/create-user', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res
      .status(403)
      .type('text/plain')
      .send('Só administradores podem criar contas de funcionário.');
  }

  const { name, email, role } = req.body ?? {};
  if (!name || !email || role !== 'manager') {
    return res
      .status(400)
      .type('text/plain')
      .send('Nome, e-mail e papel (manager) são obrigatórios.');
  }

  const existing = await pool.query('select id from "user" where email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).type('text/plain').send('E-mail já cadastrado.');
  }

  const temporaryPassword = generateTemporaryPassword();
  const { rows } = await pool.query(
    'insert into "user" (name, email, password, role) values ($1, $2, $3, $4) returning id, name, email',
    [name, email, temporaryPassword, role]
  );

  res.status(201).json({ user: rows[0], role, temporaryPassword });
});
