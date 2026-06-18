const express = require('express');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3847;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const AUTH_PATTERNS = [
  /unauthenticated/i,
  /not authenticated/i,
  /401/,
  /403/,
  /permission denied/i,
  /token has expired/i,
  /no valid credential/i,
  /resolve:/i,
  /no.*profile configured/i,
  /please run.*login/i,
  /databricks-cli auth/i,
];

function isAuthError(msg) {
  return AUTH_PATTERNS.some(p => p.test(msg));
}

function profileArgs(req) {
  const p = req.headers['x-profile'];
  return p ? ['-p', p] : [];
}

function cli(args, req) {
  const extra = req ? profileArgs(req) : [];
  return new Promise((resolve, reject) => {
    execFile('databricks', [...args, ...extra, '-o', 'json'], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr?.trim() || err.message;
        const authErr = new Error(msg);
        authErr.isAuth = isAuthError(msg);
        return reject(authErr);
      }
      try {
        resolve(stdout.trim() ? JSON.parse(stdout) : null);
      } catch {
        resolve(stdout.trim() || null);
      }
    });
  });
}

function cliRaw(args, req) {
  const extra = req ? profileArgs(req) : [];
  return new Promise((resolve, reject) => {
    execFile('databricks', [...args, ...extra], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr?.trim() || err.message;
        const authErr = new Error(msg);
        authErr.isAuth = isAuthError(msg);
        return reject(authErr);
      }
      resolve(stdout.trim());
    });
  });
}

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      res.json({ ok: true, data: result ?? null });
    } catch (e) {
      const status = e.isAuth ? 401 : 400;
      res.status(status).json({ ok: false, error: e.message, authRequired: !!e.isAuth });
    }
  };
}

// Profiles
app.get('/api/profiles', handle(async () => {
  const result = await cli(['auth', 'profiles']);
  return result?.profiles ?? [];
}));

// Scopes
app.get('/api/scopes', handle((req) => cli(['secrets', 'list-scopes'], req)));

app.post('/api/scopes', handle(async (req) => {
  const { name } = req.body;
  if (!name) throw new Error('name is required');
  await cliRaw(['secrets', 'create-scope', name], req);
  return { name };
}));

app.delete('/api/scopes/:scope', handle((req) =>
  cliRaw(['secrets', 'delete-scope', req.params.scope], req).then(() => null)
));

// Secrets
app.get('/api/scopes/:scope/secrets', handle((req) =>
  cli(['secrets', 'list-secrets', req.params.scope], req)
));

app.put('/api/scopes/:scope/secrets/:key', handle(async (req) => {
  const { value } = req.body;
  if (value === undefined) throw new Error('value is required');
  await cliRaw(['secrets', 'put-secret', req.params.scope, req.params.key, '--string-value', value], req);
  return null;
}));

app.delete('/api/scopes/:scope/secrets/:key', handle((req) =>
  cliRaw(['secrets', 'delete-secret', req.params.scope, req.params.key], req).then(() => null)
));

// ACLs
app.get('/api/scopes/:scope/acls', handle((req) =>
  cli(['secrets', 'list-acls', req.params.scope], req)
));

app.put('/api/scopes/:scope/acls/:principal', handle(async (req) => {
  const { permission } = req.body;
  if (!permission) throw new Error('permission is required');
  await cliRaw(['secrets', 'put-acl', req.params.scope, req.params.principal, permission], req);
  return null;
}));

app.delete('/api/scopes/:scope/acls/:principal', handle((req) =>
  cliRaw(['secrets', 'delete-acl', req.params.scope, req.params.principal], req).then(() => null)
));

app.listen(PORT, () => {
  console.log(`Databricks Secrets UI → http://localhost:${PORT}`);
});
