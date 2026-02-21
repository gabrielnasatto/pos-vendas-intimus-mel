'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDispararEnvio } from '@/hooks/useDispararEnvio';
import { LogOut, Users, ShoppingBag, Home, Menu, X, Send } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading, signOut } = useAuth();
  const { dispararEnvio, loading: loadingEnvio } = useDispararEnvio();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, mounted]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
          <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-primary-500/20"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/clientes', icon: Users, label: 'Clientes' },
    { href: '/vendas', icon: ShoppingBag, label: 'Vendas' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 w-64 glass-dark border-r border-burgundy-800/30 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-burgundy-800/30">
            <div className="flex items-center space-x-3">
              {/* Logo da Intimus Mel */}
              <div className="w-12 h-12 bg-burgundy-900 rounded-xl flex items-center justify-center border border-primary-500/30 overflow-hidden p-1">
                <Image 
                  src="/logo.png" 
                  alt="Intimus Mel" 
                  width={40} 
                  height={40}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent leading-tight">
                  Pós-Vendas
                </h1>
                <p className="text-xs text-primary-500 font-medium">Intimus Mel</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">{userData?.nome || 'Usuário'}</p>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-burgundy-800/50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Enviar Mensagens */}
          <div className="p-4 border-t border-burgundy-800/30">
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={dispararEnvio}
              loading={loadingEnvio}
              disabled={loadingEnvio}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Mensagens
            </Button>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-burgundy-800/30">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-burgundy-800/50"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 glass-dark border-b border-burgundy-800/30 p-4 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-burgundy-900 rounded-xl flex items-center justify-center border border-primary-500/30 overflow-hidden p-1">
              <Image 
                src="/logo.png" 
                alt="Intimus Mel" 
                width={32} 
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                Pós-Vendas
              </h1>
              <p className="text-xs text-primary-500">Intimus Mel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-burgundy-800/50 touch-manipulation active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-burgundy-950/95 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-64 glass-dark border-r border-burgundy-800/30">
            <div className="flex flex-col h-full pt-20">
              <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-burgundy-800/50'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Enviar Mensagens Mobile */}
              <div className="p-4 border-t border-burgundy-800/30">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    setSidebarOpen(false);
                    dispararEnvio();
                  }}
                  loading={loadingEnvio}
                  disabled={loadingEnvio}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Mensagens
                </Button>
              </div>

              {/* Logout Mobile */}
              <div className="p-4 border-t border-burgundy-800/30">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-400"
                  onClick={signOut}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8 pt-24 lg:pt-8">
        {children}
      </main>
    </div>
  );
}