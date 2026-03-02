"use client";

import Select from 'react-select';
import { Noto_Sans_Arabic } from 'next/font/google';

const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'] });

export default function ResourceHeader({ lang = 'en', onLangChange }) {
  const showSwitcher = typeof onLangChange === 'function';
  const langOptions = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: <span className={notoArabic.className}>العربية</span> },
  ];

  return (
    <header
      className="shadow-md border-b border-gray-200 dark:border-zinc-800 px-2 sm:px-6 py-2"
      style={{ backgroundColor: '#1b1464' }}
    >
      <div className="flex items-center justify-between gap-3 relative">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src="/acted-logo.png" alt="ACTED Logo" className="h-10 sm:h-14 w-auto" />
        </div>
        <h1 className="text-lg sm:text-2xl font-bold text-white text-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
          {lang === 'ar' ? 'بوابة الموارد' : 'Resources Hub'}
        </h1>
        {showSwitcher ? (
          <div style={{ minWidth: 140 }} className="sm:min-w-[160px]">
            <Select
              value={langOptions.find(option => option.value === lang)}
              onChange={option => onLangChange(option?.value || 'en')}
              options={langOptions}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#fff',
                  color: '#1b1464',
                  border: 'none',
                  minHeight: 36,
                  boxShadow: state.isFocused ? '0 0 0 1px #1b1464' : base.boxShadow,
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#1b1464',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }),
                menu: (base) => ({ ...base, zIndex: 20 }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#1b1464' : state.isFocused ? '#e0e7ff' : '#fff',
                  color: state.isSelected ? '#fff' : '#1b1464',
                  cursor: 'pointer',
                }),
                indicatorsContainer: (base) => ({ ...base, color: '#1b1464' }),
                dropdownIndicator: (base) => ({ ...base, color: '#1b1464', padding: '4px' }),
              }}
              instanceId="resource-lang-select"
              aria-label={lang === 'ar' ? 'تغيير اللغة' : 'Language Switch'}
              isSearchable={false}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </header>
  );
}
