'use client';

import Link from 'next/link';
import { useVendas } from '@/hooks/useVendas';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Plus, Search, Trash2, Eye, Edit, RefreshCw, X } from 'lucide-react';
import { formatarData, formatarMoeda } from '@/lib/utils';
import { useState } from 'react';
import { StatusCliente } from '@/types';

const STATUS_OPCOES: { value: '' | StatusCliente; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'erro', label: 'Erro' },
  { value: 'duplicado', label: 'Duplicado' },
];

export default function VendasPage() {
  const { vendas, loading, deletarVenda, resetarErros } = useVendas();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'' | StatusCliente>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [reenviando, setReenviando] = useState(false);

  const temFiltrosAtivos = filtroStatus !== '' || dataInicio !== '' || dataFim !== '' || valorMin !== '' || valorMax !== '';

  const limparFiltros = () => {
    setFiltroStatus('');
    setDataInicio('');
    setDataFim('');
    setValorMin('');
    setValorMax('');
    setBusca('');
  };

  const vendasFiltradas = vendas
    .filter((v) => filtroStatus === '' || v.status === filtroStatus)
    .filter((v) => {
      if (!dataInicio) return true;
      const data = v.dataVenda?.toDate?.();
      return data ? data >= new Date(dataInicio) : true;
    })
    .filter((v) => {
      if (!dataFim) return true;
      const data = v.dataVenda?.toDate?.();
      return data ? data <= new Date(dataFim + 'T23:59:59') : true;
    })
    .filter((v) => !valorMin || v.valorTotal >= Number(valorMin))
    .filter((v) => !valorMax || v.valorTotal <= Number(valorMax))
    .filter(
      (v) =>
        !busca ||
        v.nomeCliente?.toLowerCase().includes(busca.toLowerCase()) ||
        v.produtos.some((p: any) => p.nome.toLowerCase().includes(busca.toLowerCase()))
    );

  const vendasComErro = vendas.filter((v) => v.status === 'erro');

  const handleDelete = async (id: string, nomeCliente: string) => {
    if (confirm(`Tem certeza que deseja deletar a venda de ${nomeCliente}?`)) {
      await deletarVenda(id);
    }
  };

  const handleReenviar = async () => {
    if (!confirm(`Reenviar ${vendasComErro.length} venda(s) com erro? Elas voltarão para 'pendente' e serão processadas na próxima execução do n8n.`)) return;
    setReenviando(true);
    try {
      await resetarErros();
    } finally {
      setReenviando(false);
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
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Vendas
          </h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">Histórico de todas as vendas realizadas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vendasComErro.length > 0 && (
            <Button
              variant="danger"
              onClick={handleReenviar}
              disabled={reenviando}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${reenviando ? 'animate-spin' : ''}`} />
              Reenviar com Erro ({vendasComErro.length})
            </Button>
          )}
          <Link href="/vendas/nova">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </Link>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-4">
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

      {/* Pills de Status */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_OPCOES.map((op) => (
          <button
            key={op.value}
            onClick={() => setFiltroStatus(op.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filtroStatus === op.value
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-burgundy-900/50 border-burgundy-800 text-gray-400 hover:border-primary-500/50 hover:text-gray-300'
            }`}
          >
            {op.label}
            {op.value !== '' && (
              <span className="ml-1.5 opacity-70">
                ({vendas.filter((v) => v.status === op.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtros avançados */}
      <div className="glass-dark rounded-xl border border-burgundy-800/30 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 bg-burgundy-900/50 border border-burgundy-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent [color-scheme:dark]"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 bg-burgundy-900/50 border border-burgundy-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent [color-scheme:dark]"
            />
          </div>
          <div className="flex-1 min-w-[110px]">
            <label className="block text-xs text-gray-500 mb-1">Valor mín. (R$)</label>
            <input
              type="number"
              placeholder="0"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              className="w-full px-3 py-2 bg-burgundy-900/50 border border-burgundy-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[110px]">
            <label className="block text-xs text-gray-500 mb-1">Valor máx. (R$)</label>
            <input
              type="number"
              placeholder="∞"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              className="w-full px-3 py-2 bg-burgundy-900/50 border border-burgundy-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {temFiltrosAtivos && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-burgundy-800 hover:border-red-500/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {vendasFiltradas.length === 0 ? (
          <div className="glass-dark p-10 rounded-2xl border border-burgundy-800/30 text-center">
            {busca || temFiltrosAtivos ? (
              <>
                <p className="text-gray-400 mb-4">Nenhuma venda encontrada com os filtros aplicados</p>
                <Button onClick={limparFiltros} size="sm" variant="secondary">
                  Limpar Filtros
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-4">Nenhuma venda registrada ainda.</p>
                <Link href="/vendas/nova">
                  <Button size="sm">Registrar Primeira Venda</Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          vendasFiltradas.map((venda: any) => (
            <div key={venda.id} className="glass-dark rounded-2xl border border-burgundy-800/30 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium text-white truncate">
                    {venda.nomeCliente || 'Cliente não encontrado'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatarData(venda.dataVenda)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge status={venda.status || 'pendente'} />
                  {venda.status === 'erro' && venda.erroEnvio && (
                    <p className="text-xs text-red-400/80 text-right max-w-[160px] leading-tight">
                      {venda.erroEnvio}
                    </p>
                  )}
                </div>
              </div>
              {venda.produtos.length > 0 && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                  {venda.produtos.map((p: any) => p.nome).join(', ')}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {formatarMoeda(venda.valorTotal)}
                </span>
                <div className="flex gap-1">
                  <Link href={`/vendas/${venda.id}/editar`}>
                    <Button size="sm" variant="ghost" className="hover:bg-primary-500/10 hover:text-primary-400">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Tabela */}
      <div className="hidden md:block glass-dark rounded-2xl border border-burgundy-800/30 overflow-hidden">
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
                    {busca || temFiltrosAtivos ? (
                      <div>
                        <p className="text-gray-400 mb-4">Nenhuma venda encontrada com os filtros aplicados</p>
                        <Button onClick={limparFiltros} size="sm" variant="secondary">
                          Limpar Filtros
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-400 mb-4">Nenhuma venda registrada ainda.</p>
                        <Link href="/vendas/nova">
                          <Button size="sm">Registrar Primeira Venda</Button>
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
                    <td className="px-6 py-4">
                      <Badge status={venda.status || 'pendente'} />
                      {venda.status === 'erro' && venda.erroEnvio && (
                        <p className="text-xs text-red-400/80 mt-1 max-w-[200px] leading-tight">
                          {venda.erroEnvio}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/vendas/${venda.id}/editar`}>
                          <Button size="sm" variant="ghost" className="hover:bg-primary-500/10 hover:text-primary-400">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
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
        {(busca || temFiltrosAtivos)
          ? `${vendasFiltradas.length} de ${vendas.length} vendas`
          : `Total: ${vendas.length} vendas`}
      </div>
    </div>
  );
}
