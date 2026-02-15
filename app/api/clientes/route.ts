import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET - Buscar clientes pendentes (para n8n)
export async function GET(request: Request) {
  try {
    const clientesRef = collection(db, 'clientes');
    const q = query(clientesRef, where('status', '!=', 'enviado'));
    const snapshot = await getDocs(q);
    
    const clientes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        telefone: data.telefone,
        dataCadastro: data.dataCadastro.toDate().toISOString(),
        dataNascimento: data.dataNascimento,
        provou: data.provou,
        status: data.status,
        dataEnvio: data.dataEnvio ? data.dataEnvio.toDate().toISOString() : null,
        erro: data.erro || null,
      };
    });
    
    return NextResponse.json({ success: true, clientes, total: clientes.length });
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar status do cliente (para n8n)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { clienteId, status, dataEnvio, erro } = body;

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'clienteId é obrigatório' },
        { status: 400 }
      );
    }

    const clienteRef = doc(db, 'clientes', clienteId);
    
    const updateData: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (dataEnvio) {
      updateData.dataEnvio = Timestamp.fromDate(new Date(dataEnvio));
    }

    if (erro) {
      updateData.erro = erro;
    }

    await updateDoc(clienteRef, updateData);

    return NextResponse.json({ success: true, message: 'Cliente atualizado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}