'use client';

import { useEffect, useState } from 'react';
import { Users, Send, AlertCircle, TrendingUp, ShoppingBag, Clock } from 'lucide-react';
import { Estatisticas } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<Estatisticas>({
    totalClientes: 0,
    pendentes: 0,
    enviados: 0,
    erros: 0,
    taxaEnvio: 0,
    clientesHoje: 0,
  });
  const [totalVendas, setTotalVendas] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstatisticas();
  }, []);

  const fetchEstatisticas = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const [clientesRes, vendasRes] = await Promise.all([
        fetch('/api/clientes'),
        fetch('/api/vendas'),
      ]);

      const [clientesData, vendasData] = await Promise.all([
        clientesRes.json(),
        vendasRes.json(),
      ]);

      const clientes: any[] = clientesData.success ? clientesData.clientes : [];
      const vendas: any[] = vendasData.success ? vendasData.vendas : [];

      const totalClientes = clientes.length;

      const clientesHoje = clientes.filter((c) => {
        if (!c.dataCadastro) return false;
        return new Date(c.dataCadastro) >= hoje;
      }).length;

      const numVendas = vendas.length;
      const pendentes = vendas.filter((v) => v.status === 'pendente').length;
      const enviados = vendas.filter((v) => v.status === 'enviado').length;
      const erros = vendas.filter((v) => v.status === 'erro').length;
      const taxaEnvio = numVendas > 0 ? Math.round((enviados / numVendas) * 100) : 0;

      const vendasHojeCount = vendas.filter((v) => {
        if (!v.dataVenda) return false;
        return new Date(v.dataVenda) >= hoje;
      }).length;

      setStats({ totalClientes, pendentes, enviados, erros, taxaEnvio, clientesHoje });
      setTotalVendas(numVendas);
      setVendasHoje(vendasHojeCount);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
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

  const cards = [
    {
      title: 'Total de Clientes',
      value: stats.totalClientes,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Total de Vendas',
      value: totalVendas,
      icon: ShoppingBag,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Mensagens Enviadas',
      value: stats.enviados,
      icon: Send,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Aguardando Envio',
      value: stats.pendentes,
      icon: Clock,
      gradient: 'from-yellow-500 to-amber-500',
    },
    {
      title: 'Erros no Envio',
      value: stats.erros,
      icon: AlertCircle,
      gradient: 'from-red-500 to-rose-500',
    },
    {
      title: 'Novos Clientes Hoje',
      value: stats.clientesHoje,
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Visão geral do sistema de pós-vendas e envios</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card, index) => (
          <div
            key={index}
            className="glass-dark p-6 rounded-2xl border border-dark-700/50 hover:border-dark-600/50 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-1">{card.title}</p>
            <p
              className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Cards Informativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-dark p-6 rounded-2xl border border-dark-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Taxa de Envio de Mensagens</h3>
          <div className="flex items-center mb-4">
            <div className="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 shadow-lg shadow-primary-500/50"
                style={{ width: `${stats.taxaEnvio}%` }}
              />
            </div>
            <span className="ml-4 text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              {stats.taxaEnvio}%
            </span>
          </div>
          <p className="text-sm text-gray-400">
            {stats.enviados} de {totalVendas} mensagens enviadas com sucesso
          </p>
        </div>

        <div className="glass-dark p-6 rounded-2xl border border-dark-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Atividade Hoje</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Novos Clientes</span>
              <span className="text-2xl font-bold text-white">{stats.clientesHoje}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Vendas Registradas</span>
              <span className="text-2xl font-bold text-white">{vendasHoje}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo de Status */}
      <div className="glass-dark p-6 rounded-2xl border border-dark-700/50">
        <h3 className="text-lg font-semibold text-white mb-6">Status dos Envios</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-dark-800/50 rounded-xl border border-dark-700/30">
            <p className="text-sm text-gray-400 mb-2">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pendentes}</p>
            <p className="text-xs text-gray-500 mt-1">Aguardando</p>
          </div>
          <div className="text-center p-4 bg-dark-800/50 rounded-xl border border-dark-700/30">
            <p className="text-sm text-gray-400 mb-2">Enviados</p>
            <p className="text-2xl font-bold text-green-400">{stats.enviados}</p>
            <p className="text-xs text-gray-500 mt-1">Sucesso</p>
          </div>
          <div className="text-center p-4 bg-dark-800/50 rounded-xl border border-dark-700/30">
            <p className="text-sm text-gray-400 mb-2">Erros</p>
            <p className="text-2xl font-bold text-red-400">{stats.erros}</p>
            <p className="text-xs text-gray-500 mt-1">Falhas</p>
          </div>
          <div className="text-center p-4 bg-dark-800/50 rounded-xl border border-dark-700/30">
            <p className="text-sm text-gray-400 mb-2">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-white">
              {totalVendas > 0 ? Math.round((stats.enviados / totalVendas) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Eficiência</p>
          </div>
        </div>
      </div>
    </div>
  );
}
