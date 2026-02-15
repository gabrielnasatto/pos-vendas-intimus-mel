'use client';

import Link from 'next/link';
import { useClientes } from '@/hooks/useClientes';
import Button from '@/components/ui/Button';
import { Plus, Eye, Trash2, Phone, Calendar, Search } from 'lucide-react';
import { formatarTelefone } from '@/lib/utils';
import { useState } from 'react';

export default function ClientesPage() {
  const { clientes, loading, deletarCliente } = useClientes();
  const [busca, setBusca] = useState('');

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  );

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja deletar o cliente "${nome}"?`)) {
      await deletarCliente(id);
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
            Clientes
          </h1>
          <p className="text-gray-400 mt-2">Lista de todos os clientes cadastrados</p>
        </div>
        <Link href="/clientes/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {clientesFiltrados.length === 0 ? (
        <div className="glass-dark p-12 rounded-2xl border border-dark-700/50 text-center">
          {busca ? (
            <>
              <p className="text-gray-400 mb-4">Nenhum cliente encontrado com "{busca}"</p>
              <Button onClick={() => setBusca('')} size="sm" variant="secondary">
                Limpar Busca
              </Button>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-4">Nenhum cliente cadastrado ainda.</p>
              <Link href="/clientes/novo">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Cliente
                </Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.map((cliente) => (
            <div key={cliente.id} className="glass-dark p-6 rounded-2xl border border-dark-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-primary-400 transition-colors">
                    {cliente.nome}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-400">
                      <Phone className="w-4 h-4 mr-2 text-primary-500" />
                      {formatarTelefone(cliente.telefone)}
                    </div>
                    {cliente.dataNascimento && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar className="w-4 h-4 mr-2 text-primary-500" />
                        {cliente.dataNascimento}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link href={`/clientes/${cliente.id}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(cliente.id, cliente.nome)}
                  className="hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="mt-6 text-center text-sm text-gray-500">
        {busca && `${clientesFiltrados.length} de ${clientes.length} clientes`}
        {!busca && `Total: ${clientes.length} clientes`}
      </div>
    </div>
  );
}