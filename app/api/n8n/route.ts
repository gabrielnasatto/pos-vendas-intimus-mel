import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const agora = new Date();

    // Obter a URL do webhook do n8n (salva em variável de ambiente)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('❌ N8N_WEBHOOK_URL não está configurada');
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'Webhook do n8n não configurado',
          detalhe: 'Variável N8N_WEBHOOK_URL não encontrada no .env.local',
        },
        { status: 500 }
      );
    }

    console.log('📞 Disparando webhook n8n:', n8nWebhookUrl);

    // Fazer requisição para o webhook do n8n
    const respostaWebhook = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        disparadoEm: agora.toISOString(),
        manualTrigger: true,
      }),
    });

    console.log('📊 Status da resposta:', respostaWebhook.status);
    console.log('📊 Headers:', Object.fromEntries(respostaWebhook.headers.entries()));

    // Obter o texto da resposta primeiro
    const textoResposta = await respostaWebhook.text();
    
    if (!respostaWebhook.ok) {
      console.error('❌ Erro na resposta do webhook:');
      console.error('Status:', respostaWebhook.status);
      console.error('Resposta:', textoResposta.substring(0, 500)); // Primeiros 500 caracteres

      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'Erro ao executar o fluxo de envio',
          status: respostaWebhook.status,
          statusText: respostaWebhook.statusText,
          detalhe: textoResposta.startsWith('<') 
            ? `Resposta HTML (possível erro ${respostaWebhook.status}). Verifique se a URL do webhook está correta.`
            : textoResposta,
        },
        { status: respostaWebhook.status }
      );
    }

    // Tentar fazer parse do JSON
    let resultadoN8n;
    try {
      resultadoN8n = JSON.parse(textoResposta);
      console.log('✅ Resposta do webhook:', resultadoN8n);
    } catch (erroJson) {
      console.warn('⚠️ Resposta não é JSON válido, mas status foi OK');
      console.warn('Resposta recebida:', textoResposta.substring(0, 200));
      resultadoN8n = { mensagem: 'Webhook executado com sucesso', resposta: textoResposta };
    }

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: 'Fluxo de envio iniciado com sucesso',
        disparadoEm: agora.toISOString(),
        resultado: resultadoN8n,
      },
      { status: 200 }
    );
  } catch (erro) {
    console.error('❌ Erro ao processar disparo:', erro);
    const mensagemErro = erro instanceof Error ? erro.message : 'Erro desconhecido';
    
    return NextResponse.json(
      {
        sucesso: false,
        mensagem: 'Erro ao processar disparo',
        erro: mensagemErro,
      },
      { status: 500 }
    );
  }
}

// GET para testar se o endpoint está respondendo
export async function GET() {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const hora = agora.getHours();
  const isSegundaAexta = diaSemana >= 1 && diaSemana <= 5;
  const isDentroHorario = hora >= 9 && hora <= 17;
  
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookConfigurado = !!n8nWebhookUrl;

  return NextResponse.json({
    status: 'ok',
    horarioAtualizado: agora.toISOString(),
    dia: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][diaSemana],
    hora: `${hora}:${agora.getMinutes().toString().padStart(2, '0')}`,
    podeExecutar: isSegundaAexta && isDentroHorario,
    motivo: !isSegundaAexta
      ? 'Apenas seg-sex'
      : !isDentroHorario
      ? `Apenas 09h-17h (agora: ${hora}h)`
      : 'Tudo certo para executar',
    webhookConfigurado,
    webhookUrl: webhookConfigurado ? n8nWebhookUrl?.substring(0, 50) + '...' : 'NÃO CONFIGURADO',
  });
}
