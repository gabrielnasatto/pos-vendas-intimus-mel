import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { vendaId, clienteId, status, erro } = req.body;

  if (!vendaId || !clienteId || !status) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  try {
    const agora = FieldValue.serverTimestamp();

    await adminDb.collection('vendas').doc(vendaId).update({
      status,
      dataEnvio: agora,
      erro: erro || null,
    });

    await adminDb.collection('clientes').doc(clienteId).update({
      status,
      dataEnvio: agora,
    });

    return res.status(200).json({ 
      success: true,
      vendaId,
      clienteId,
      status 
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status', details: String(error) });
  }
}