import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return true;
  return apiKey === process.env.API_SECRET_KEY;
}

// GET /api/clientes/[clienteId]
export async function GET(
  request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clienteId } = params;
    const docRef = adminDb.collection('clientes').doc(clienteId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const data = snap.data()!;

    const cliente = {
      id: snap.id,
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

    return NextResponse.json({ success: true, cliente });
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
