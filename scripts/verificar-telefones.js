/**
 * Script: verificar-telefones.js
 * Verifica se os telefones dos clientes no Firestore estão no formato E.164.
 *
 * COMO EXECUTAR:
 *   1. Certifique-se de que as variáveis de ambiente estão disponíveis.
 *      Você pode usar um arquivo .env.local na raiz do projeto.
 *   2. Execute com Node.js:
 *        node -r dotenv/config scripts/verificar-telefones.js dotenv_config_path=.env.local
 *
 *   Ou, se tiver dotenv instalado globalmente:
 *        node scripts/verificar-telefones.js
 *      (com .env.local ou FIREBASE_ADMIN_* já exportados no ambiente)
 *
 *   3. O relatório será salvo em: scripts/relatorio-telefones.json
 *
 * DEPENDÊNCIAS NECESSÁRIAS (já no projeto):
 *   - firebase-admin
 */

'use strict';

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// ─── Carregar .env.local manualmente caso dotenv não seja usado ─────────────
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Remove aspas ao redor do valor, se houver
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log('✅ .env.local carregado');
}

// ─── Inicializar Firebase Admin ──────────────────────────────────────────────
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Variáveis de ambiente do Firebase Admin não encontradas.');
    console.error('   Certifique-se de que FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY estão definidas.');
    process.exit(1);
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  console.log(`✅ Firebase Admin inicializado (projeto: ${projectId})`);
}

const db = getFirestore();

// ─── Validação E.164 ─────────────────────────────────────────────────────────
/**
 * Verifica se um telefone está no formato E.164 válido.
 * E.164: começa com +, seguido de 8 a 15 dígitos.
 */
function isE164Valido(telefone) {
  if (!telefone || typeof telefone !== 'string') return false;
  return /^\+\d{8,15}$/.test(telefone);
}

/**
 * Classifica o telefone e retorna o motivo do problema, se houver.
 */
function classificarTelefone(telefone) {
  if (!telefone || telefone.trim() === '') {
    return { classificacao: 'ausente', motivo: 'Ausente' };
  }

  if (isE164Valido(telefone)) {
    return { classificacao: 'valido', motivo: null };
  }

  // Tenta identificar o problema
  if (!telefone.startsWith('+')) {
    const digits = telefone.replace(/\D/g, '');
    if (digits.length === 0) {
      return { classificacao: 'invalido', motivo: 'Sem dígitos numéricos' };
    }
    if (digits.length < 8) {
      return { classificacao: 'invalido', motivo: `Dígitos insuficientes (${digits.length} dígitos sem prefixo E.164)` };
    }
    return { classificacao: 'invalido', motivo: 'Fora do formato E.164 (sem prefixo +)' };
  }

  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 8) {
    return { classificacao: 'invalido', motivo: `Dígitos insuficientes (${digits.length} dígitos)` };
  }
  if (digits.length > 15) {
    return { classificacao: 'invalido', motivo: `Número longo demais (${digits.length} dígitos, máximo 15)` };
  }

  return { classificacao: 'invalido', motivo: 'Formato inválido' };
}

// ─── Script principal ─────────────────────────────────────────────────────────
async function verificarTelefones() {
  console.log('\n🔍 Iniciando verificação de telefones na coleção "clientes"...\n');

  const snapshot = await db.collection('clientes').get();

  if (snapshot.empty) {
    console.log('ℹ️  Nenhum documento encontrado na coleção "clientes".');
    return;
  }

  const total = snapshot.size;
  console.log(`📋 Total de clientes encontrados: ${total}\n`);

  let validos = 0;
  let invalidos = 0;
  let ausentes = 0;
  const listaInvalidos = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const telefone = data.telefone;
    const nome = data.nome || '(sem nome)';
    const { classificacao, motivo } = classificarTelefone(telefone);

    if (classificacao === 'valido') {
      validos++;
    } else if (classificacao === 'ausente') {
      ausentes++;
      listaInvalidos.push({
        clienteId: doc.id,
        nome,
        telefoneAtual: telefone ?? null,
        motivo: 'Ausente',
      });
    } else {
      invalidos++;
      listaInvalidos.push({
        clienteId: doc.id,
        nome,
        telefoneAtual: telefone,
        motivo,
      });
    }
  }

  // ─── Gerar relatório JSON ───────────────────────────────────────────────────
  const relatorio = {
    geradoEm: new Date().toISOString(),
    resumo: { total, validos, invalidos, ausentes },
    invalidos: listaInvalidos,
  };

  const outputPath = path.resolve(__dirname, 'relatorio-telefones.json');
  fs.writeFileSync(outputPath, JSON.stringify(relatorio, null, 2), 'utf-8');

  // ─── Resumo no console ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('             RESUMO DA VERIFICAÇÃO             ');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total de clientes : ${total}`);
  console.log(`  ✅ Válidos (E.164) : ${validos}`);
  console.log(`  ❌ Inválidos       : ${invalidos}`);
  console.log(`  ⚠️  Ausentes        : ${ausentes}`);
  console.log('═══════════════════════════════════════════════');

  if (listaInvalidos.length > 0) {
    console.log('\n📋 Clientes com telefone inválido ou ausente:');
    for (const item of listaInvalidos) {
      console.log(`  • [${item.clienteId}] ${item.nome}`);
      console.log(`      Atual : ${item.telefoneAtual ?? '(vazio)'}`);
      console.log(`      Motivo: ${item.motivo}`);
    }
  } else {
    console.log('\n✅ Todos os telefones estão no formato E.164 válido!');
  }

  console.log(`\n📄 Relatório salvo em: ${outputPath}\n`);
}

verificarTelefones().catch((err) => {
  console.error('❌ Erro ao executar verificação:', err);
  process.exit(1);
});
