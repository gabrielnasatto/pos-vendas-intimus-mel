# Guia do Sistema — Pós-Vendas Intimus Mel

---

## O que é esse sistema?

O sistema de Pós-Vendas da Intimus Mel serve para **registrar as vendas da loja** e **enviar mensagens automáticas de follow-up pelo WhatsApp** para os clientes, 24 horas após a compra.

O objetivo é manter o contato com o cliente depois que ele sai da loja, perguntando sobre a experiência com o produto.

---

## Como acessar

Abra o link do sistema no navegador e faça login com seu **e-mail e senha**.

---

## Cadastrando um Cliente

Você pode cadastrar um cliente de duas formas:

**Opção 1 — Pela tela de Clientes:**
1. Clique em **"Clientes"** no menu lateral
2. Clique em **"Novo Cliente"**
3. Preencha o nome, telefone (com DDD, só números, ex: `47991234567`) e data de nascimento (opcional)
4. Clique em **"Cadastrar Cliente"**

**Opção 2 — Durante o registro de uma venda:**
Se o cliente ainda não está cadastrado, você pode cadastrá-lo direto na tela de "Nova Venda" — o sistema cria o cliente automaticamente.

---

## Registrando uma Venda

1. Clique em **"Vendas"** no menu lateral
2. Clique em **"Nova Venda"**
3. Digite o nome ou telefone do cliente — se já estiver cadastrado, ele vai aparecer como sugestão para você selecionar
4. Preencha os **produtos** (nome e valor) se quiser registrar o que foi vendido
5. Marque **"Cliente provou na loja?"** se o cliente experimentou o produto antes de comprar
6. Clique em **"Registrar Venda"**

> **Dica:** O campo de produtos é opcional. O importante é registrar a venda para o follow-up automático funcionar.

---

## O que acontece depois?

Após registrar a venda, o sistema entra em ação **automaticamente**:

- O sistema verifica as vendas pendentes todos os dias, de segunda a sexta, das 9h às 17h
- Quando passam **24 horas** desde a venda, o sistema envia uma mensagem no WhatsApp para o cliente
- A mensagem muda dependendo de como o cliente comprou:
  - **Se provou na loja:** "Passando pra saber o que você achou da sua compra..."
  - **Se comprou sem provar:** "Deu tudo certo com a sua compra?..."
- Depois do envio, a venda muda de status para **"Enviado"** automaticamente

---

## Enviando mensagens manualmente

Se você quiser enviar as mensagens agora, sem esperar o horário automático:

1. Na tela de **"Vendas"**, clique em **"Disparar Envio"**
2. O sistema vai enviar para todas as vendas que já passaram de 24 horas e ainda estão com status **"Pendente"**

---

## Status das Vendas

| Status | Significado |
|--------|-------------|
| **Pendente** | Venda registrada, mensagem ainda não enviada |
| **Enviado** | Mensagem de follow-up já foi enviada |

---

## Dicas importantes

- O telefone do cliente precisa estar no formato com DDD, só números (ex: `47991234567`). Sem espaços ou traços.
- Cada número de telefone só pode ter um cadastro. Se tentar cadastrar um número já existente, o sistema vai avisar.
- O sistema só envia mensagens para vendas com status **"Pendente"** — vendas já enviadas não recebem nova mensagem.
- Se o cliente tiver mais de uma venda pendente ao mesmo tempo, ele recebe apenas uma mensagem.