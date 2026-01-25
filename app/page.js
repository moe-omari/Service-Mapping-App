'use client';

import { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Noto_Sans_Arabic } from 'next/font/google';

const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['400','500','600','700'] });

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
const getMarkerIcon = (L, serviceName) => {
  let color = '#808080'; // default gray
  if (serviceName.startsWith('Water Trucking')) color = '#1e90ff';
  else if (serviceName.startsWith('Health Space/Clinic')) color = '#ff4444';
  else if (serviceName.startsWith('Community Kitchen')) color = '#ff8800';
  else if (serviceName.startsWith('TLS/School')) color = '#9933ff';
  else if (serviceName.startsWith('Community Space')) color = '#22c55e';
  else if (serviceName.startsWith('Nutrition Center')) color = '#fbbf24';

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="25" height="41">
      <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 0C7.029 0 3 4.029 3 9c0 7.5 9 18 9 18s9-10.5 9-18c0-4.971-4.029-9-9-9z"/>
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
  return 'Other';
};

// Google Analytics event tracking
const gaEvent = (action, params = {}) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', action, params);
};

export default function Home() {
  const [userLocation, setUserLocation] = useState(null);
  const [services, setServices] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('en');
  const mapRef = useRef(null);
  const leafletRef = useRef(null);

  const t = {
    en: {
      appTitle: 'Service Mapping App',
      sites: 'Sites',
      services: 'Services',
      yourLocation: 'Your Location',
      loading: 'Loading location...',
      selected: 'Selected',
      switchToArabic: 'العربية',
      switchToEnglish: 'English',
      legend: 'Legend',
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
      services_provided: {
        "Community Space": "Community Space",
        "Water Trucking Distribution Point": "Water Trucking Distribution Point",
        "Health Space/Clinic - UNRWA": "Health Space/Clinic - UNRWA",
        "Health Space/Clinic - PRCS": "Health Space/Clinic - Palestine Red Crescent Society (PRCS)",
        "Health Space/Clinic - Abdelshafi Org": "Health Space/Clinic - Abdelshafi Organization",
        "Health Space/Clinic - Project Hoppe": "Health Space/Clinic - Project Hoppe",
        "Health Space/Clinic - Rahma Around the world": "Health Space/Clinic - Rahma Around the World",
        "Community Kitchen (Tekeya) - WCK": "Community Kitchen (Tekeya) - World Central Kitchen (WCK)",
        "Community Kitchen (Tekeya) - Wafaa Al-Mohsineen": "Community Kitchen (Tekeya) - Wafaa Al-Mohsineen",
        "Community Kitchen (Tekeya) - Al-Fares Al-Shahem": "Community Kitchen (Tekeya) - Al-Fares Al-Shahem",
        "Community Kitchen (Tekeya) - Rahma Around the world": "Community Kitchen (Tekeya) - Rahma Around the World",
        "TLS/School - UNICEF": "Temporary Learning Space / School - UNICEF",
        "TLS/School": "Temporary Learning Space / School",
        "TLS/School - Al-Sahabah Organization": "Temporary Learning Space / School - Al-Sahabah Organization",
        "Nutrition Center - WFP/UNICEF": "Nutrition Center - WFP / UNICEF",
        "Nutrition Center - Save the Children": "Nutrition Center - Save the Children"
      },
      legend_services: {
        "Water Trucking": "Water Trucking",
        "Health Space/Clinic": "Health Space/Clinic",
        "Community Kitchen": "Community Kitchen",
        "TLS/School": "TLS/School",
        "Community Space": "Community Space",
        "Nutrition Center": "Nutrition Center"
      }
    },
    ar: {
      appTitle: 'تطبيق خريطة الخدمات',
      sites: 'المواقع',
      services: 'الخدمات',
      yourLocation: 'موقعك',
      loading: 'جاري تحميل الموقع...',
      selected: 'المحدد',
      switchToArabic: 'العربية',
      switchToEnglish: 'English',
      legend: 'دليل الألوان',
      // Add site name translations in Arabic
      siteNames: {
        'Al-Farra Site': 'موقع الفرا',
        'Al-Shorbaji': 'موقع الشوربجي',
        'Al-Hayat': 'موقع الحياة',
        'Al-Shahri': 'موقع الشحري',
        'Al-Quds Site (Abdeen Area)': 'موقع القدس (منطقة عابدين)',
        'Al-Nakheel & Al-Zytoon Site': 'موقع النخيل والزيتون',
        'Al-Fedaa Site': 'موقع الفداء',
        'Wijdan Site': 'موقع وجدان',
        'Yafa Site': 'موقع يافا',
        'Al-Karam': 'موقع الكرم',
        'Al-Farooq Site (Abu Farooq Area)': 'موقع الفاروق (منطقة ابو فاروق)',
        'Shady Site': 'موقع شادي',
        'Al-Mosalla Site': 'موقع المصلى',
        'Al-Quds Site (Al-Hayat Area)': 'موقع القدس (منطقة الحياة)',
        'Al-Shahri Site': 'موقع الشحري',
        'Al-Jawhari Site': 'موقع الجوهري',
        'Al-Rimal Al-Thahabiea Site': 'موقع الرمال الذهبية',
        'Al-Shaheed Jameel Site': 'موقع الشهيد جميل',
        'Al-Malaab Site': 'موقع الملعب',
        'Al Nour Site': 'موقع النور',
        'Hanoon Site': 'موقع حنون',
        'Al-Farooq Site (Al-Hayat Area)': 'موقع الفاروق (منطقة الحياة)',
        'Garb Al-Shaleh Site': 'موقع غرب الشاليه'
      },
      services_provided: {
        "Community Space": "مساحة مجتمعية",
        "Water Trucking Distribution Point": "نقطة توزيع مياه بالصهاريج",
        "Health Space/Clinic - UNRWA": "مساحة صحية / عيادة - الأونروا",
        "Health Space/Clinic - PRCS": "مساحة صحية / عيادة - الهلال الأحمر الفلسطيني",
        "Health Space/Clinic - Abdelshafi Org": "مساحة صحية / عيادة - مؤسسة عبد الشافي",
        "Health Space/Clinic - Project Hoppe": "مساحة صحية / عيادة - مشروع هوبه",
        "Health Space/Clinic - Rahma Around the world": "مساحة صحية / عيادة - رحمة حول العالم",
        "Community Kitchen (Tekeya) - WCK": "مطبخ مجتمعي (تكية) - المطبخ المركزي العالمي",
        "Community Kitchen (Tekeya) - Wafaa Al-Mohsineen": "مطبخ مجتمعي (تكية) - وفاء المحسنين",
        "Community Kitchen (Tekeya) - Al-Fares Al-Shahem": "مطبخ مجتمعي (تكية) - الفارس الشهم",
        "Community Kitchen (Tekeya) - Rahma Around the world": "مطبخ مجتمعي (تكية) - رحمة حول العالم",
        "TLS/School - UNICEF": "مساحة تعليمية مؤقتة / مدرسة - اليونيسف",
        "TLS/School": "مساحة تعليمية مؤقتة / مدرسة",
        "TLS/School - Al-Sahabah Organization": "مساحة تعليمية مؤقتة / مدرسة - مؤسسة الصحابة",
        "Nutrition Center - WFP/UNICEF": "مركز تغذية - برنامج الأغذية العالمي / اليونيسف",
        "Nutrition Center - Save the Children": "مركز تغذية - منظمة إنقاذ الطفل"
      },
      legend_services: {
        "Water Trucking": "نقطة توزيع مياه",
        "Health Space/Clinic": "مساحة صحية / عيادة",
        "Community Kitchen": "مطبخ مجتمعي",
        "TLS/School": "مساحة تعليمية مؤقتة / مدرسة",
        "Community Space": "مساحة مجتمعية",
        "Nutrition Center": "مركز تغذية"
      }
    },
  };

  // Load user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setUserLocation([31.9454, 35.2338]);
          setLoading(false);
        }
      );
    }
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
    })();
  }, []);

  // Initialize map (wait for Leaflet to load)
  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !userLocation || mapRef.current) return;

    const mapInstance = L.map('map').setView(userLocation, 13);
    L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '',
    }).addTo(mapInstance);

    // User location marker
    L.marker(userLocation, { title: 'Your Location' })
      .addTo(mapInstance)
      .bindPopup('<b>Your Location</b>');

    // Service markers + GA event on click
    services.forEach((service) => {
      const markerIcon = getMarkerIcon(L, service.name);
      const marker = L.marker(
        [service.coordinates.latitude, service.coordinates.longitude],
        { icon: markerIcon }
      )
        .addTo(mapInstance)
        .bindPopup(
          `<b>${service.name}</b><br/>${service.siteName}<br/><small>${getServiceType(service.name)}</small>`
        );

      marker.on('click', () => {
        gaEvent('marker_click', {
          service_id: service.id,
          service_name: service.name,
          site: service.siteName,
          type: getServiceType(service.name),
        });
      });
    });

    mapRef.current = mapInstance;
    return () => mapInstance.remove();
  }, [userLocation, services]);

  // Route handling: use leafletRef.current instead of global L
  const handleServiceClick = (service) => {
    const L = leafletRef.current;
    if (!L || !mapRef.current || !userLocation) return;

    setSelectedService(service);
    gaEvent('service_selected', {
      service_id: service.id,
      service_name: service.name,
      site: service.siteName,
      type: getServiceType(service.name),
    });

    if (routingControl) {
      mapRef.current.removeControl(routingControl);
    }

    const newRoutingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLocation[0], userLocation[1]),
        L.latLng(service.coordinates.latitude, service.coordinates.longitude),
      ],
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
      routeWhileDragging: false,
      lineOptions: { styles: [{ color: '#3b82f6', opacity: 0.8, weight: 5 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      show: false,
    }).addTo(mapRef.current);

    setRoutingControl(newRoutingControl);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg text-gray-600 dark:text-gray-400">{t[lang].loading}</p>
      </div>
    );
  }

  // Get services for selected site
  const currentServices = selectedSite
    ? services.filter(service => service.siteName === selectedSite)
        .map(service => ({
          ...service,
          translatedName: t[lang].services_provided[service.name] || service.name
        }))
    : [];

  return (
    <div
      className={`flex flex-col h-screen bg-zinc-50 dark:bg-black${lang === 'ar' ? ' rtl' : ''} ${lang === 'ar' ? notoArabic.className : ''}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: lang === 'ar' ? undefined : 'branding, sans-serif' }}
    >
      <header className="shadow-md border-b border-gray-200 dark:border-zinc-800 px-4 sm:px-6 py-2" style={{ backgroundColor: '#1b1464' }}>
        <div className="flex items-center justify-center gap-3 w-full">
          <img src="/acted-logo.png" alt="ACTED Logo" className="h-12 sm:h-16 w-auto" />
          <h1 className="text-xl sm:text-2xl font-bold text-center w-full" style={{ color: '#fff' }}>{t[lang].appTitle}</h1>
          <div style={{ minWidth: 120 }}>
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
                  minHeight: 36,
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
              isSearchable={false}
              aria-label="Language Switch"
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-1 rounded-lg shadow-lg overflow-hidden lg:min-h-0 min-h-64 relative">
          <div id="map" className="h-full w-full"></div>
          {/* Legend */}
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
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Community Space"]}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{t[lang].legend_services["Nutrition Center"]}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-80 bg-white rounded-lg shadow-lg p-4 sm:p-6 dark:bg-zinc-900 overflow-y-auto max-h-96 lg:max-h-none">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t[lang].sites}</h2>
          {userLocation && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{t[lang].yourLocation}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
              </p>
            </div>
          )}
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
              options={sites.map(site => ({ value: site, label: `${t[lang].siteNames[site] || site} (${services.filter(s => s.siteName === site).length} ${t[lang].services})` }))}
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
          {selectedSite && (
            <>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{t[lang].services}</h3>
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
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceClick(service)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedService?.id === service.id
                          ? 'bg-green-500 text-white dark:bg-green-600'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700'
                      }`}
                    >
                      <p className="font-semibold text-sm">{service.translatedName}</p>
                      <p className="text-xs opacity-75 mb-1">
                        {service.coordinates.latitude.toFixed(4)}, {service.coordinates.longitude.toFixed(4)}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selectedService?.id === service.id ? 'bg-white/20' : badgeColor}`}>
                        {serviceType}
                      </span>
                    </button>
                  );
                })}
              </div>
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
      </div>
    </div>
  );
}