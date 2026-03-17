'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Noto_Sans_Arabic } from 'next/font/google';
import { kml as toGeoJSON } from '@mapbox/togeojson';

const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'] });

const DEFAULT_MAP_CENTER = [31.4, 34.32];
const DEFAULT_MAP_ZOOM = 12;
const USER_LOCATION_ZOOM = 13;
const SERVICE_FOCUS_ZOOM = 16;

const campBoundaryFiles = [
  {
    id: 'fzr',
    label: 'FZR Sites',
    file: '/FZR_Sites.kml',
    stroke: '#ea580c',
    fill: '#ea580c33',
  },
  {
    id: 'ghc',
    label: 'GHC Sites',
    file: '/GHC_Sites.kml',
    stroke: '#0ea5e9',
    fill: '#0ea5e933',
  },
  {
    id: 'gfm',
    label: 'GFM Sites',
    file: '/GFM_Sites.kml',
    stroke: '#22c55e',
    fill: '#22c55e33',
  },
];

// Fix Leaflet marker icons
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
// });

// Fix for broken routing destination/waypoint icons
// if (typeof window !== 'undefined' && L && L.Routing && L.Routing.Control) {
//   const greenIcon = new L.Icon({
//     iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
//     iconSize: [25, 41],
// iconAnchor: [12, 41],
// popupAnchor: [1, -34],
// shadowSize: [41, 41],
// });
// L.Routing.Control.prototype.options.waypointIcon = function() {
//   return greenIcon;
// };
// }

// Define marker colors for different service types
const getColorFromService = (serviceName) => {
  console.log('Service name:', serviceName);
  const lowerName = serviceName.toLowerCase();
  let color;
  if (lowerName.includes('water trucking')) color = '#1e90ff';
  else if (lowerName.includes('health space') && lowerName.includes('clinic')) color = '#ff4444';
  else if (lowerName.includes('community kitchen')) color = '#ff8800';
  else if (lowerName.includes('tls') || lowerName.includes('school')) color = '#9933ff';
  else if (lowerName.includes('community space')) color = '#4BB272';
  else if (lowerName.includes('nutrition center')) color = '#fbbf24';
  else if (lowerName.includes('distribution point')) color = '#545454';
  else if (lowerName.includes('social activity')) color = '#93c01f';
  else color = '#808080'; // default gray
  console.log('Assigned color:', color);
  return color;
};

const createHealthIcon = (L, color = '#ff4444') => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="25" height="41">
      <path class="marker-glow" fill="none" stroke="var(--marker-glow-color, transparent)" stroke-width="var(--marker-glow-width, 0)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z" />
      <path class="marker-outline" fill="none" stroke="var(--marker-outline-color, transparent)" stroke-width="var(--marker-outline-width, 0)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z" />
      <path class="marker-shape" fill="${color}" stroke="var(--marker-stroke-color, #fff)" stroke-width="var(--marker-stroke-width, 1.5)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z"/>
      <image href="/medical.png" x="6" y="6" width="12" height="12" style="filter: brightness(0) invert(1)" />
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'custom-marker-icon',
  });
};

const getMarkerIcon = (L, serviceName) => {
  const color = getColorFromService(serviceName);
  const type = getServiceType(serviceName);

  if (type === 'Health Space/Clinic') {
    return createHealthIcon(L, color);
  }

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="25" height="41">
      <path class="marker-glow" fill="none" stroke="var(--marker-glow-color, transparent)" stroke-width="var(--marker-glow-width, 0)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z" />
      <path class="marker-outline" fill="none" stroke="var(--marker-outline-color, transparent)" stroke-width="var(--marker-outline-width, 0)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z" />
      <path class="marker-shape" fill="${color}" stroke="var(--marker-stroke-color, #fff)" stroke-width="var(--marker-stroke-width, 1.5)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z"/>
      <circle cx="12" cy="9" r="3" fill="#fff"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'custom-marker-icon',
  });
};

const getStripedMarkerIcon = (L, colors) => {
  console.log('Striped marker colors:', colors);
  const numStripes = colors.length;
  const uniqueId = Math.random().toString(36).substr(2, 9);

  let stops = '';
  for (let i = 0; i < numStripes; i++) {
    const startPercent = (i / numStripes) * 100;
    const endPercent = ((i + 1) / numStripes) * 100;
    stops += `<stop offset="${startPercent}%" style="stop-color:${colors[i]};stop-opacity:1" />`;
    stops += `<stop offset="${endPercent}%" style="stop-color:${colors[i]};stop-opacity:1" />`;
  }

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="25" height="41">
      <defs>
        <linearGradient id="gradient${uniqueId}" x1="0%" y1="0%" x2="100%" y2="0%">
          ${stops}
        </linearGradient>
      </defs>
      <path class="marker-glow" fill="none" stroke="var(--marker-glow-color, transparent)" stroke-width="var(--marker-glow-width, 0)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z" />
      <path class="marker-outline" fill="none" stroke="var(--marker-outline-color, transparent)" stroke-width="var(--marker-outline-width, 0)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z" />
      <path class="marker-shape" fill="url(#gradient${uniqueId})" stroke="var(--marker-stroke-color, #fff)" stroke-width="var(--marker-stroke-width, 1.5)" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z"/>
      <circle cx="12" cy="9" r="3" fill="#fff"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'custom-marker-icon',
  });
};

// Get service type from name
const getServiceType = (serviceName) => {
  if (serviceName.startsWith('Water Trucking')) return 'Water Trucking';
  if (serviceName.startsWith('Health Space/Clinic')) return 'Health Space/Clinic';
  if (serviceName.startsWith('Community Kitchen')) return 'Community Kitchen';
  if (serviceName.startsWith('TLS/School')) return 'TLS/School';
  if (serviceName.startsWith('Community Space')) return 'Community Space';
  if (serviceName.startsWith('Nutrition Center')) return 'Nutrition Center';
  if (serviceName.startsWith('Distribution Point')) return 'Distribution Point';
  if (serviceName.startsWith('Social Activity')) return 'Social Activity';
  return 'Other';
};

// Google Analytics event tracking
const gaEvent = (action, params = {}) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', action, params);
};

const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem('selectedLang') || 'en';
};

// Shared translations for every service label to keep UI output consistent across languages
const rawServiceTranslations = [
  {
    key: 'Community Space',
    en: 'Community Space',
    ar: 'مساحة مجتمعية',
  },
  {
    key: 'Community Kitchen',
    en: 'Community Kitchen',
    ar: 'مطبخ مجتمعي',
  },
  {
    key: 'Community Kitchen ( Abo Zaid)',
    en: 'Community Kitchen (Abo Zaid)',
    ar: 'مطبخ مجتمعي (أبو زيد)',
  },
  {
    key: 'Community Kitchen ( Thaqafa w Fakr Al hor )',
    en: 'Community Kitchen (Thaqafa w Fakr Al Hor)',
    ar: 'مطبخ مجتمعي (ثقافة وفكر الحر)',
  },
  {
    key: 'Community Kitchen (Tekeya) - Al-Fares Al-Shahem',
    en: 'Community Kitchen (Tekeya) - Al-Fares Al-Shahem',
    ar: 'مطبخ مجتمعي (تكية) - الفارس الشهم',
  },
  {
    key: 'Community Kitchen (Tekeya) - Rahma Around the world',
    en: 'Community Kitchen (Tekeya) - Rahma Around the World',
    ar: 'مطبخ مجتمعي (تكية) - رحمة حول العالم',
  },
  {
    key: 'Community Kitchen (Tekeya) - WCK',
    en: 'Community Kitchen (Tekeya) - World Central Kitchen (WCK)',
    ar: 'مطبخ مجتمعي (تكية) - WCK',
  },
  {
    key: 'Community Kitchen (Tekeya) - Wafaa Al-Mohsineen',
    en: 'Community Kitchen (Tekeya) - Wafaa Al-Mohsineen',
    ar: 'مطبخ مجتمعي (تكية) - وفاء المحسنين',
  },
  {
    key: 'Community Kitchen - Dar Al-Kitab & Al-Sunna',
    en: 'Community Kitchen - Dar Al-Kitab & Al-Sunna',
    ar: 'مطبخ مجتمعي - دار الكتاب والسنة',
  },
  {
    key: 'Community Kitchen - Future Youth Kitchen',
    en: 'Community Kitchen - Future Youth Kitchen',
    ar: 'مطبخ مجتمعي - مطبخ شباب المستقبل',
  },
  {
    key: 'Community Kitchen - Tekeya',
    en: 'Community Kitchen - Tekeya',
    ar: 'مطبخ مجتمعي (تكية)',
    aliases: ['Community Kitchen Tekeya'],
  },
  {
    key: 'Community Kitchen - Tekeya (WCK)',
    en: 'Community Kitchen - Tekeya (World Central Kitchen - WCK)',
    ar: 'مطبخ مجتمعي (تكية) - WCK',
  },
  {
    key: 'Community Kitchen - Tekeya - Al-Aydy Al-Raheema',
    en: 'Community Kitchen - Tekeya - Al-Aydy Al-Raheema',
    ar: 'مطبخ مجتمعي (تكية) - الأيادي الرحيمة',
  },
  {
    key: 'Community Kitchen - Tekeya - Basmat Amal Site',
    en: 'Community Kitchen - Tekeya - Basmat Amal Site',
    ar: 'مطبخ مجتمعي (تكية) - موقع بسمة أمل',
  },
  {
    key: 'Community Kitchen - Tekeya - WCK',
    en: 'Community Kitchen - Tekeya - World Central Kitchen (WCK)',
    ar: 'مطبخ مجتمعي (تكية) - WCK',
  },
  {
    key: 'Community Kitchen - Tekeya - WCK - Save Youth Future Society (SYFS)',
    en: 'Community Kitchen - Tekeya - World Central Kitchen (WCK) - Save Youth Future Society (SYFS)',
    ar: 'مطبخ مجتمعي (تكية) - WCK - جمعية شباب المستقبل (SYFS)',
  },
  {
    key: 'Community Kitchen - WCK',
    en: 'Community Kitchen - World Central Kitchen (WCK)',
    ar: 'مطبخ مجتمعي - WCK',
  },
  {
    key: 'Distribution Point',
    en: 'Distribution Point',
    ar: 'نقطة توزيع',
  },
  {
    key: 'Health Space/Clinic',
    en: 'Health Space/Clinic',
    ar: 'مساحة صحية / عيادة',
    aliases: ['Health Space/Clinic '],
  },
  {
    key: 'Health Space/Clinic (Ard Al-Insan)',
    en: 'Health Space/Clinic - Ard Al-Insan',
    ar: 'مساحة صحية / عيادة - أرض الإنسان',
  },
  {
    key: 'Health Space/Clinic - Abdelshafi Org',
    en: 'Health Space/Clinic - Abdelshafi Organization',
    ar: 'مساحة صحية / عيادة - مؤسسة عبد الشافي',
  },
  {
    key: 'Health Space/Clinic - IMC',
    en: 'Health Space/Clinic - International Medical Corps (IMC)',
    ar: 'مساحة صحية / عيادة - اللجنة الطبية الدولية (IMC)',
  },
  {
    key: 'Health Space/Clinic - Lavender Clinic',
    en: 'Health Space/Clinic - Lavender Clinic',
    ar: 'مساحة صحية / عيادة - عيادة لافندر',
  },
  {
    key: 'Health Space/Clinic - PRCS',
    en: 'Health Space/Clinic - Palestine Red Crescent Society (PRCS)',
    ar: 'مساحة صحية / عيادة - الهلال الأحمر الفلسطيني',
  },
  {
    key: 'Health Space/Clinic - Project Hoppe',
    en: 'Health Space/Clinic - Project Hoppe',
    ar: 'مساحة صحية / عيادة - مشروع هوبه',
  },
  {
    key: 'Health Space/Clinic - Rahma Around the world',
    en: 'Health Space/Clinic - Rahma Around the World',
    ar: 'مساحة صحية / عيادة - رحمة حول العالم',
  },
  {
    key: 'Health Space/Clinic - Al-Shifa Hospital - phone need to edit',
    en: 'Health Space/Clinic - Al-Shifa Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الشفاء',
  },
  {
    key: 'Health Space/Clinic - Public Aid Hospital',
    en: 'Health Space/Clinic - Public Aid Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الإغاثة العامة',
  },
  {
    key: 'Health Space/Clinic - IMC Field Hospital',
    en: 'Health Space/Clinic - IMC Field Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى ميداني (اللجنة الطبية الدولية)',
  },
  {
    key: 'Health Space/Clinic - Al-Aqsa Hospital',
    en: 'Health Space/Clinic - Al-Aqsa Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الأقصى',
  },
  {
    key: 'Health Space/Clinic - Al-Awda Hospital - Nuseirat',
    en: 'Health Space/Clinic - Al-Awda Hospital - Nuseirat',
    ar: 'مساحة صحية / عيادة - مستشفى العودة - النصيرات',
  },
  {
    key: 'Health Space/Clinic - ICRC Field Hospital',
    en: 'Health Space/Clinic - ICRC Field Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى ميداني (اللجنة الدولية للصليب الأحمر)',
  },
  {
    key: 'Health Space/Clinic - UK Med Field Hospital',
    en: 'Health Space/Clinic - UK Med Field Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى ميداني UK Med',
  },
  {
    key: 'Health Space/Clinic - Nasser Hospital',
    en: 'Health Space/Clinic - Nasser Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى ناصر',
  },
  {
    key: 'Health Space/Clinic - MSF B Field Hospital Al-Zuwaida',
    en: 'Health Space/Clinic - MSF B Field Hospital Al-Zuwaida',
    ar: 'مساحة صحية / عيادة - مستشفى ميداني أطباء بلا حدود (بلجيكا) - الزوايدة',
  },
  {
    key: 'Health Space/Clinic - PRCS Saraya Field Hospital Gaza City',
    en: 'Health Space/Clinic - PRCS Saraya Field Hospital Gaza City',
    ar: 'مساحة صحية / عيادة - مستشفى السرايا الميداني للهلال الأحمر الفلسطيني - غزة',
  },
  {
    key: 'Health Space/Clinic - PRCS Al-Quds Hospital Gaza City',
    en: 'Health Space/Clinic - PRCS Al-Quds Hospital Gaza City',
    ar: 'مساحة صحية / عيادة - مستشفى القدس للهلال الأحمر الفلسطيني - غزة',
  },
  {
    key: 'Health Space/Clinic - Patient Friends Benevolent Society',
    en: 'Health Space/Clinic - Patient Friends Benevolent Society',
    ar: 'مساحة صحية / عيادة - جمعية أصدقاء المريض الخيرية',
  },
  {
    key: 'Health Space/Clinic - Kuwaiti Field Hospital Heal Palestine',
    en: 'Health Space/Clinic - Kuwaiti Field Hospital Heal Palestine',
    ar: 'مساحة صحية / عيادة - المستشفى الميداني الكويتي (Heal Palestine)',
  },
  {
    key: 'Health Space/Clinic - PRCS field hospital Mawasi Khan Younis',
    en: 'Health Space/Clinic - PRCS Field Hospital Mawasi Khan Younis',
    ar: 'مساحة صحية / عيادة - مستشفى الهلال الأحمر الميداني - مواصي خان يونس',
  },
  {
    key: 'Health Space/Clinic - Al-Amal Hospital',
    en: 'Health Space/Clinic - Al-Amal Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الأمل',
  },
  {
    key: 'Health Space/Clinic - MSF Belgium - PHCC',
    en: 'Health Space/Clinic - MSF Belgium - PHCC',
    ar: 'مساحة صحية / عيادة - أطباء بلا حدود (بلجيكا) - مركز رعاية صحية أولية',
  },
  {
    key: 'Health Space/Clinic - Kamal Adwan',
    en: 'Health Space/Clinic - Kamal Adwan Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى كمال عدوان',
  },
  {
    key: 'Health Space/Clinic - Al Karama',
    en: 'Health Space/Clinic - Al Karama Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الكرامة',
  },
  {
    key: 'Health Space/Clinic - Mohamed Al Durrah Hospital',
    en: 'Health Space/Clinic - Mohamed Al Durrah Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى محمد الدرة',
  },
  {
    key: 'Health Space/Clinic - Al-Rantisi',
    en: 'Health Space/Clinic - Al-Rantisi Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الرنتيسي',
  },
  {
    key: 'Health Space/Clinic - Al Helou International Hospital',
    en: 'Health Space/Clinic - Al Helou International Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الحلو الدولي',
  },
  {
    key: 'Health Space/Clinic - Al Wafaa Rehabilitation Hospital',
    en: 'Health Space/Clinic - Al Wafaa Rehabilitation Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الوفاء للتأهيل',
  },
  {
    key: 'Health Space/Clinic - Assahaba Medical Complex',
    en: 'Health Space/Clinic - Assahaba Medical Complex',
    ar: 'مساحة صحية / عيادة - مجمع الصحابة الطبي',
  },
  {
    key: 'Health Space/Clinic - Al Ahli Arab Hospital',
    en: 'Health Space/Clinic - Al Ahli Arab Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الأهلي العربي',
  },
  {
    key: 'Health Space/Clinic - Haifa Charity Hospital',
    en: 'Health Space/Clinic - Haifa Charity Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى حيفا الخيري',
  },
  {
    key: 'Health Space/Clinic - St. John\'s Eye Hospital',
    en: 'Health Space/Clinic - St. John\'s Eye Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى سانت جون للعيون',
  },
  {
    key: 'Health Space/Clinic - Yaffa Hospital',
    en: 'Health Space/Clinic - Yaffa Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى يافا',
  },
  {
    key: 'Health Space/Clinic - Dar Essalam Hospital',
    en: 'Health Space/Clinic - Dar Essalam Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى دار السلام',
  },
  {
    key: 'Health Space/Clinic - Al-Khair Hospital',
    en: 'Health Space/Clinic - Al-Khair Hospital',
    ar: 'مساحة صحية / عيادة - مستشفى الخير',
  },
  {
    key: 'Health Space/Clinic - UNRWA',
    en: 'Health Space/Clinic - UNRWA',
    ar: 'مساحة صحية / عيادة - الأونروا',
  },
  {
    key: 'Health Space/Clinic Hospitals',
    en: 'Health Facilities / Hospitals',
    ar: 'مستشفيات / مساحات صحية',
  },
  {
    key: 'Nutrition Center',
    en: 'Nutrition Center',
    ar: 'مركز تغذية',
  },
  {
    key: 'Nutrition Center - Ard Al-Insan x IRC',
    en: 'Nutrition Center - Ard Al-Insan x IRC',
    ar: 'مركز تغذية - أرض الإنسان x IRC',
  },
  {
    key: 'Nutrition Center - Ard Al-Insan x WFP',
    en: 'Nutrition Center - Ard Al-Insan x WFP',
    ar: 'مركز تغذية - أرض الإنسان x برنامج الأغذية العالمي',
  },
  {
    key: 'Nutrition Center - Save the Children',
    en: 'Nutrition Center - Save the Children',
    ar: 'مركز تغذية - منظمة إنقاذ الطفل',
  },
  {
    key: 'Nutrition Center - WFP/UNICEF',
    en: 'Nutrition Center - WFP / UNICEF',
    ar: 'مركز تغذية - برنامج الأغذية العالمي / اليونيسف',
  },
  {
    key: 'Social Activity',
    en: 'Social Activity',
    ar: 'نشاط اجتماعي',
  },
  {
    key: 'TLS/School',
    en: 'Temporary Learning Space / School',
    ar: 'مساحة تعليمية مؤقتة / مدرسة',
  },
  {
    key: 'TLS/School ( AL Amal )',
    en: 'Temporary Learning Space / School - Al Amal',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - الأمل',
  },
  {
    key: 'TLS/School ( Al Mansy )',
    en: 'Temporary Learning Space / School - Al Mansy',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - المنسي',
  },
  {
    key: 'TLS/School (ECCD/SCI)',
    en: 'Temporary Learning Space / School (ECCD / Save the Children)',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - التنمية المبكرة / إنقاذ الطفل',
  },
  {
    key: 'TLS/School - Al-Amal',
    en: 'Temporary Learning Space / School - Al-Amal',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - الأمل',
  },
  {
    key: 'TLS/School - Al-Sahabah Organization',
    en: 'Temporary Learning Space / School - Al-Sahabah Organization',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - مؤسسة الصحابة',
  },
  {
    key: 'TLS/School - Dar Al-Kitab & Al-Sunna',
    en: 'Temporary Learning Space / School - Dar Al-Kitab & Al-Sunna',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - دار الكتاب والسنة',
  },
  {
    key: 'TLS/School - UN',
    en: 'Temporary Learning Space / School - United Nations',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - الأمم المتحدة',
  },
  {
    key: 'TLS/School - UNICEF',
    en: 'Temporary Learning Space / School - UNICEF',
    ar: 'مساحة تعليمية مؤقتة / مدرسة - اليونيسف',
  },
  {
    key: 'Water Trucking Distribution (MSF)',
    en: 'Water Trucking Distribution - Medecins Sans Frontieres (MSF)',
    ar: 'توزيع مياه - أطباء بلا حدود (MSF)',
  },
  {
    key: 'Water Trucking Distribution (We World)',
    en: 'Water Trucking Distribution - WeWorld',
    ar: 'توزيع مياه - وي وورلد',
  },
  {
    key: 'Water Trucking Distribution (Ø§ØµØ¯Ù‚Ø§Ø¡ Ø§Ù„Ø¨ÙŠØ¦Ø©)',
    en: 'Water Trucking Distribution - Friends of the Environment',
    ar: 'توزيع مياه - أصدقاء البيئة',
  },
  {
    key: 'Water Trucking Distribution Point',
    en: 'Water Trucking Distribution Point',
    ar: 'نقطة توزيع مياه',
    aliases: ['Water Trucking Distribution point ', 'Water Trucking distribution point'],
  },
  {
    key: 'Water Trucking Distribution Point (Acted)',
    en: 'Water Trucking Distribution Point - ACTED',
    ar: 'نقطة توزيع مياه - أكتد',
  },
  {
    key: 'Water Trucking Distribution Point (MSF)',
    en: 'Water Trucking Distribution Point - MSF',
    ar: 'نقطة توزيع مياه - أطباء بلا حدود',
  },
  {
    key: 'Water Trucking Distribution Point - Al-Mukhtar Faisal',
    en: 'Water Trucking Distribution Point - Al-Mukhtar Faisal',
    ar: 'نقطة توزيع مياه - المختار فيصل',
  },
  {
    key: 'Water Trucking Distribution Point - Al-Ruhamaa` Site',
    en: 'Water Trucking Distribution Point - Al-Ruhamaa Site',
    ar: 'نقطة توزيع مياه - موقع الرحماء',
  },
  {
    key: 'Water Trucking Distribution Point - Basmat Amal Site',
    en: 'Water Trucking Distribution Point - Basmat Amal Site',
    ar: 'نقطة توزيع مياه - موقع بسمة أمل',
  },
];

const servicesProvidedTranslations = rawServiceTranslations.reduce((acc, { key, en, ar, aliases = [] }) => {
  const keys = [key, ...aliases];
  keys.forEach((serviceKey) => {
    acc.en[serviceKey] = en || key;
    acc.ar[serviceKey] = ar || en || key;
  });
  return acc;
}, { en: {}, ar: {} });

export default function Home() {
    // State for marker info panel
  const [selectedMarkerInfo, setSelectedMarkerInfo] = useState(null);
  const [showMarkerPanel, setShowMarkerPanel] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [services, setServices] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [lang, setLang] = useState(() => getStoredLanguage());
  const [isMobile, setIsMobile] = useState(false);
  const [activeMarkerKey, setActiveMarkerKey] = useState(null);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markerPanelHideTimeout = useRef(null);
  const markersRef = useRef(new Map());
  const baseLayersRef = useRef({ street: null, satellite: null });
  const boundaryLayersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const hasCenteredOnUserRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('selectedLang', lang);
  }, [lang]);

  const closeMarkerPanel = () => {
    setActiveMarkerKey(null);
    setShowMarkerPanel(false);
    if (markerPanelHideTimeout.current) {
      clearTimeout(markerPanelHideTimeout.current);
    }
    markerPanelHideTimeout.current = setTimeout(() => {
      setSelectedMarkerInfo(null);
      markerPanelHideTimeout.current = null;
    }, 300);
  };

  const applyMarkerHighlight = useCallback((targetKey) => {
    markersRef.current.forEach((marker, markerKey) => {
      const element = marker.getElement();
      if (!element) return;
      if (markerKey === targetKey) {
        element.classList.add('selected-marker');
        marker.setZIndexOffset(500);
      } else {
        element.classList.remove('selected-marker');
        marker.setZIndexOffset(0);
      }
    });
  }, [markersRef]);

  const openMarkerPanel = (info) => {
    if (markerPanelHideTimeout.current) {
      clearTimeout(markerPanelHideTimeout.current);
      markerPanelHideTimeout.current = null;
    }
    setSelectedMarkerInfo(info);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => setShowMarkerPanel(true));
    } else {
      setShowMarkerPanel(true);
    }
  };

  useEffect(() => {
    return () => {
      if (markerPanelHideTimeout.current) {
        clearTimeout(markerPanelHideTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    applyMarkerHighlight(activeMarkerKey);
  }, [activeMarkerKey, applyMarkerHighlight]);

  const t = {
    // Debug: Log all site names in translation dictionaries (browser only)
    en: {
      appTitle: 'Service Mapping App',
      sites: 'Sites',
      services: 'Services',
      yourLocation: 'Your Location',
      loading: 'Loading location...',
      geolocationError: 'Unable to access your location. Focusing on Gaza Strip.',
      geolocationInsecure: 'Location access requires HTTPS. Focusing on Gaza Strip.',
      geolocationPermissionDenied: 'Location permission denied. Focusing on Gaza Strip.',
      geolocationUnavailable: 'Location unavailable. Focusing on Gaza Strip.',
      geolocationTimeout: 'Location request timed out. Focusing on Gaza Strip.',
      selected: 'Selected',
      switchToArabic: 'العربية',
      switchToEnglish: 'English',
      legend: 'Legend',
      mapView: 'Map view',
      satelliteView: 'Satellite view',
      // Add site name translations
      siteNames: {
        'Al-Farra Site': 'Al-Farra Site',
        'Al-Shorbaji': 'Al-Shorbaji',
        'Al-Hayat': 'Al-Hayat',
        'Al-Shahri': 'Al-Shahri',
        'Al-Quds Site (Abdeen Area)': 'Al-Quds (Abdeen Area)',
        'Al-Nakheel & Al-Zytoon Site': 'Al-Nakheel & Al-Zytoon Site',
        'Al-Fedaa Site': 'Al-Fedaa Site',
        'Wijdan Site': 'Wijdan Site',
        'Yafa Site': 'Yafa Site',
        'Al-Karam': 'Al-Karama',
        'Al-Farooq Site (Abu Farooq Area)': 'Al-Farooq Site (Abu Farooq Area)',
        'Shady Site': 'Shady Site',
        'Al-Mosalla Site': 'Al-Mosalla Site',
        'Al-Quds Site (Al-Hayat Area)': 'Al-Quods Site (Al-Hayat Area)',
        'Al-Shahri Site': 'Al-Shahri Site',
        'Al-Jawhari Site': 'Al-Jawhari Site',
        'Al-Rimal Al-Thahabiea Site': 'Al-Rimal Al-Thahabiea Site',
        'Al-Shaheed Jameel Site': 'Al-Shaheed Jameel Site',
        'Al-Malaab Site': 'Al-Malaab Site',
        'Al Nour Site': 'Al Nour Site',
        'Hanoon Site': 'Hanoon Site',
        'Al-Farooq Site (Al-Hayat Area)': 'Al-Farooq Site (Al-Hayat Area)',
        'Garb Al-Shaleh Site': 'Garb Al-Shaleh Site'
      },
      services_provided: servicesProvidedTranslations.en,
      legend_services: {
        "Water Trucking": "Water Trucking",
        "Health Space/Clinic": "Health Space/Clinic",
        "Community Kitchen": "Community Kitchen",
        "TLS/School": "TLS/School",
        "Community Space": "Community Space",
        "Nutrition Center": "Nutrition Center",
        "Distribution Point": "Distribution Point",
        "Social Activity": "Social Activity"
      },
      governorates: {
        "Khanyounis": "Khanyounis",
        "Deir Al-Balah": "Deir Al-Balah"
      },
      areas: {
        "Mawasi Khanyounis": "Mawasi Khanyounis",
        "Mawasi Al-Qarara": "Mawasi Al-Qarara",
        "Al-Bassa": "Al-Bassa"
      },
      focal: "Focal Person"
    },
    ar: {
      appTitle: 'تطبيق خريطة الخدمات',
      sites: 'المواقع',
      services: 'الخدمات',
      yourLocation: 'موقعك',
      loading: 'جاري تحميل الموقع...',
      geolocationError: 'تعذر الوصول إلى موقعك. سيتم التركيز على قطاع غزة.',
      geolocationInsecure: 'الوصول إلى الموقع يتطلب HTTPS. سيتم التركيز على قطاع غزة.',
      geolocationPermissionDenied: 'تم رفض إذن الموقع. سيتم التركيز على قطاع غزة.',
      geolocationUnavailable: 'الموقع غير متاح. سيتم التركيز على قطاع غزة.',
      geolocationTimeout: 'انتهت مهلة طلب الموقع. سيتم التركيز على قطاع غزة.',
      selected: 'المحدد',
      switchToArabic: 'العربية',
      switchToEnglish: 'English',
      legend: 'دليل الألوان',
      mapView: 'عرض الخريطة',
      satelliteView: 'عرض الأقمار الصناعية',
      // Add site name translations in Arabic
      siteNames: {
        "Ahali AL Junaina": "أهالي الجنينة",
        "Ajyal Al-Karama site": "أجيال الكرامة",
        "Al-Amoody": "العمودي",
        "AL Awda": "العودة",
        "AL Karama Site": "موقع الكرامة",
        "Al Nour Site": "موقع النور",
        "AL Rayyan": "الريان",
        "AL Tahrir Site": "موقع التحرير",
        "AL Zaytoon Site": "موقع الزيتون",
        "Al_joura": "الجورة",
        "Al_Najjar community": "تجمع النجار",
        "Alaa Abdeen": "علاء عابدين",
        "Al-Akli Site": "موقع العكلي",
        "Al-Amal and haya": "الأمل والحياة",
        "Al-Amal site": "موقع الأمل",
        "Al-Aqqad": "العقاد",
        "Al-Bader": "البدر",
        "Al-Bayari": "البياري",
        "Al-Bayyari": "البياري",
        "Al-Durra": "الدرة",
        "Al-Farooq Site (Abu Farooq Area)": "موقع الفاروق (منطقة أبو فاروق)",
        "Al-Farooq Site (Al-Hayat Area)": "موقع الفاروق (منطقة الحياة)",
        "Al-Farra Site": "موقع الفرا",
        "Al-Fedaa Site": "موقع الفداء",
        "Al-Hayat": "الحياة",
        "Al-Hurya Site": "موقع الحرية",
        "Al-Ihsan Site": "موقع الإحسان",
        "Al-Jawhari Site": "موقع الجوهري",
        "Al-Karam": "الكرم",
        "Al-Karam Site": "موقع الكرم",
        "Al-Karama": "الكرامة",
        "Al-Kareem": "الكريم",
        "Al-Malaab Site": "موقع الملعب",
        "Al-Mosalla Site": "موقع المصلى",
        "Al-Mostafa": "المصطفى",
        "ALMuktar faisal": "المختار فيصل",
        "Alnahda site": "موقع النهضة",
        "Al-Nakheel and Al-Zytoon Site": "موقع النخيل والزيتون",
        "Al-Nour": "النور",
        "Al-Quds": "القدس",
        "Al-Quds Site (Abdeen Area)": "موقع القدس (منطقة عابدين)",
        "Al-Quds Site (Al-Hayat Area)": "موقع القدس (منطقة الحياة)",
        "Al-Rimal Al-Thahabiea Site": "موقع الرمال الذهبية",
        "Al-Shaer": "الشاعر",
        "Al-Shaheed Jameel Site": "موقع الشهيد جميل",
        "Al-Shahri": "الشحري",
        "Al-Shorbaji": "الشربجي",
        "Al-Suniyah": "السنية",
        "Al-Wafa": "الوفاء",
        "Al-wehda": "الوحدة",
        "Al-Zahraa": "الزهراء",
        "Arada": "عرادة",
        "Ard -Aljawafa Site": "موقع أرض الجوافة",
        "Asia": "آسيا",
        "Asqalan": "عسقلان",
        "Ayash site": "موقع عياش",
        "Basant": "بيسنت",
        "Bilal Bin Rabah": "بلال بن رباح",
        "Garb Al-Shaleh Site": "موقع غرب الشاليه",
        "Ghawar Site": "موقع غوار",
        "Hanoon Site": "موقع حنون",
        "Hayat Site": "موقع حياة",
        "Misk and Laian": "مسك وليان",
        "Musadar Al-Bahar": "مصدر البحر",
        "Pioneer Site": "موقع بيونير",
        "Shady Site": "موقع شادي",
        "Shams": "شمس",
        "Smile": "ابتسامة",
        "Wajed Site": "موقع واجد",
        "Wijdan Site": "موقع وجدان",
        "Yafa Site": "موقع يافا",
        "Zorub": "زعرب"
      },
      services_provided: servicesProvidedTranslations.ar,
      legend_services: {
        "Water Trucking": "نقطة توزيع مياه",
        "Health Space/Clinic": "مساحة صحية / عيادة",
        "Community Kitchen": "مطبخ مجتمعي",
        "TLS/School": "مساحة تعليمية مؤقتة / مدرسة",
        "Community Space": "مساحة مجتمعية",
        "Nutrition Center": "مركز تغذية",
        "Distribution Point": "نقطة توزيع",
        "Social Activity": "نشاط اجتماعي"
      },
      governorates: {
        "Khanyounis": "خان يونس",
        "Deir Al-Balah": "دير البلح",
        "Gaza City": "مدينة غزة",
        "Al-Nuseirat": "النصيرات",
        "Rafah": "رفح",
        "Al-Zawaida": "الزوايدة",
      },
      areas: {
        "Mawasi Khanyounis": "مواصي خان يونس",
        "Mawasi Al-Qarara": "مواصي القرارة",
        "Al-Bassa": "البصة"
      },
      focal: "الشخص المسؤول"
    },
  };

  // Load user location
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGeoError('geolocationInsecure');
      setLoading(false);
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setGeoError(null);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === error.PERMISSION_DENIED) setGeoError('geolocationPermissionDenied');
          else if (error.code === error.POSITION_UNAVAILABLE) setGeoError('geolocationUnavailable');
          else if (error.code === error.TIMEOUT) setGeoError('geolocationTimeout');
          else setGeoError('geolocationError');
          setLoading(false);
        }
        , {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
    } else {
      // Geolocation not available, use default location
      console.log('Geolocation not supported');
      setGeoError('geolocationUnavailable');
      setLoading(false);
    }
  }, []);

  // Track mobile breakpoint for responsive UI
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1024px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  // Load coordinates from JSON
  useEffect(() => {
    const loadCoordinates = async () => {
      try {
        const response = await fetch('/coordinates.json');
        const data = await response.json();
        setServices(data);

        // Extract unique sites
        const uniqueSites = [...new Set(data.map(service => service.siteName))];
        setSites(uniqueSites);
        console.log(uniqueSites)
      } catch (error) {
        console.error('Error loading coordinates:', error);
      }
    };
    loadCoordinates();
  }, []);

  // Load Leaflet only in the browser
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet-routing-machine');
      leafletRef.current = L;

      // Fix default icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // Optional: fix routing waypoint icon
      if (L.Routing && L.Routing.Control) {
        const greenIcon = new L.Icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        L.Routing.Control.prototype.options.waypointIcon = function () {
          return greenIcon;
        };
      }

      setLeafletReady(true);
    })();
  }, []);

  // Initialize map (wait for Leaflet to load)
  useEffect(() => {
    const L = leafletRef.current;
    if (!leafletReady || !L || mapRef.current) return;

    const initialCenter = userLocation || DEFAULT_MAP_CENTER;
    const initialZoom = userLocation ? USER_LOCATION_ZOOM : DEFAULT_MAP_ZOOM;
    const mapInstance = L.map('map').setView(initialCenter, initialZoom);

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    });

    streetLayer.addTo(mapInstance);
    baseLayersRef.current = { street: streetLayer, satellite: satelliteLayer };
    setIsSatelliteView(false);
    // Group services by coordinates
    const locationMap = new Map();
    services.forEach(service => {
      const key = `${service.coordinates.latitude},${service.coordinates.longitude}`;
      if (!locationMap.has(key)) locationMap.set(key, []);
      locationMap.get(key).push(service);
    });

    markersRef.current = new Map();

    // Add markers for each location
    for (const [key, servicesAtLoc] of locationMap) {
      const lat = servicesAtLoc[0].coordinates.latitude;
      const lng = servicesAtLoc[0].coordinates.longitude;
      let icon;
      const allHealth = servicesAtLoc.every(s => getServiceType(s.name) === 'Health Space/Clinic');
      if (servicesAtLoc.length === 1) {
        icon = getMarkerIcon(L, servicesAtLoc[0].name);
      } else if (allHealth) {
        icon = createHealthIcon(L);
      } else {
        const colors = servicesAtLoc.map(s => getColorFromService(s.name));
        icon = getStripedMarkerIcon(L, colors);
      }
      const hasHealthClinic = servicesAtLoc.some(s => getServiceType(s.name) === 'Health Space/Clinic');
      const marker = L.marker([lat, lng], { icon }).addTo(mapInstance);
      markersRef.current.set(key, marker);

      if (hasHealthClinic) {
        const tagHealthClass = () => {
          const el = marker.getElement();
          if (el) el.classList.add('marker-health');
        };
        if (marker.getElement()) tagHealthClass();
        else marker.once('add', tagHealthClass);
      }

      marker.on('click', () => {
        setActiveMarkerKey(key);
        openMarkerPanel({
          servicesAtLoc,
          lat,
          lng,
        });

        servicesAtLoc.forEach(s => {
          gaEvent('marker_click', {
            service_id: s.id,
            service_name: s.name,
            site: s.siteName,
            type: getServiceType(s.name),
          });
        });
      });
    }

    mapRef.current = mapInstance;
    setMapReady(true);
    return () => {
      if (userMarkerRef.current) {
        mapInstance.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      hasCenteredOnUserRef.current = false;
      mapInstance.remove();
      markersRef.current.clear();
      baseLayersRef.current = { street: null, satellite: null };
      setIsSatelliteView(false);
      setMapReady(false);
    };
  }, [leafletReady, userLocation, services]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const mapInstance = mapRef.current;

    if (!userLocation) {
      if (userMarkerRef.current) {
        mapInstance.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      hasCenteredOnUserRef.current = false;
      return;
    }

    const L = leafletRef.current;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      userMarkerRef.current = L.marker(userLocation, { title: 'Your Location' })
        .addTo(mapInstance)
        .bindPopup('<b>Your Location</b>');
    }

    if (!hasCenteredOnUserRef.current) {
      mapInstance.flyTo(userLocation, Math.max(mapInstance.getZoom(), USER_LOCATION_ZOOM));
      hasCenteredOnUserRef.current = true;
    }
  }, [userLocation, mapReady]);

  useEffect(() => {
    if (!leafletReady || !mapReady || !mapRef.current || !leafletRef.current) return;
    let isMounted = true;
    const abortController = new AbortController();
    const loadBoundaries = async () => {
      const mapInstance = mapRef.current;
      if (!mapInstance) return;
      const loadedLayers = [];
      for (const boundary of campBoundaryFiles) {
        try {
          const response = await fetch(boundary.file, { signal: abortController.signal });
          if (!response.ok) {
            console.error(`Failed to load boundary file ${boundary.file}`, response.statusText);
            continue;
          }
          const kmlText = await response.text();
          const xml = new window.DOMParser().parseFromString(kmlText, 'text/xml');
          const geojson = toGeoJSON(xml);
          const layer = leafletRef.current.geoJSON(geojson, {
            style: {
              color: boundary.stroke,
              weight: 2,
              fillColor: boundary.fill,
              fillOpacity: 0.2,
            },
            onEachFeature: (feature, featureLayer) => {
              const featureName = feature?.properties?.name || boundary.label;
              featureLayer.bindTooltip(featureName, { sticky: true });
            },
          }).addTo(mapInstance);
          loadedLayers.push(layer);
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.error(`Error while loading ${boundary.file}`, error);
        }
      }
      if (isMounted) boundaryLayersRef.current = loadedLayers;
    };
    loadBoundaries();
    return () => {
      isMounted = false;
      abortController.abort();
      boundaryLayersRef.current.forEach((layer) => {
        if (mapRef.current) mapRef.current.removeLayer(layer);
      });
      boundaryLayersRef.current = [];
    };
  }, [leafletReady, mapReady]);

  // Update marker popups when language changes
  useEffect(() => {
    if (!mapRef.current || !services.length) return;

    const locationMap = new Map();
    services.forEach(service => {
      const key = `${service.coordinates.latitude},${service.coordinates.longitude}`;
      if (!locationMap.has(key)) locationMap.set(key, []);
      locationMap.get(key).push(service);
    });

    // Update all markers' popups with new language
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker && layer.getPopup()) {
        const latlng = layer.getLatLng();
        const key = Object.keys([...locationMap.entries()].reduce((acc, [k, v]) => {
          if (v[0]?.coordinates.latitude === latlng.lat && v[0]?.coordinates.longitude === latlng.lng) {
            acc[k] = v;
          }
          return acc;
        }, {}))[0];

        if (key) {
          const servicesAtLoc = locationMap.get(key);
          const popupContent = servicesAtLoc.map(s => {
            const translatedName = t[lang].services_provided[s.name] || s.name;
            const translatedSiteName = t[lang].siteNames[s.siteName] || s.siteName;
            const translatedGov = t[lang].governorates[s.governorate] || s.governorate;
            const translatedArea = t[lang].areas[s.area] || s.area;
            const focalLine = s.focal ? `<br/><b>${t[lang].focal}:</b> ${s.focal}` : '';
            const focalPhoneLine = s['focal phone number'] ? `<br/><b>Focal Phone:</b> ${s['focal phone number']}` : '';
            return `<b>${translatedName}</b><br/><small>${translatedSiteName}</small><br/><small>${translatedGov} - ${translatedArea}</small><br/><small>${getServiceType(s.name)}</small>${focalLine}${focalPhoneLine}`;
          }).join('<hr/>');
          layer.setPopupContent(popupContent);
        }
      }
    });
  }, [lang, t, services]);

  // Import L for the new effect
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      window.L = L;
    })();
  }, []);

  const toggleBaseLayer = useCallback(() => {
    const mapInstance = mapRef.current;
    const { street, satellite } = baseLayersRef.current;
    if (!mapInstance || !street || !satellite) return;

    setIsSatelliteView((prev) => {
      if (prev) {
        if (mapInstance.hasLayer(satellite)) mapInstance.removeLayer(satellite);
        if (!mapInstance.hasLayer(street)) street.addTo(mapInstance);
      } else {
        if (mapInstance.hasLayer(street)) mapInstance.removeLayer(street);
        if (!mapInstance.hasLayer(satellite)) satellite.addTo(mapInstance);
      }
      return !prev;
    });
  }, []);
  const handleServiceClick = (service) => {
    const L = leafletRef.current;
    if (!L || !mapRef.current) return;

    const destinationKey = `${service.coordinates.latitude},${service.coordinates.longitude}`;
    setActiveMarkerKey(destinationKey);

    setSelectedService(service);
    gaEvent('service_selected', {
      service_id: service.id,
      service_name: service.name,
      site: service.siteName,
      type: getServiceType(service.name),
    });

    const destinationLatLng = L.latLng(service.coordinates.latitude, service.coordinates.longitude);
    mapRef.current.flyTo(destinationLatLng, Math.max(mapRef.current.getZoom(), SERVICE_FOCUS_ZOOM));

    if (routingControl) {
      mapRef.current.removeControl(routingControl);
      setRoutingControl(null);
    }

    if (userLocation) {
      const newRoutingControl = L.Routing.control({
        waypoints: [
          L.latLng(userLocation[0], userLocation[1]),
          destinationLatLng,
        ],
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
        routeWhileDragging: false,
        lineOptions: { styles: [{ color: '#3b82f6', opacity: 0.8, weight: 5 }] },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        show: false,
        createMarker: () => null,
      }).addTo(mapRef.current);

      setRoutingControl(newRoutingControl);
    }

    // Auto-close mobile panel after 500ms on service selection
    if (isMobile) {
      setTimeout(() => setShowMobilePanel(false), 100);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg text-gray-600 dark:text-gray-400">{t[lang].loading}</p>
      </div>
    );
  }

  // Get services for selected site
  const baseFilteredServices = services.filter(service => (
    (!selectedGovernorate || service.governorate === selectedGovernorate) &&
    (!selectedArea || service.area === selectedArea)
  ));

  const currentServices = (selectedSite
    ? baseFilteredServices.filter(service => service.siteName === selectedSite)
    : baseFilteredServices)
    .map(service => ({
      ...service,
      translatedName: t[lang].services_provided[service.name] || service.name
    }));

  const hasActiveFilters = Boolean(selectedGovernorate || selectedArea || selectedSite);

  // Governorate/Area/Site filters
  const governorates = [...new Set(services.map(s => s.governorate).filter(Boolean))];
  const areas = selectedGovernorate
    ? [...new Set(services.filter(s => s.governorate === selectedGovernorate).map(s => s.area).filter(Boolean))]
    : [];

  const filteredServicesForSiteList = services.filter(s =>
    (!selectedGovernorate || s.governorate === selectedGovernorate) &&
    (!selectedArea || s.area === selectedArea)
  );

  const filteredSites = [...new Set(filteredServicesForSiteList.map(s => s.siteName).filter(Boolean))];

  const renderMarkerInfoContent = () => {
    if (!selectedMarkerInfo) return null;
    return (
      <>
        <button
          className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} z-[1301] bg-gray-200 dark:bg-zinc-700 rounded-full w-10 h-10 flex items-center justify-center`}
          onClick={closeMarkerPanel}
        >
          <span aria-label="Close">✕</span>
        </button>
        <div className="p-6 pt-12 space-y-4">
          <h2 className="text-xl font-bold mb-2">{selectedMarkerInfo.servicesAtLoc[0]?.siteName}</h2>
          <p className="text-xs mb-2">{selectedMarkerInfo.lat}, {selectedMarkerInfo.lng}</p>
          {selectedMarkerInfo.servicesAtLoc.map((s, idx) => (
            <div key={idx} className="mb-4 border-b border-gray-200 dark:border-zinc-800 pb-4 last:border-b-0 last:pb-0">
              <div className="font-semibold text-lg mb-1">{t[lang].services_provided[s.name] || s.name}</div>
              <div className="text-sm mb-1">{t[lang].governorates[s.governorate] || s.governorate} - {t[lang].areas[s.area] || s.area}</div>
              <div className="text-xs mb-1">{getServiceType(s.name)}</div>
              {s.focal && <div className="text-xs mb-1"><b>{t[lang].focal}:</b> {s.focal}</div>}
              {s['focal phone number'] && (
                <div className="text-xs"><b>{lang === 'ar' ? 'رقم جوال شخص التواصل' : 'Focal Phone'}:</b> {s['focal phone number']}</div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div
      className={`flex flex-col h-screen bg-zinc-50 dark:bg-black${lang === 'ar' ? ' rtl' : ''} ${lang === 'ar' ? notoArabic.className : ''}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: lang === 'ar' ? undefined : 'Branding, sans-serif' }}
    >
      <header className="shadow-md border-b border-gray-200 dark:border-zinc-800 px-1 sm:px-6 py-1 sm:py-2" style={{ backgroundColor: '#1b1464' }}>
        <div className="flex items-center justify-center gap-1 sm:gap-3 w-full">
          <img src="/acted-logo.png" alt="ACTED Logo" className="h-10 sm:h-16 w-auto" />
          <h1 className="text-base sm:text-2xl font-bold text-center w-full whitespace-nowrap" style={{ color: '#fff' }}>{t[lang].appTitle}</h1>
          <div style={{ minWidth: isMobile ? 90 : 120 }} className="sm:min-w-[160px]">
            <Select
              value={{ value: lang, label: lang === 'en' ? t.en.switchToEnglish : t.ar.switchToArabic }}
              onChange={option => {
                setLang(option.value);
                gaEvent('language_change', { language: option.value });
              }}
              options={[
                { value: 'en', label: t.en.switchToEnglish },
                { value: 'ar', label: <span className={notoArabic.className}>{t.ar.switchToArabic}</span> },
              ]}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#fff',
                  color: '#1b1464',
                  border: 'none',
                  minHeight: isMobile ? 28 : 36,
                  boxShadow: state.isFocused ? '0 0 0 1px #1b1464' : base.boxShadow,
                  fontSize: isMobile ? '0.7rem' : '0.85rem',
                  paddingLeft: isMobile ? 2 : 4,
                  paddingRight: isMobile ? 2 : 4,
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#1b1464',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.7rem' : '0.85rem'
                }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? '#1b1464'
                    : state.isFocused
                      ? '#e0e7ff'
                      : '#fff',
                  color: state.isSelected
                    ? '#fff'
                    : '#1b1464',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.7rem' : '0.85rem',
                }),
                indicatorsContainer: (base) => ({ ...base, color: '#1b1464' }),
                dropdownIndicator: (base) => ({ ...base, color: '#1b1464', padding: isMobile ? '2px' : '4px' }),
              }}
              isSearchable={false}
              aria-label="Language Switch"
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        {/* Map Section */}
        <div
          className="flex-1 rounded-lg shadow-lg overflow-hidden lg:min-h-0 min-h-64 relative"
          style={{
            minHeight: '0',
            height: '100%',
            ...(isMobile ? { height: 'calc(100dvh - 64px)' } : {}) // 64px header height
          }}
        >
          <div id="map" className="h-full w-full"></div>
          <button
            onClick={toggleBaseLayer}
            className="absolute top-4 right-4 z-[1100] bg-white/90 dark:bg-zinc-900/90 text-gray-900 dark:text-white px-3 py-2 rounded-full shadow-md border border-gray-200 dark:border-zinc-800 text-xs font-semibold"
            aria-pressed={isSatelliteView}
          >
            {isSatelliteView ? t[lang].satelliteView : t[lang].mapView}
          </button>
          {/* Legend */}
          {/* Floating Button for Mobile */}
          {isMobile && (
            <button
              onClick={() => setShowMobilePanel(v => !v)}
              className="fixed bottom-6 left-6 z-[1100] bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Show Details"
            >
              <img src="/filtersvg.svg" alt="Filter" className="w-7 h-7 filter brightness-0 invert" />
            </button>
          )}
          <div className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 bg-white dark:bg-zinc-900 p-2 lg:p-3 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 z-[1000] max-w-xs lg:max-w-none">
            <p className="font-bold text-xs lg:text-sm mb-1 lg:mb-2 text-gray-900 dark:text-white">{t[lang].legend}</p>
            <div className="space-y-0.5 lg:space-y-1 text-xs grid grid-cols-2 lg:grid-cols-1 gap-1 lg:gap-0">
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#1e90ff' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Water Trucking"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#ff4444' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Health Space/Clinic"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#ff8800' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Community Kitchen"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#9933ff' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["TLS/School"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#4BB272' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Community Space"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Nutrition Center"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#545454' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Distribution Point"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#93c01f' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Social Activity"]}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Details/Panel Section */}
        <div className="relative w-full lg:w-80 flex-shrink-0 min-h-0 flex flex-col lg:h-full">
          {/* Overlay for mobile panel */}
          {isMobile && showMobilePanel && (
            <div
              className="fixed inset-0 z-[1199] bg-transparent"
              onClick={() => setShowMobilePanel(false)}
              aria-label="Close details panel"
            />
          )}
          <div
            className={`w-full bg-white rounded-lg shadow-lg p-4 sm:p-6 dark:bg-zinc-900 overflow-y-auto max-h-96 lg:max-h-none lg:h-full lg:min-h-0 transition-transform duration-300 ${isMobile ? 'fixed left-0 right-0 bottom-0 z-[1200]' : ''}`}
            style={isMobile ? {
              transform: showMobilePanel ? 'translateY(0)' : 'translateY(100%)',
              maxHeight: '70dvh',
              borderRadius: '1rem 1rem 0 0',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
              background: 'var(--background, #fff)',
            } : { height: '100%' }}
            onClick={e => {
              if (isMobile) e.stopPropagation();
            }}
          >
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t[lang].sites}</h2>
          {userLocation && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{t[lang].yourLocation}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
              </p>
            </div>
          )}
          {geoError && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t[lang][geoError] || t[lang].geolocationError}
              </p>
            </div>
          )}
          {/* Governorate Dropdown */}
          <div className="mb-4">
            <Select
              value={selectedGovernorate ? { value: selectedGovernorate, label: t[lang].governorates[selectedGovernorate] || selectedGovernorate } : null}
              onChange={option => {
                const govVal = option ? option.value : null;
                setSelectedGovernorate(govVal);
                setSelectedArea(null);
                setSelectedSite(null);
                setSelectedService(null);
              }}
              options={governorates.map(gov => ({ value: gov, label: t[lang].governorates[gov] || gov }))}
              placeholder={lang === 'ar' ? 'اختر المحافظة' : 'Select Governorate'}
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#f3f4f6',
                  color: '#1b1464',
                  border: 'none',
                  minHeight: 44,
                  boxShadow: state.isFocused ? '0 0 0 1px #1b1464' : base.boxShadow,
                }),
                singleValue: (base) => ({ ...base, color: '#1b1464', fontWeight: 'bold' }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? '#1b1464'
                    : state.isFocused
                      ? '#e0e7ff'
                      : '#fff',
                  color: state.isSelected
                    ? '#fff'
                    : '#1b1464',
                  cursor: 'pointer',
                }),
                indicatorsContainer: (base) => ({ ...base, color: '#1b1464' }),
                dropdownIndicator: (base) => ({ ...base, color: '#1b1464' }),
              }}
              aria-label="Governorate Dropdown"
            />
          </div>

          {/* Area Dropdown */}
          <div className="mb-4">
            <Select
              value={selectedArea ? { value: selectedArea, label: t[lang].areas[selectedArea] || selectedArea } : null}
              onChange={option => {
                const areaVal = option ? option.value : null;
                setSelectedArea(areaVal);
                setSelectedSite(null);
                setSelectedService(null);
              }}
              options={areas.map(area => ({ value: area, label: t[lang].areas[area] || area }))}
              placeholder={lang === 'ar' ? 'اختر المنطقة' : 'Select Area'}
              isClearable
              isDisabled={!selectedGovernorate}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#f3f4f6',
                  color: '#1b1464',
                  border: 'none',
                  minHeight: 44,
                  boxShadow: state.isFocused ? '0 0 0 1px #1b1464' : base.boxShadow,
                }),
                singleValue: (base) => ({ ...base, color: '#1b1464', fontWeight: 'bold' }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? '#1b1464'
                    : state.isFocused
                      ? '#e0e7ff'
                      : '#fff',
                  color: state.isSelected
                    ? '#fff'
                    : '#1b1464',
                  cursor: 'pointer',
                }),
                indicatorsContainer: (base) => ({ ...base, color: '#1b1464' }),
                dropdownIndicator: (base) => ({ ...base, color: '#1b1464' }),
              }}
              aria-label="Area Dropdown"
            />
          </div>

          {/* Sites Dropdown */}
          <div className="mb-6">
            <Select
              value={selectedSite ? { value: selectedSite, label: t[lang].siteNames[selectedSite] || selectedSite } : null}
              onChange={option => {
                const siteVal = option ? option.value : null;
                setSelectedSite(siteVal);
                setSelectedService(null);
                if (siteVal) gaEvent('site_selected', { site: siteVal });
              }}
              options={filteredSites.map(site => ({
                value: site,
                label: `${t[lang].siteNames[site] || site} (${filteredServicesForSiteList.filter(s => s.siteName === site).length} ${t[lang].services})`
              }))}
              placeholder={t[lang].sites}
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#f3f4f6',
                  color: '#1b1464',
                  border: 'none',
                  minHeight: 44,
                  boxShadow: state.isFocused ? '0 0 0 1px #1b1464' : base.boxShadow,
                }),
                singleValue: (base) => ({ ...base, color: '#1b1464', fontWeight: 'bold' }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? '#1b1464'
                    : state.isFocused
                      ? '#e0e7ff'
                      : '#fff',
                  color: state.isSelected
                    ? '#fff'
                    : '#1b1464',
                  cursor: 'pointer',
                }),
                indicatorsContainer: (base) => ({ ...base, color: '#1b1464' }),
                dropdownIndicator: (base) => ({ ...base, color: '#1b1464' }),
              }}
              aria-label="Sites Dropdown"
            />
          </div>

          {/* Services List */}
          {hasActiveFilters && (
            <>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{t[lang].services}</h3>
              {currentServices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'ar' ? 'لا توجد خدمات مطابقة للتصفية الحالية.' : 'No services match the current filters.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {currentServices.map((service) => {
                  const serviceType = getServiceType(service.name);
                  let badgeColor = 'bg-gray-200 dark:bg-zinc-700';
                  if (serviceType === 'Water Trucking') badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                  if (serviceType === 'Health Space/Clinic') badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                  if (serviceType === 'Community Kitchen') badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                  if (serviceType === 'TLS/School') badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
                  if (serviceType === 'Community Space') badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                  if (serviceType === 'Nutrition Center') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
                  if (serviceType === 'Social Activity') badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';

                    return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceClick(service)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${selectedService?.id === service.id
                          ? 'bg-green-500 text-white dark:bg-green-600'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700'
                        }`}
                    >
                      <p className="font-semibold text-sm">{service.translatedName}</p>
                      <p className={`text-xs ${selectedService?.id === service.id ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
                        {t[lang].siteNames[service.siteName] || service.siteName}
                      </p>
                      <p className="text-xs opacity-75 mb-1">
                        {service.coordinates.latitude}, {service.coordinates.longitude}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selectedService?.id === service.id ? 'bg-white/20' : badgeColor}`}>
                        {serviceType}
                      </span>
                    </button>
                  );
                  })}
                </div>
              )}
            </>
          )}
          {/* Selected Service Info */}
          {selectedService && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-semibold text-green-900 dark:text-green-200">{t[lang].selected}</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">{selectedService.name}</p>
            </div>
          )}
          </div>

          {/* Desktop marker info panel overlay */}
          {!isMobile && selectedMarkerInfo && (
            <>
              <div
                className="absolute inset-0 z-[1299] bg-transparent"
                style={{ pointerEvents: showMarkerPanel ? 'auto' : 'none' }}
                onClick={closeMarkerPanel}
                aria-label="Close marker info panel"
              />
              <div
                className="absolute inset-0 z-[1300] bg-white dark:bg-zinc-900 shadow-lg border border-gray-200 dark:border-zinc-800 transition-transform duration-300 overflow-y-auto rounded-lg"
                style={{
                  transform: showMarkerPanel ? 'translateX(0)' : (lang === 'ar' ? 'translateX(-100%)' : 'translateX(100%)'),
                  boxShadow: '0 0 24px rgba(0,0,0,0.15)',
                  pointerEvents: showMarkerPanel ? 'auto' : 'none',
                }}
              >
                {renderMarkerInfoContent()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile marker info panel */}
      {isMobile && selectedMarkerInfo && (
        <>
          <div
            className="fixed left-0 right-0 bottom-0 z-[1299] bg-transparent"
            style={{
              height: '70dvh',
              pointerEvents: showMarkerPanel ? 'auto' : 'none',
            }}
            onClick={closeMarkerPanel}
            aria-label="Close marker info panel"
          />
          <div
            className="fixed left-0 right-0 bottom-0 z-[1300] bg-white dark:bg-zinc-900 shadow-lg border border-gray-200 dark:border-zinc-800 transition-transform duration-300 overflow-y-auto"
            style={{
              transform: showMarkerPanel ? 'translateY(0)' : 'translateY(100%)',
              maxHeight: '70dvh',
              borderRadius: '1rem 1rem 0 0',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            }}
          >
            {renderMarkerInfoContent()}
          </div>
        </>
      )}
    </div>
  );
}