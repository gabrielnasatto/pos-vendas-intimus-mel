'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
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

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { dataNascimento, handleDataNascimentoChange, setDataNascimento } = useDataNascimento();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (params?.id) {
      fetchCliente(params?.id as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const fetchCliente = async (id: string) => {
    try {
      const clienteDoc = await getDoc(doc(db, 'clientes', id));
      if (clienteDoc.exists()) {
        const data = clienteDoc.data();
        setValue('nome', data.nome);
        setValue('telefone', data.telefone);
        if (data.dataNascimento) {
          setValue('dataNascimento', data.dataNascimento);
          setDataNascimento(data.dataNascimento);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast.error('Erro ao carregar dados do cliente');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      const updateData: any = {
        nome: data.nome,
        telefone: data.telefone,
        updatedAt: Timestamp.now(),
      };

      if (data.dataNascimento) {
        updateData.dataNascimento = data.dataNascimento;
      }

      await updateDoc(doc(db, 'clientes', params?.id as string), updateData);

      toast.success('Cliente atualizado com sucesso!');
      router.push(`/clientes/${params?.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <Link href={`/clientes/${params?.id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Editar Cliente
        </h1>
        <p className="text-gray-400 mt-2">Atualize os dados do cliente</p>
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
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading} disabled={loading}>
            Salvar Alterações
          </Button>
          <Link href={`/clientes/${params?.id}`}>
            <Button type="button" variant="secondary" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}