import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter, loadSession, requireSession } from './auth.js';
import { dataRouter } from './data.js';

const PORT = process.env.PORT ?? 8787;
const COOKIE_SECRET = process.env.COOKIE_SECRET ?? 'helpdesk-local-dev-only';

// CORS_ORIGIN, se definida, restringe a uma lista fixa (separada por vírgula).
// Sem ela (default), reflete a Origin da própria requisição — não dá pra usar
// Access-Control-Allow-Origin: * junto com credentials, e travar numa porta
// fixa (8080) quebra sempre que o Vite sobe em outra porta (ex: 8080 ocupada,
// npm run preview em 4173, acesso via 127.0.0.1 em vez de localhost). Como o
// local-gateway só existe local, atrás do Docker, sem exposição externa, isso
// é seguro: não é o gateway real de produção.
const restrictedOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOrigin = restrictedOrigins?.length
  ? (origin, callback) => {
      if (!origin || restrictedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    }
  : true;

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use(loadSession);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/data', requireSession, dataRouter);

app.use((err, _req, res, _next) => {
  if (err.message?.startsWith('Origem não permitida pelo CORS')) {
    return res.status(403).type('text/plain').send(err.message);
  }
  console.error(err);
  res.status(500).type('text/plain').send('Erro interno no local-gateway.');
});

app.listen(PORT, () => {
  console.log(`local-gateway simulando o tenant-gateway em http://localhost:${PORT}`);
});
