import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return true; // requisições do browser sem chave são permitidas
  return apiKey === process.env.API_SECRET_KEY;
}

function serializeCliente(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    nome: data.nome ?? null,
    telefone: data.telefone ?? null,
    dataNascimento: data.dataNascimento ?? null,
    provou: data.provou ?? false,
    status: data.status ?? 'pendente',
    vendaId: data.vendaId ?? null,
    erro: data.erro ?? null,
    dataCadastro: data.dataCadastro?.toDate?.()?.toISOString() ?? null,
    dataEnvio: data.dataEnvio?.toDate?.()?.toISOString() ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };
}

// GET /api/clientes?status=pendente
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const snapshot = await adminDb
      .collection('clientes')
      .orderBy('dataCadastro', 'desc')
      .get();

    let clientes = snapshot.docs.map((doc) => serializeCliente(doc.id, doc.data()));

    if (status) {
      clientes = clientes.filter((c) => c.status === status);
    }

    return NextResponse.json({ success: true, clientes, total: clientes.length });
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/clientes — criar cliente (e opcionalmente uma venda vinculada)
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, telefone, dataNascimento, provou, valorTotal, produtos, observacoes } = body;

    if (!nome || !telefone) {
      return NextResponse.json(
        { success: false, error: 'nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const agora = Timestamp.now();

    const clienteData: FirebaseFirestore.DocumentData = {
      nome,
      telefone,
      provou: provou ?? false,
      status: 'pendente',
      dataCadastro: agora,
      createdAt: agora,
      updatedAt: agora,
    };

    if (dataNascimento) {
      clienteData.dataNascimento = dataNascimento;
    }

    let vendaId: string | undefined;

    // Criar venda antecipadamente se houver produtos
    if (valorTotal !== undefined && produtos && produtos.length > 0) {
      const vendaRef = adminDb.collection('vendas').doc();
      vendaId = vendaRef.id;

      await vendaRef.set({
        dataVenda: agora,
        valorTotal,
        produtos,
        vendedora: 'Sistema',
        clienteId: '', // será atualizado após criar o cliente
        observacoes: observacoes || '',
        status: 'pendente',
        provou: provou ?? false,
        createdAt: agora,
      });

      clienteData.vendaId = vendaId;
    }

    const clienteRef = await adminDb.collection('clientes').add(clienteData);

    // Atualizar clienteId na venda criada
    if (vendaId) {
      await adminDb.collection('vendas').doc(vendaId).update({ clienteId: clienteRef.id });
    }

    return NextResponse.json(
      {
        success: true,
        clienteId: clienteRef.id,
        vendaId: vendaId || null,
        message: 'Cliente criado com sucesso',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/clientes — atualizar campos de um cliente (clienteId no body)
export async function PATCH(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clienteId, ...fields } = body;

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'clienteId é obrigatório' },
        { status: 400 }
      );
    }

    const updateData: FirebaseFirestore.DocumentData = {
      ...fields,
      updatedAt: Timestamp.now(),
    };

    // Converter dataEnvio de string ISO para Timestamp
    if (fields.dataEnvio && typeof fields.dataEnvio === 'string') {
      updateData.dataEnvio = Timestamp.fromDate(new Date(fields.dataEnvio));
    }

    // Remover campos imutáveis
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.dataCadastro;

    await adminDb.collection('clientes').doc(clienteId).update(updateData);

    return NextResponse.json({ success: true, message: 'Cliente atualizado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/clientes?clienteId=xxx — deletar cliente e todas as vendas vinculadas
export async function DELETE(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'clienteId é obrigatório' },
        { status: 400 }
      );
    }

    // Deletar todas as vendas vinculadas
    const vendasSnapshot = await adminDb
      .collection('vendas')
      .where('clienteId', '==', clienteId)
      .get();

    await Promise.all(vendasSnapshot.docs.map((doc) => doc.ref.delete()));

    // Deletar o cliente
    await adminDb.collection('clientes').doc(clienteId).delete();

    return NextResponse.json({
      success: true,
      message: 'Cliente e vendas deletados com sucesso',
      vendasDeletadas: vendasSnapshot.docs.length,
    });
  } catch (error: any) {
    console.error('Erro ao deletar cliente:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
