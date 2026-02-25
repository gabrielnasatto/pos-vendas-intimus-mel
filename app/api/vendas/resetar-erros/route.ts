import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return true;
  return apiKey === process.env.API_SECRET_KEY;
}

// POST /api/vendas/resetar-erros — recoloca todas as vendas com status 'erro' em 'pendente'
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
      .collection('vendas')
      .where('status', '==', 'erro')
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, total: 0, message: 'Nenhuma venda com erro encontrada' });
    }

    const agora = Timestamp.now();
    const batch = adminDb.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'pendente',
        tentativas: 0,
        erroEnvio: null,
        erroEm: null,
        updatedAt: agora,
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      total: snapshot.size,
      message: `${snapshot.size} venda(s) recolocada(s) na fila`,
    });
  } catch (error: any) {
    console.error('Erro ao resetar vendas com erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
