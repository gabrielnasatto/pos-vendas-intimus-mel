import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const vendasSnapshot = await adminDb
      .collection('vendas')
      .where('status', '==', 'pendente')
      .get();

    const vendas = [];

    for (const vendaDoc of vendasSnapshot.docs) {
      const vendaData: any = { id: vendaDoc.id, ...vendaDoc.data() };

      if (vendaData.clienteId) {
        try {
          const clienteDoc = await adminDb.collection('clientes').doc(vendaData.clienteId).get();
          if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            vendaData.cliente = {
              nome: clienteData?.nome || '',
              telefone: clienteData?.telefone || '',
            };
          }
        } catch (error) {
          console.error('Erro ao buscar cliente:', error);
        }
      }

      vendas.push(vendaData);
    }

    return res.status(200).json({ vendas });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    return res.status(500).json({ error: 'Erro ao buscar vendas', details: String(error) });
  }
}