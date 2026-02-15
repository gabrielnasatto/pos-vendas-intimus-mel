'use client';

import Link from 'next/link';
import { useVendas } from '@/hooks/useVendas';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Plus, Search, Trash2, Eye } from 'lucide-react';
import { formatarData, formatarMoeda } from '@/lib/utils';
import { useState } from 'react';

export default function VendasPage() {
  const { vendas, loading, deletarVenda } = useVendas();
  const [busca, setBusca] = useState('');

  const vendasFiltradas = vendas.filter((v: any) =>
    v.nomeCliente?.toLowerCase().includes(busca.toLowerCase()) ||
    v.produtos.some((p: any) => p.nome.toLowerCase().includes(busca.toLowerCase()))
  );

  const handleDelete = async (id: string, nomeCliente: string) => {
    if (confirm(`Tem certeza que deseja deletar a venda de ${nomeCliente}?`)) {
      await deletarVenda(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
          <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-primary-500/20"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Vendas
          </h1>
          <p className="text-gray-400 mt-2">Histórico de todas as vendas realizadas</p>
        </div>
        <Link href="/vendas/nova">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por cliente ou produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-burgundy-900/50 border border-burgundy-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="glass-dark rounded-2xl border border-burgundy-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-burgundy-900/50 border-b border-burgundy-800/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Produtos
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status WhatsApp
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-burgundy-800/30">
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    {busca ? (
                      <div>
                        <p className="text-gray-400 mb-4">Nenhuma venda encontrada com "{busca}"</p>
                        <Button onClick={() => setBusca('')} size="sm" variant="secondary">
                          Limpar Busca
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-400 mb-4">Nenhuma venda registrada ainda.</p>
                        <Link href="/vendas/nova">
                          <Button size="sm">
                            Registrar Primeira Venda
                          </Button>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((venda: any) => (
                  <tr key={venda.id} className="hover:bg-burgundy-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatarData(venda.dataVenda)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {venda.nomeCliente || 'Cliente não encontrado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {venda.produtos.length > 0 ? venda.produtos.map((p: any) => p.nome).join(', ') : 'Sem produtos'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                        {formatarMoeda(venda.valorTotal)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge status={venda.status || 'pendente'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/vendas/${venda.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(venda.id, venda.nomeCliente || 'Cliente')}
                          className="hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 text-center text-sm text-gray-500">
        {busca && `${vendasFiltradas.length} de ${vendas.length} vendas`}
        {!busca && `Total: ${vendas.length} vendas`}
      </div>
    </div>
  );
}