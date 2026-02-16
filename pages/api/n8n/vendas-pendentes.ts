import { NextApiRequest, NextApiResponse } from 'next';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar chave de segurança
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Buscar vendas pendentes
    const vendasRef = collection(db, 'vendas');
    const q = query(vendasRef, where('status', '==', 'pendente'));
    const snapshot = await getDocs(q);

    const vendas = [];

    for (const vendaDoc of snapshot.docs) {
      const vendaData: any = { id: vendaDoc.id, ...vendaDoc.data() };

      // Buscar cliente
      if (vendaData.clienteId) {
        try {
          const clienteDoc = await getDoc(doc(db, 'clientes', vendaData.clienteId));
          if (clienteDoc.exists()) {
            const clienteData = clienteDoc.data();
            vendaData.cliente = {
              nome: clienteData.nome,
              telefone: clienteData.telefone,
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