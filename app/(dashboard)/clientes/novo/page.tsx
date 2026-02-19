'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { validarTelefone, validarDataNascimento } from '@/lib/utils';
import { useDataNascimento } from '@/hooks/useDataNascimento';
import toast from 'react-hot-toast';

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  telefone: z.string().refine(validarTelefone, 'Telefone inválido (use DDD + número)'),
  dataNascimento: z.string().optional().refine(
    (val) => !val || validarDataNascimento(val),
    'Data inválida (use DD/MM/AAAA)'
  ),
});

type FormData = z.infer<typeof schema>;

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { dataNascimento, handleDataNascimentoChange, setDataNascimento } = useDataNascimento();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const verificarClienteExiste = async (telefone: string) => {
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar cliente:', error);
      return false;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      const clienteExiste = await verificarClienteExiste(data.telefone);
      
      if (clienteExiste) {
        toast.error('Cliente com este telefone já está cadastrado!');
        setLoading(false);
        return;
      }
      
      const agora = Timestamp.now();

      const clienteData: any = {
        dataCadastro: agora,
        nome: data.nome,
        telefone: data.telefone,
        provou: false,
        status: 'pendente',
        createdAt: agora,
        updatedAt: agora,
      };

      if (data.dataNascimento) {
        clienteData.dataNascimento = data.dataNascimento;
      }

      await addDoc(collection(db, 'clientes'), clienteData);

      toast.success('Cliente cadastrado com sucesso!');
      router.push('/clientes');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/clientes">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Cadastrar Cliente
        </h1>
        <p className="text-gray-400 mt-2">Dados básicos do cliente</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Nome Completo"
              {...register('nome')}
              error={errors.nome?.message}
              placeholder="Maria Silva"
              required
            />

            <Input
              label="Telefone (com DDD)"
              {...register('telefone')}
              error={errors.telefone?.message}
              placeholder="47991234567"
              required
              helperText="Apenas números, com DDD. Ex: 47991234567"
            />

            <Input
              label="Data de Nascimento"
              value={dataNascimento}
              onChange={(e) => {
                handleDataNascimentoChange(e.target.value);
                setValue('dataNascimento', e.target.value);
              }}
              error={errors.dataNascimento?.message}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              helperText="Formato: DD/MM/AAAA (opcional)"
            />

            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
              <p className="text-sm text-primary-400">
                💡 <strong>Dica:</strong> Após cadastrar o cliente, vá em "Vendas" → "Nova Venda" para registrar suas compras.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading} disabled={loading}>
            Cadastrar Cliente
          </Button>
          <Link href="/clientes">
            <Button type="button" variant="secondary" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}