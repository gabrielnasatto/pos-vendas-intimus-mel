/**
 * Script: relatorio-envios.js
 * Audita as mensagens realmente enviadas pelo WhatsApp (EvolutionAPI)
 * e cruza com o Firestore para detectar discrepâncias.
 *
 * COMO EXECUTAR:
 *   node scripts/relatorio-envios.js
 *
 *   Opções via variável de ambiente:
 *   DIAS_HISTORICO=30  node scripts/relatorio-envios.js   (padrão: 30 dias)
 *   LIMITE_MSGS=500    node scripts/relatorio-envios.js   (padrão: 500 mensagens)
 *
 * VARIÁVEIS NECESSÁRIAS (.env.local):
 *   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 *   EVOLUTION_API_URL        — ex: https://api.suainstancia.com
 *   EVOLUTION_API_KEY        — API Key da EvolutionAPI
 *   EVOLUTION_INSTANCE_NAME  — Nome da instância (ex: Intimus Mel)
 *
 * SAÍDA:
 *   Console + scripts/relatorio-envios.json
 *
 * ESTE SCRIPT É SOMENTE LEITURA — nenhum dado é alterado.
 */

'use strict';

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const fs                               = require('fs');
const path                             = require('path');
const https                            = require('https');
const http                             = require('http');

// ─── Status do WhatsApp (campo status da EvolutionAPI) ───────────────────────
const WA_STATUS = {
  0: 'ERRO',
  1: 'PENDENTE_ENVIO',
  2: 'ENVIADO_SERVIDOR',   // chegou ao servidor do WhatsApp
  3: 'ENTREGUE_TELEFONE',  // entregue no dispositivo do destinatário
  4: 'LIDO',
  5: 'REPRODUZIDO',
};

// ─── Carregar .env.local ─────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val   = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('✅ .env.local carregado');
}

// ─── Firebase Admin ──────────────────────────────────────────────────────────
if (!getApps().length) {
  const projectId    = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '')
                         .replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Credenciais Firebase Admin não encontradas.');
    process.exit(1);
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  console.log(`✅ Firebase Admin (projeto: ${projectId})`);
}
const db = getFirestore();

// ─── Config EvolutionAPI ─────────────────────────────────────────────────────
const EVO_URL      = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVO_KEY      = process.env.EVOLUTION_API_KEY  || '';
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || '';

const DIAS_HISTORICO = parseInt(process.env.DIAS_HISTORICO || '30', 10);
const LIMITE_MSGS    = parseInt(process.env.LIMITE_MSGS    || '500', 10);

// ─── HTTP helper (sem dependências externas) ─────────────────────────────────
function request(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port:     u.port || (u.protocol === 'https:' ? 443 : 80),
        path:     u.pathname + u.search,
        method:   opts.method || 'GET',
        headers:  { 'Content-Type': 'application/json', apikey: EVO_KEY, ...opts.headers },
        timeout:  15000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout EvolutionAPI')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Normalizar número de telefone para comparação ───────────────────────────
// Remove tudo que não é dígito. Para o número WA (5553994242183) e número
// E.164 (+5553994242183) → ambos viram "5553994242183".
// Para formato legado sem DDI (53994242183) → "53994242183".
// O cruzamento tenta sufixo: se um termina com o outro, é o mesmo número.
function digitosApenas(numero) {
  if (!numero) return '';
  return String(numero).replace(/\D/g, '');
}

function mesmosNumeros(a, b) {
  const da = digitosApenas(a);
  const db = digitosApenas(b);
  if (!da || !db) return false;
  if (da === db) return true;
  // Tolera DDI 55 na frente de um e não no outro (dados legados)
  return da.endsWith(db) || db.endsWith(da);
}

// ─── EvolutionAPI: status da instância ───────────────────────────────────────
async function statusInstancia() {
  if (!EVO_URL || !EVO_KEY || !EVO_INSTANCE) {
    return { ok: false, motivo: 'Variáveis EVOLUTION_* não configuradas' };
  }
  try {
    const r = await request(
      `${EVO_URL}/instance/connectionState/${encodeURIComponent(EVO_INSTANCE)}`
    );
    if (r.status === 200) {
      const estado = r.data?.instance?.state || r.data?.state || 'unknown';
      return { ok: estado === 'open', estado, dados: r.data };
    }
    return { ok: false, motivo: `Status HTTP ${r.status}`, dados: r.data };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

// ─── EvolutionAPI: buscar mensagens enviadas pelo bot ────────────────────────
// Retorna apenas mensagens fromMe (enviadas pelo bot), dentro do período.
async function buscarMensagensEnviadas() {
  if (!EVO_URL || !EVO_KEY || !EVO_INSTANCE) {
    return { ok: false, motivo: 'Variáveis EVOLUTION_* não configuradas', lista: [] };
  }

  const corteTimestamp = Math.floor(
    (Date.now() - DIAS_HISTORICO * 24 * 60 * 60 * 1000) / 1000
  );

  try {
    // EvolutionAPI v2: POST /chat/findMessages/{instance}
    const r = await request(
      `${EVO_URL}/chat/findMessages/${encodeURIComponent(EVO_INSTANCE)}`,
      { method: 'POST' },
      {
        where: {
          key:              { fromMe: true },
          messageTimestamp: { gt: corteTimestamp },
        },
        limit: LIMITE_MSGS,
      }
    );

    if (r.status === 200) {
      const raw = Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.data?.messages)
        ? r.data.messages
        : Array.isArray(r.data?.data)
        ? r.data.data
        : [];

      const lista = raw
        .filter((m) => m?.key?.fromMe !== false) // garante fromMe
        .map((m) => ({
          id:         m?.key?.id          || m?.id || null,
          remoteJid:  m?.key?.remoteJid   || m?.remoteJid || '',
          telefone:   digitosApenas(
            (m?.key?.remoteJid || m?.remoteJid || '').replace('@s.whatsapp.net', '')
          ),
          status:     m?.status           ?? null,
          statusLabel: WA_STATUS[m?.status] || `DESCONHECIDO(${m?.status})`,
          timestamp:  m?.messageTimestamp || m?.timestamp || null,
          dataEnvioWA: m?.messageTimestamp || m?.timestamp
            ? new Date((m.messageTimestamp || m.timestamp) * 1000).toISOString()
            : null,
          conteudo:   m?.message?.conversation
            || m?.message?.extendedTextMessage?.text
            || m?.message?.imageMessage?.caption
            || '(sem texto)',
        }));

      return { ok: true, lista, total: lista.length };
    }

    return {
      ok: false,
      motivo: `EvolutionAPI respondeu status ${r.status}`,
      raw: r.data,
      lista: [],
    };
  } catch (e) {
    return { ok: false, motivo: e.message, lista: [] };
  }
}

// ─── Firestore: vendas + clientes ────────────────────────────────────────────
async function dadosFirestore() {
  const [vendasSnap, clientesSnap] = await Promise.all([
    db.collection('vendas').get(),
    db.collection('clientes').get(),
  ]);

  const clientes = {};
  for (const d of clientesSnap.docs) clientes[d.id] = { id: d.id, ...d.data() };

  const vendas = vendasSnap.docs.map((d) => {
    const v = { id: d.id, ...d.data() };
    v.cliente = clientes[v.clienteId] || null;
    v.telefoneDigitos = digitosApenas(v.cliente?.telefone || '');
    return v;
  });

  return { vendas, clientes };
}

function fmtTs(ts) {
  if (!ts) return null;
  try {
    if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
    if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
    if (typeof ts === 'number') return new Date(ts > 1e10 ? ts : ts * 1000).toISOString();
    return String(ts);
  } catch { return null; }
}

// ─── Lógica de cruzamento ─────────────────────────────────────────────────────
//
//  Para cada mensagem WA enviada:
//    → Acha a(s) venda(s) do cliente com esse telefone
//    → Verifica se o status do Firestore condiz com o envio real
//
//  Para cada venda "enviado" no Firestore:
//    → Verifica se existe alguma mensagem WA para esse telefone
//
function cruzar(mensagensWA, vendas) {
  // Índice: telefone → [mensagens WA]
  const msgsPorTel = {};
  for (const msg of mensagensWA) {
    if (!msg.telefone) continue;
    if (!msgsPorTel[msg.telefone]) msgsPorTel[msg.telefone] = [];
    msgsPorTel[msg.telefone].push(msg);
  }

  // ─── Resultado por cenário ────────────────────────────────────────────────

  // Cenário A: WA enviou, mas Firestore ainda está "pendente"
  // = mensagem existe no WA para um telefone cujas vendas estão pendentes
  const waSemAtualizacao = [];

  // Cenário B: Firestore marca "enviado", mas nenhuma msg WA encontrada
  const firestoreSuspeito = [];

  // Cenário C: Confirmado em ambos
  const confirmado = [];

  // Cenário D: Genuinamente pendente (sem msg WA + Firestore pendente)
  const genuinamentePendente = [];

  // Processar vendas
  for (const venda of vendas) {
    const tel  = venda.telefoneDigitos;
    const msgsDoCliente = tel
      ? Object.entries(msgsPorTel)
          .filter(([t]) => mesmosNumeros(t, tel))
          .flatMap(([, msgs]) => msgs)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      : [];

    const temMsgWA   = msgsDoCliente.length > 0;
    const statusFS   = venda.status || 'pendente';

    const resumoVenda = {
      vendaId:      venda.id,
      clienteNome:  venda.cliente?.nome || '(sem cliente)',
      telefone:     venda.cliente?.telefone || null,
      statusFirestore: statusFS,
      tentativas:   venda.tentativas || 0,
      dataVenda:    fmtTs(venda.dataVenda),
      dataEnvioFS:  fmtTs(venda.dataEnvio),
      erroEnvio:    venda.erroEnvio || null,
    };

    const resumoMsgs = msgsDoCliente.slice(0, 3).map((m) => ({
      dataEnvioWA:  m.dataEnvioWA,
      statusWA:     m.statusLabel,
      conteudo:     m.conteudo?.slice(0, 60) + (m.conteudo?.length > 60 ? '…' : ''),
    }));

    if (temMsgWA && statusFS === 'pendente') {
      // n8n enviou mas não atualizou o Firestore
      waSemAtualizacao.push({
        ...resumoVenda,
        mensagensWA: resumoMsgs,
        diagnostico: 'WhatsApp enviou, mas Firestore continua "pendente". O n8n falhou ao atualizar o status.',
      });
    } else if (!temMsgWA && statusFS === 'enviado') {
      // Firestore diz enviado mas Evolution API não tem registro
      firestoreSuspeito.push({
        ...resumoVenda,
        mensagensWA: [],
        diagnostico: `Firestore marca "enviado" mas nenhuma mensagem encontrada na EvolutionAPI nos últimos ${DIAS_HISTORICO} dias. Pode ser mensagem mais antiga que o histórico buscado.`,
      });
    } else if (temMsgWA && statusFS === 'enviado') {
      confirmado.push({
        ...resumoVenda,
        mensagensWA: resumoMsgs,
        diagnostico: 'Confirmado: enviado tanto no WhatsApp quanto no Firestore.',
      });
    } else if (!temMsgWA && (statusFS === 'pendente' || statusFS === 'erro')) {
      genuinamentePendente.push({
        ...resumoVenda,
        mensagensWA: [],
        diagnostico: statusFS === 'erro'
          ? 'Tentativas esgotadas. Nenhuma mensagem WA encontrada.'
          : 'Aguardando envio. Nenhuma mensagem WA encontrada.',
      });
    }
  }

  return { waSemAtualizacao, firestoreSuspeito, confirmado, genuinamentePendente };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📊 Auditoria de envios WhatsApp (últimos ${DIAS_HISTORICO} dias)\n`);

  // 1. Status da instância
  console.log('📱 Verificando instância EvolutionAPI...');
  const instancia = await statusInstancia();
  if (instancia.ok) {
    console.log(`   ✅ Instância "${EVO_INSTANCE}" conectada (${instancia.estado})`);
  } else {
    console.log(`   ⚠️  ${instancia.motivo}`);
  }

  // 2. Mensagens enviadas via WhatsApp
  console.log(`💬 Buscando mensagens enviadas (limite: ${LIMITE_MSGS})...`);
  const { ok: msgsOk, lista: mensagensWA, motivo: msgErro } = await buscarMensagensEnviadas();
  if (msgsOk) {
    console.log(`   ✅ ${mensagensWA.length} mensagem(ns) encontrada(s) no WhatsApp`);
  } else {
    console.log(`   ❌ Falha ao buscar mensagens: ${msgErro}`);
    console.log('   ⚠️  O relatório mostrará apenas dados do Firestore, sem cruzamento WA.');
  }

  // 3. Dados do Firestore
  console.log('🔥 Buscando dados no Firestore...');
  const { vendas } = await dadosFirestore();
  console.log(`   ✅ ${vendas.length} venda(s) encontrada(s)`);

  // 4. Cruzamento
  const resultado = cruzar(msgsOk ? mensagensWA : [], vendas);

  // ─── Relatório JSON ──────────────────────────────────────────────────────────
  const relatorio = {
    geradoEm: new Date().toISOString(),
    config: {
      diasHistorico:   DIAS_HISTORICO,
      limiteMensagens: LIMITE_MSGS,
      instanciaEvo:    EVO_INSTANCE || '(não configurado)',
    },
    instanciaEvolution: {
      conectada: instancia.ok,
      estado:    instancia.estado || null,
      erro:      instancia.motivo || null,
    },
    mensagensWhatsApp: {
      disponivel:   msgsOk,
      totalBuscadas: mensagensWA.length,
      erro:          msgErro || null,
    },
    resumo: {
      totalVendas:                        vendas.length,
      waEnviouMasFirestorePendente:       resultado.waSemAtualizacao.length,
      firestoreEnviadoSemRegistroNoWA:    resultado.firestoreSuspeito.length,
      confirmadosEmAmbos:                 resultado.confirmado.length,
      genuinamentePendenteOuErro:         resultado.genuinamentePendente.length,
    },
    // ─ Cenário A: PROBLEMA CRÍTICO ────────────────────────────────────────────
    // n8n enviou no WA mas não atualizou o Firestore → essas vendas
    // continuam como "pendente" e o n8n vai tentar REENVIAR na próxima execução!
    waEnviouMasFirestorePendente: resultado.waSemAtualizacao,

    // ─ Cenário B: STATUS SUSPEITO ─────────────────────────────────────────────
    // Firestore diz "enviado" mas não há mensagem WA correspondente
    firestoreEnviadoSemRegistroWA: resultado.firestoreSuspeito,

    // ─ Cenário C: OK ──────────────────────────────────────────────────────────
    confirmadosEmAmbos: resultado.confirmado,

    // ─ Cenário D: GENUINAMENTE PENDENTE ──────────────────────────────────────
    genuinamentePendenteOuErro: resultado.genuinamentePendente,
  };

  // ─── Console summary ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('             AUDITORIA DE ENVIOS WHATSAPP                 ');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total de vendas no Firestore : ${vendas.length}`);
  console.log('──────────────────────────────────────────────────────────');

  const a = resultado.waSemAtualizacao.length;
  console.log(`  🔴 [A] WA enviou, Firestore "pendente"    : ${a}`);
  if (a > 0) {
    console.log('      → PROBLEMA: o n8n vai reenviar essas mensagens!');
    console.log('      → AÇÃO RECOMENDADA: atualizar manualmente o status para "enviado"');
    for (const v of resultado.waSemAtualizacao.slice(0, 5)) {
      console.log(`         • [${v.vendaId}] ${v.clienteNome} (${v.telefone})`);
      if (v.mensagensWA[0]) {
        console.log(`           Enviado no WA em: ${v.mensagensWA[0].dataEnvioWA} — ${v.mensagensWA[0].statusWA}`);
      }
    }
    if (a > 5) console.log(`         ... e mais ${a - 5} no JSON`);
  }

  const b = resultado.firestoreSuspeito.length;
  console.log(`\n  🟡 [B] Firestore "enviado", sem msg no WA : ${b}`);
  if (b > 0) {
    console.log(`      → Pode ser mensagem mais antiga que ${DIAS_HISTORICO} dias, ou dados inconsistentes`);
  }

  const c = resultado.confirmado.length;
  console.log(`\n  ✅ [C] Confirmados em ambos (WA + Firestore): ${c}`);

  const d = resultado.genuinamentePendente.length;
  console.log(`\n  ⏳ [D] Pendentes/Erro genuínos (sem msg WA) : ${d}`);

  console.log('══════════════════════════════════════════════════════════');

  if (!msgsOk) {
    console.log('\n⚠️  ATENÇÃO: não foi possível conectar na EvolutionAPI.');
    console.log('   Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME no .env.local');
    console.log('   Sem isso, o cruzamento [A] e [C] não é possível.');
  }

  // ─── Salvar JSON ──────────────────────────────────────────────────────────────
  const outputPath = path.resolve(__dirname, 'relatorio-envios.json');
  fs.writeFileSync(outputPath, JSON.stringify(relatorio, null, 2), 'utf-8');
  console.log(`\n📄 Relatório salvo em: ${outputPath}\n`);
}

main().catch((err) => {
  console.error('\n❌ Erro:', err);
  process.exit(1);
});
