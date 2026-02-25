import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return true;
  return apiKey === process.env.API_SECRET_KEY;
}

function serializeVenda(id: string, data: FirebaseFirestore.DocumentData, nomeCliente?: string) {
  return {
    id,
    clienteId: data.clienteId ?? null,
    nomeCliente: nomeCliente ?? null,
    dataVenda: data.dataVenda?.toDate?.()?.toISOString() ?? null,
    valorTotal: data.valorTotal ?? 0,
    produtos: data.produtos ?? [],
    vendedora: data.vendedora ?? 'Sistema',
    observacoes: data.observacoes ?? null,
    status: data.status ?? 'pendente',
    provou: data.provou ?? false,
    tentativas: data.tentativas ?? 0,
    erroEnvio: data.erroEnvio ?? null,
    erroEm: data.erroEm?.toDate?.()?.toISOString() ?? null,
    dataEnvio: data.dataEnvio?.toDate?.()?.toISOString() ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
  };
}

// GET /api/vendas?status=pendente&clienteId=xxx&vendaId=xxx
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clienteId = searchParams.get('clienteId');
    const vendaId = searchParams.get('vendaId');

    // Buscar venda específica por ID
    if (vendaId) {
      const docSnap = await adminDb.collection('vendas').doc(vendaId).get();

      if (!docSnap.exists) {
        return NextResponse.json({ success: false, error: 'Venda não encontrada' }, { status: 404 });
      }

      const data = docSnap.data()!;
      let nomeCliente: string | undefined;

      if (data.clienteId) {
        const clienteSnap = await adminDb.collection('clientes').doc(data.clienteId).get();
        if (clienteSnap.exists) {
          nomeCliente = clienteSnap.data()?.nome;
        }
      }

      return NextResponse.json({ success: true, venda: serializeVenda(docSnap.id, data, nomeCliente) });
    }

    // Listar vendas (com filtros opcionais)
    const snapshot = await adminDb
      .collection('vendas')
      .orderBy('dataVenda', 'desc')
      .get();

    let docs = snapshot.docs;

    if (clienteId) {
      docs = docs.filter((d) => d.data().clienteId === clienteId);
    }

    if (status) {
      docs = docs.filter((d) => d.data().status === status);
    }

    // Buscar nomes dos clientes em paralelo
    const vendasPromises = docs.map(async (doc) => {
      const data = doc.data();
      let nomeCliente: string | undefined;

      if (data.clienteId) {
        try {
          const clienteSnap = await adminDb.collection('clientes').doc(data.clienteId).get();
          if (clienteSnap.exists) {
            nomeCliente = clienteSnap.data()?.nome;
          }
        } catch {
          // silencioso — nomeCliente ficará undefined
        }
      }

      return serializeVenda(doc.id, data, nomeCliente);
    });

    const vendas = await Promise.all(vendasPromises);

    return NextResponse.json({ success: true, vendas, total: vendas.length });
  } catch (error: any) {
    console.error('Erro ao buscar vendas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/vendas — criar venda e atualizar cliente vinculado
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clienteId, valorTotal, produtos, observacoes, provou, vendedora } = body;

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'clienteId é obrigatório' },
        { status: 400 }
      );
    }

    const agora = Timestamp.now();

    const vendaRef = await adminDb.collection('vendas').add({
      clienteId,
      dataVenda: agora,
      valorTotal: valorTotal ?? 0,
      produtos: produtos ?? [],
      vendedora: vendedora ?? 'Sistema',
      observacoes: observacoes ?? '',
      status: 'pendente',
      provou: provou ?? false,
      createdAt: agora,
    });

    // Atualizar cliente com vendaId, status e provou
    await adminDb.collection('clientes').doc(clienteId).update({
      status: 'pendente',
      vendaId: vendaRef.id,
      provou: provou ?? false,
      updatedAt: agora,
    });

    return NextResponse.json(
      { success: true, vendaId: vendaRef.id, message: 'Venda criada com sucesso' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar venda:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/vendas — atualizar venda (vendaId no body)
export async function PATCH(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { vendaId, ...fields } = body;

    if (!vendaId) {
      return NextResponse.json(
        { success: false, error: 'vendaId é obrigatório' },
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
    delete updateData.dataVenda;

    await adminDb.collection('vendas').doc(vendaId).update(updateData);

    return NextResponse.json({ success: true, message: 'Venda atualizada com sucesso' });
  } catch (error: any) {
    console.error('Erro ao atualizar venda:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/vendas?vendaId=xxx
export async function DELETE(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const vendaId = searchParams.get('vendaId');

    if (!vendaId) {
      return NextResponse.json(
        { success: false, error: 'vendaId é obrigatório' },
        { status: 400 }
      );
    }

    await adminDb.collection('vendas').doc(vendaId).delete();

    return NextResponse.json({ success: true, message: 'Venda deletada com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar venda:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
