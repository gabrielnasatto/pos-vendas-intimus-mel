# 🚀 Guia: Especificação de Horários e Disparo Manual de Mensagens

## ✅ O que foi implementado

### 1. **Validações de Horário e Dia da Semana**

O fluxo agora respeita as seguintes condições:

- ✅ **Execução automática:** Segunda a sexta, das 09h às 17h (cron: `0 9-17 * * 1-5`)
- ✅ **Disparo manual:** Também respeita os mesmos limites (seg-sex, 09h-17h)
- ✅ **Validação de 24h:** Apenas envia mensagens para vendas que passaram 24h desde o registro

### 2. **Validação de 24 Horas**

Novo node adicionado: **"Validar 24h desde Compra"**

Este node:
- Verifica cada venda no banco de dados
- Calcula o tempo decorrido desde `dataVenda`
- Só permite o envio se passaram **pelo menos 24 horas**
- Log detalhado mostrando quantas horas faltam

Exemplo de log:
```
Venda ABC123: 25.5 horas - LIBERADA para envio ✓
Venda XYZ789: 12.3 horas - Aguardando (mín 24h) ✗
```

### 3. **Botão "Enviar Mensagens" no Sidebar**

Adicionado botão no menu lateral que:
- Executa o fluxo do n8n sob demanda
- **Respeita os horários:** Seg-sex, 09h-17h
- Retorna feedback visual ao usuário
- Disponível tanto em desktop quanto mobile

**Funcionalidades:**
- ✅ Botão com ícone de envio
- ✅ Loading durante a execução
- ✅ Toast de sucesso/erro
- ✅ Validação de horário no cliente

---

## 🔧 Configuração Necessária

### Passo 1: Criar Webhook no n8n

1. Abra seu fluxo no n8n
2. Clique em "+" para adicionar um novo node
3. Procure por "Webhook"
4. Configure como:
   - **Method:** POST
   - **Authentication:** Nenhuma (ou token, conforme sua segurança)
   - **URL:** Será fornecida pelo n8n (algo como `https://seu-n8n.com/webhook/abc123`)

### Passo 2: Conexão do Webhook

Replique este fluxo (opcional):
```
[Manual Webhook Trigger] → [Seu fluxo existente]
```

### Passo 3: Configurar Variável de Ambiente

No seu `.env.local`, adicione:

```bash
N8N_WEBHOOK_URL=https://seu-n8n-instance.com/webhook/seu-workflow-id
```

**Encontre a URL:**
1. Abra o webhook trigger no n8n
2. Clique em "Test Trigger"
3. Copie a **URL** exibida
4. Cole na variável `N8N_WEBHOOK_URL`

---

## 📋 Fluxo Atualizado (n8n)

```
Agendador (seg-sex, 09-17h)
        ↓
HTTP Request (Firebase Query)
        ↓
Processar Vendas
        ↓
✨ Validar 24h desde Compra ← NOVO!
        ↓
Agrupar por Cliente (remove duplicatas)
        ↓
Buscar Cliente
        ↓
Extrair Dados Cliente
        ↓
Cliente Provou? (if)
        ├→ Enviar - Provou
        └→ Enviar - Comprou Direto
        ↓
Preservar Dados (mantém vendaIds)
        ↓
Loop Vendas para Atualizar
        ↓
Atualizar Status Venda
```

---

## 🎯 Casos de Uso

### Cenário 1: Execução Automática
```
Seg, 09h00 → Fluxo dispara automaticamente
Verifica: Todos os clientes com vendas pendentes
Filtra: Apenas vendas com 24h+
Envia: Mensagens para clientes elegíveis
```

### Cenário 2: Disparo Manual
```
Usuário clica "Enviar Mensagens" (terça, 14h30)
Sistema valida: ✓ Terça (seg-sex)
               ✓ 14h30 (09-17h)
Executa: O mesmo fluxo de envio
```

### Cenário 3: Tentativa Fora do Horário
```
Usuário clica "Enviar Mensagens" (sábado, 10h)
Sistema retorna erro: "Envio disponível apenas seg-sex"
```

---

## 📱 API Endpoints

### POST `/api/n8n/trigger`
Dispara o fluxo do n8n manualmente.

**Validações:**
- ✓ Seg-sex?
- ✓ 09h-17h?

**Resposta de sucesso:**
```json
{
  "sucesso": true,
  "mensagem": "Fluxo de envio iniciado com sucesso",
  "disparadoEm": "2026-02-18T14:30:00.000Z"
}
```

**Resposta de erro (fora do horário):**
```json
{
  "sucesso": false,
  "mensagem": "Envio disponível apenas de segunda a sexta-feira",
  "dia": "Sábado"
}
```

### GET `/api/n8n/trigger`
Verifica disponibilidade de envio.

**Resposta:**
```json
{
  "status": "ok",
  "dia": "Terça",
  "hora": "14:30",
  "podeExecutar": true,
  "motivo": "Tudo certo para executar"
}
```

---

## 🐛 Troubleshooting

### ❌ "N8N_WEBHOOK_URL não está configurada"
→ Verifique se a variável está no `.env.local`
→ Restart o servidor após adicionar

### ❌ "Erro ao executar o fluxo"
→ Valide se a URL do webhook está correta
→ Teste a URL no Postman/Insomnia
→ Verifique permissões no n8n

### ❌ "Mensagens não estão sendo enviadas"
→ Verifique se vendas têm 24h+
→ Confira o horário (seg-sex, 09-17h)
→ Verifique logs no n8n

---

## 📊 Logs e Monitoramento

### No n8n:
Abra o histórico de execuções para ver:
- Quantas vendas foram processadas
- Quantas passaram na validação de 24h
- Quantas mensagens foram enviadas
- Status de cada operação

### No Next.js (Console):
```javascript
// Exemplo de log
"Atualizando 2 venda(s) para cliente sRtfBWVKQabRKZrTRohc"
"Venda vendaId1: 25.5 horas - LIBERADA para envio"
```

---

## ✨ Próximos Passos (Opcionais)

- [ ] Adicionar logs no Firestore
- [ ] Dashboard de histórico de envios
- [ ] Pausa/retentativa manual
- [ ] Filtros por tipo de cliente
- [ ] Agendamento customizável por usuário

---

**Pronto para usar! 🚀**
