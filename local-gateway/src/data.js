import { Router } from 'express';
import { pool } from './db.js';
import { TABLES } from './tables.js';

function isElevated(role) {
  return role === 'admin' || role === 'manager';
}

function isRoleAllowed(table, operation, role) {
  const roles = table.writeRoles?.[operation];
  return !roles || roles.includes(role);
}

export const dataRouter = Router();

dataRouter.get('/:table', async (req, res) => {
  const tableName = req.params.table;
  const table = TABLES[tableName];
  if (!table) return res.status(404).type('text/plain').send(`Tabela desconhecida: ${tableName}`);

  const params = [];
  let query = `select * from "${tableName}"`;
  if (table.hasOwner && !isElevated(req.user.role)) {
    params.push(req.user.id);
    query += ' where owner_id = $1';
  }
  query += ' order by created_at desc';

  const { rows } = await pool.query(query, params);
  res.json(rows);
});

dataRouter.post('/:table', async (req, res) => {
  const tableName = req.params.table;
  const table = TABLES[tableName];
  if (!table) return res.status(404).type('text/plain').send(`Tabela desconhecida: ${tableName}`);
  if (!isRoleAllowed(table, 'create', req.user.role)) {
    return res.status(403).type('text/plain').send('Sem permissão para criar registros nesta tabela.');
  }

  const body = req.body ?? {};
  const columns = table.columns.filter(c => Object.prototype.hasOwnProperty.call(body, c));
  const values = columns.map(c => body[c]);
  if (table.hasOwner) {
    columns.push('owner_id');
    values.push(req.user.id);
  }

  const columnList = columns.map(c => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `insert into "${tableName}" (${columnList}) values (${placeholders}) returning *`,
    values,
  );
  res.status(201).json(rows[0]);
});

async function loadOwnedRow(tableName, id) {
  const { rows } = await pool.query(`select * from "${tableName}" where id = $1`, [id]);
  return rows[0] ?? null;
}

dataRouter.patch('/:table/:id', async (req, res) => {
  const tableName = req.params.table;
  const table = TABLES[tableName];
  if (!table) return res.status(404).type('text/plain').send(`Tabela desconhecida: ${tableName}`);

  const existing = await loadOwnedRow(tableName, req.params.id);
  if (!existing) return res.status(404).type('text/plain').send('Registro não encontrado.');
  if (table.hasOwner && !isElevated(req.user.role) && existing.owner_id !== req.user.id) {
    return res.status(403).type('text/plain').send('Você só pode editar os próprios registros.');
  }
  if (!isRoleAllowed(table, 'update', req.user.role)) {
    return res.status(403).type('text/plain').send('Sem permissão para editar esta tabela.');
  }

  const body = req.body ?? {};
  const columns = table.columns.filter(c => Object.prototype.hasOwnProperty.call(body, c));
  if (columns.length === 0) return res.json(existing);

  const setClause = columns.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
  const values = columns.map(c => body[c]);
  const { rows } = await pool.query(
    `update "${tableName}" set ${setClause} where id = $1 returning *`,
    [req.params.id, ...values],
  );
  res.json(rows[0]);
});

dataRouter.delete('/:table/:id', async (req, res) => {
  const tableName = req.params.table;
  const table = TABLES[tableName];
  if (!table) return res.status(404).type('text/plain').send(`Tabela desconhecida: ${tableName}`);

  const existing = await loadOwnedRow(tableName, req.params.id);
  if (!existing) return res.status(204).end();
  if (table.hasOwner && !isElevated(req.user.role) && existing.owner_id !== req.user.id) {
    return res.status(403).type('text/plain').send('Você só pode excluir os próprios registros.');
  }
  if (!isRoleAllowed(table, 'delete', req.user.role)) {
    return res.status(403).type('text/plain').send('Sem permissão para excluir nesta tabela.');
  }

  await pool.query(`delete from "${tableName}" where id = $1`, [req.params.id]);
  res.status(204).end();
});
