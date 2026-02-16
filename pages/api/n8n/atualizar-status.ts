import { NextApiRequest, NextApiResponse } from 'next';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar chave de segurança
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { vendaId, clienteId, status, erro } = req.body;

  if (!vendaId || !clienteId || !status) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  try {
    // Atualizar venda
    await updateDoc(doc(db, 'vendas', vendaId), {
      status,
      dataEnvio: Timestamp.now(),
      erro: erro || null,
    });

    // Atualizar cliente
    await updateDoc(doc(db, 'clientes', clienteId), {
      status,
      dataEnvio: Timestamp.now(),
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