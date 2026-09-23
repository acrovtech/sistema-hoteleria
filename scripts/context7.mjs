import { spawn } from 'child_process';

const API_KEY = process.env.CONTEXT7_API_KEY;
if (!API_KEY) {
  console.error('Falta CONTEXT7_API_KEY en el entorno. Exporta la variable antes de usar este script.');
  process.exit(1);
}
const TIMEOUT_MS = Number(process.env.CONTEXT7_TIMEOUT_MS ?? 60000);

function runMCP(toolName, args) {
  return new Promise((resolve, reject) => {
    // Windows: .cmd necesita shell. Pasamos comando como string único
    // (array + shell:true = DEP0190 y riesgo de mal escapado).
    const cmd = process.platform === 'win32' ? 'npx.cmd -y @upstash/context7-mcp' : 'npx -y @upstash/context7-mcp';
    const child = spawn(cmd, {
      shell: true,
      env: {
        ...process.env,
        CONTEXT7_API_KEY: API_KEY,
        NPM_CONFIG_USERCONFIG: process.env.NPM_CONFIG_USERCONFIG ?? 'NUL',
        npm_config_userconfig: process.env.npm_config_userconfig ?? 'NUL',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';
    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        try {
          child.kill();
        } catch {}
        resolve(value);
      }
    };

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
      // Si ya llegó la respuesta id:2, resolvemos sin esperar el timeout completo.
      const lines = stdoutData.split('\n').filter((l) => l.trim().startsWith('{'));
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json?.id === 2) {
            finish(stdoutData);
            break;
          }
        } catch {}
      }
    });
    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    // 1. Handshake
    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'antigravity-client', version: '1.0' },
        },
      }) + '\n',
    );

    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    // 2. Execute tool
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: toolName, arguments: args } }) +
        '\n',
    );

    const timeout = setTimeout(() => {
      finish(stdoutData + (stderrData ? `\n[stderr]\n${stderrData}` : ''));
    }, TIMEOUT_MS);

    child.on('close', () => {
      finish(stdoutData + (stderrData ? `\n[stderr]\n${stderrData}` : ''));
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

function printRaw(raw) {
  const lines = raw.split('\n').filter((line) => line.trim().startsWith('{'));
  // Fix: buscar la respuesta id:2, no solo la última línea (antes tomaba el init id:1 y salía vacío).
  let target = null;
  for (const line of lines) {
    try {
      const json = JSON.parse(line);
      if (json?.id === 2) target = json;
    } catch {}
  }
  const json = target ?? (lines.length ? JSON.parse(lines[lines.length - 1]) : null);
  if (json) {
    const text = json.result?.content?.[0]?.text;
    if (text) {
      console.log(text);
      return;
    }
    if (json.error) {
      console.error('Context7 error:', JSON.stringify(json.error, null, 2));
      return;
    }
    console.log(JSON.stringify(json, null, 2));
  } else {
    console.log(raw);
  }
}

const command = process.argv[2];

async function main() {
  if (command === 'search') {
    const libraryName = process.argv[3];
    const query = process.argv[4] || libraryName;
    const raw = await runMCP('resolve-library-id', { libraryName, query });
    printRaw(raw);
  } else if (command === 'query') {
    const libraryId = process.argv[3];
    const query = process.argv[4];
    const raw = await runMCP('query-docs', { libraryId, query });
    printRaw(raw);
  } else {
    console.log('Usage:');
    console.log('  node scripts/context7.mjs search "<libraryName>" "<query>"');
    console.log('  node scripts/context7.mjs query "<libraryId>" "<query>"');
  }
}

main();
