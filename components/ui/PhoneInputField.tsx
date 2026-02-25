'use client';

import { useState, useRef, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

// ─── Seletor de país customizado (tema dark) ─────────────────────────────────

interface CountryOption {
  value: string | undefined;
  label: string;
  divider?: boolean;
}

interface FlagIconProps {
  country: string;
  label: string;
  className?: string;
  title?: string;
}

interface CountrySelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: CountryOption[];
  iconComponent: React.ComponentType<FlagIconProps>;
  disabled?: boolean;
  className?: string;
}

function CustomCountrySelect({
  value,
  onChange,
  options,
  iconComponent: FlagIcon,
  disabled,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foca o campo de busca ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = options.filter((opt) => {
    if (opt.divider) return false;
    if (!search) return true;
    return opt.label?.toLowerCase().includes(search.toLowerCase());
  });

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className="relative flex items-center shrink-0">
      {/* Botão da bandeira */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch('');
        }}
        className={cn(
          'flex items-center gap-1 mr-2 py-2 focus:outline-none transition-opacity',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
        aria-label="Selecionar país"
      >
        {value ? (
          <FlagIcon country={value} label={selectedOption?.label ?? value} className="w-6 h-4" />
        ) : (
          <span className="text-lg">🌐</span>
        )}
        <svg
          className="w-3 h-3 text-gray-400 ml-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown customizado */}
      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 mt-2 w-64 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            background: 'rgb(67 20 28 / 0.97)',
            border: '1px solid rgb(83 24 28 / 0.8)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Campo de busca */}
          <div className="p-2 border-b" style={{ borderColor: 'rgb(83 24 28 / 0.6)' }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="w-full text-white text-sm px-3 py-1.5 rounded-lg outline-none placeholder-gray-500"
              style={{ background: 'rgb(30 41 59 / 0.6)' }}
            />
          </div>

          {/* Lista de países */}
          <div className="overflow-y-auto max-h-52 scrollbar-hide">
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhum país encontrado</p>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value ?? `item-${i}`}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                    opt.value === value
                      ? 'text-primary-400'
                      : 'text-gray-200 hover:text-white'
                  )}
                  style={
                    opt.value === value
                      ? { background: 'rgb(217 167 116 / 0.15)' }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (opt.value !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgb(255 255 255 / 0.07)';
                  }}
                  onMouseLeave={(e) => {
                    if (opt.value !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = '';
                  }}
                >
                  {opt.value && (
                    <FlagIcon
                      country={opt.value}
                      label={opt.label}
                      className="w-5 h-4 shrink-0"
                    />
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente PhoneInputField ──────────────────────────────────────────────

interface PhoneInputFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function PhoneInputField({
  label,
  error,
  helperText,
  value,
  onChange,
  required,
  disabled,
  className,
}: PhoneInputFieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <PhoneInput
        defaultCountry="BR"
        international
        value={value}
        onChange={onChange}
        disabled={disabled}
        countrySelectComponent={CustomCountrySelect}
        className={cn('phone-input-container', error && 'phone-input-error')}
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
