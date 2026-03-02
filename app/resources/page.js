"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { Noto_Sans_Arabic } from 'next/font/google';

const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'] });

const resourceEntries = [
  { key: 'map', href: '/service-mapping' },
  { key: 'poster', href: '/resources/poster-cleaning' },
  { key: 'latrine', href: '/resources/latrine-pits-flyer' },
  { key: 'dbm', href: '/resources/dead-body-management' },
  { key: 'handwashing', href: '/resources/handwashing-flyer' },
  { key: 'psea', href: '/resources/psea-no-excuse' },
];

const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem('selectedLang') || 'en';
};

const translations = {
  en: {
    hubLabel: 'ACTED Resource Hub',
    title: 'Choose a resource to explore',
    subtitle: 'Access operational tools, awareness materials, and the live service mapping experience in one place.',
    switchLabel: 'العربية',
    resources: {
      map: {
        title: 'Service Mapping Platform',
        description: 'Explore the interactive map of critical services and response sites.',
      },
      poster: {
        title: 'Poster: Cleaning of Jerry Cans',
        description: 'Awareness poster outlining proper cleaning steps for jerry cans.',
      },
      latrine: {
        title: 'Flyer: Closing Latrine Pits',
        description: 'Guidance flyer on safely closing filled latrine pits.',
      },
      dbm: {
        title: 'Dead Body Management',
        description: 'Visual reference for respectful and safe dead body management.',
      },
      handwashing: {
        title: 'Handwashing Flyer',
        description: 'Key handwashing steps to reduce disease transmission.',
      },
      psea: {
        title: 'PSEA – No Excuse',
        description: 'Protection from Sexual Exploitation and Abuse awareness material.',
      },
    },
  },
  ar: {
    hubLabel: 'بوابة موارد أكتد',
    title: 'اختر مادة لعرضها',
    subtitle: 'وصول سريع إلى أدوات التشغيل، المواد التوعوية، ومنصة خريطة الخدمات التفاعلية.',
    switchLabel: 'English',
    resources: {
      map: {
        title: 'منصة خريطة الخدمات',
        description: 'استكشف الخريطة التفاعلية للخدمات الحيوية ومواقع الاستجابة.',
      },
      poster: {
        title: 'ملصق تنظيف الجِرار',
        description: 'ملصق توعوي يوضح خطوات تنظيف جرار المياه بشكل آمن.',
      },
      latrine: {
        title: 'نشرة إغلاق حفر المراحيض',
        description: 'إرشادات حول إغلاق حفر المراحيض الممتلئة بطريقة آمنة.',
      },
      dbm: {
        title: 'إدارة الجثث',
        description: 'مرجع بصري سريع لإدارة الجثث بشكل محترم وآمن.',
      },
      handwashing: {
        title: 'نشرة غسل اليدين',
        description: 'خطوات غسل اليدين الأساسية لتقليل انتقال الأمراض.',
      },
      psea: {
        title: 'لا تبرير للعنف الجنسي',
        description: 'مادة توعوية حول الحماية من الاستغلال والاعتداء الجنسي.',
      },
    },
  },
};

export default function ResourcesLandingPage() {
  const [lang, setLang] = useState(() => getStoredLanguage());
  const langOptions = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: <span className={notoArabic.className}>العربية</span> },
  ];
  const t = translations[lang];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('selectedLang', lang);
  }, [lang]);

  return (
    <div
      className={`min-h-screen bg-zinc-50 dark:bg-black text-gray-900 dark:text-gray-100 ${lang === 'ar' ? `rtl ${notoArabic.className}` : ''}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: lang === 'ar' ? undefined : 'Branding, sans-serif' }}
    >
      <header className="shadow-md border-b border-gray-200 dark:border-zinc-800 px-2 sm:px-6 py-2" style={{ backgroundColor: '#1b1464' }}>
        <div className="flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-2 sm:gap-4">
            <img src="/acted-logo.png" alt="ACTED Logo" className="h-10 sm:h-14 w-auto" />
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-white text-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
            {lang === 'ar' ? 'بوابة الموارد' : 'Resources Hub'}
          </h1>
          <div style={{ minWidth: 140 }} className="sm:min-w-[160px]">
            <Select
              value={langOptions.find(option => option.value === lang)}
              onChange={option => setLang(option?.value || 'en')}
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
              instanceId="resources-lang-select"
              aria-label="Language Switch"
              isSearchable={false}
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">{t.hubLabel}</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2">{t.title}</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-center">{t.subtitle}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {resourceEntries.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className="group rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{t.resources[key].title}</h3>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors text-lg">
                  {lang === 'ar' ? '←' : '→'}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t.resources[key].description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
