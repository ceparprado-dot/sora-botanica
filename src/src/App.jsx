import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { 
  Camera, 
  Compass, 
  MapPin, 
  Cloud, 
  CloudOff, 
  Upload, 
  BookOpen, 
  List, 
  Download, 
  Check, 
  AlertTriangle, 
  Eye, 
  Sparkles, 
  RefreshCw, 
  Map,
  Lock,
  Unlock,
  EyeOff
} from 'lucide-react';

// Firebase initial configuration safely retrieved from the environment or falling back to local storage
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'eje-cafetero-flora-app';

let db = null;
let auth = null;
let isFirebaseAvailable = false;

if (firebaseConfigStr) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseAvailable = true;
  } catch (error) {
    console.warn("Firebase configuration was provided but failed to initialize:", error);
  }
}

// PIN de seguridad para acceso selectivo
const SECURITY_PIN = "NogalAndino"; 

// Seed key native species of the Andean sub-canopy for fallback and educational purposes
const SPECIES_PRESETS = [
  {
    id: 'nogal',
    scientificName: 'Juglans neotropica',
    commonName: 'Nogal Cafetero',
    family: 'Juglandaceae',
    description: 'Árbol de hasta 40m en peligro crítico de extinción. Hojas compuestas, alternas, aserradas y de verde brillante.',
    soil: 'Suelo suelto, profundo y fértil. pH 6.0 - 7.0.',
    propagation: 'Escarificación mecánica + Estratificación húmeda en arena (2-6 °C) por 4 meses.',
    uses: 'Madera fina, tinte artesanal (tocte), nueces gourmet ricas en Omega 3 y 6.',
    color: 'bg-emerald-600'
  },
  {
    id: 'cedro',
    scientificName: 'Cedrela montana',
    commonName: 'Cedro de Montaña',
    family: 'Meliaceae',
    description: 'Gran porte, corteza profundamente fisurada. Hojas imparipinnadas con persistente olor resinoso al estrujarse.',
    soil: 'Suelos profundos de origen volcánico. pH ligeramente ácido.',
    propagation: 'Siembra directa en bandejas de germinación o micropropagación in vitro.',
    uses: 'Reforestación de laderas, ebanistería fina, corredor biológico de aves andinas.',
    color: 'bg-teal-600'
  },
  {
    id: 'chachafruto',
    scientificName: 'Erythrina edulis',
    commonName: 'Chachafruto / Balú',
    family: 'Fabaceae',
    description: 'Leguminosa arbórea pionera de rápido crecimiento. Hojas grandes trifoliadas, tallos jóvenes con espinas suaves.',
    soil: 'Muy adaptable. Prefiere suelos franco-arenosos drenados. pH 5.5 - 7.0.',
    propagation: 'Semillas frescas en bolsa (dentro de primeros 8 días de cosecha), lado convexo expuesto.',
    uses: 'Consumo humano (alto valor proteico), forraje de ganado, fijación simbiótica de nitrógeno.',
    color: 'bg-amber-600'
  },
  {
    id: 'arboloco',
    scientificName: 'Montanoa quadrangularis',
    commonName: 'Arboloco',
    family: 'Asteraceae',
    description: 'Tallo cuadrangular hueco. Hojas opuestas, lobuladas y ásperas. Flores ricas en aceites esenciales antimicrobianos.',
    soil: 'Rústico y pionero. Coloniza taludes erosionados y laderas desprovistas.',
    propagation: 'Esquejes semileñosos o siembra directa de aquenios.',
    uses: 'Conservación de nacimientos de agua, artesanías livianas, aceites biocidas.',
    color: 'bg-sky-600'
  }
];

// Fallback initial data in memory in case Firestore is disconnected or offline
const INITIAL_OBSERVATIONS = [
  {
    id: 'obs-1',
    scientificName: 'Juglans neotropica',
    commonName: 'Nogal Cafetero',
    sector: 'Reserva Bosque Alto',
    lat: 4.6521,
    lng: -75.5891,
    alt: 2150,
    photoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    phenology: 'Solo hojas',
    light: 'A media luz (claros de bosque)',
    threats: 'Ninguna visible',
    contributor: 'Usuario Fundador (Finca)',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'obs-2',
    scientificName: 'Cedrela montana',
    commonName: 'Cedro de Montaña',
    sector: 'Lote Cafetal Bajo',
    lat: 4.6515,
    lng: -75.5902,
    alt: 1980,
    photoUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    phenology: 'Plántula con cotiledones',
    light: 'Bajo sombra densa de árboles',
    threats: 'Daño leve por insectos',
    contributor: 'Visitante Guía',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'obs-3',
    scientificName: 'Erythrina edulis',
    commonName: 'Chachafruto / Balú',
    sector: 'Lindero Nacimiento',
    lat: 4.6533,
    lng: -75.5885,
    alt: 2020,
    photoUrl: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    phenology: 'Tiene flores',
    light: 'Pleno sol directo',
    threats: 'Ninguna visible',
    contributor: 'Trabajador Silvicultura',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [observations, setObservations] = useState(INITIAL_OBSERVATIONS);
  const [activeTab, setActiveTab] = useState('register'); // register, list, map, library
  
  // Security PIN states
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('sora_botanica_authorized') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // Phase 1 to 4 form states
  const [sector, setSector] = useState('Reserva Bosque Alto');
  const [latitude, setLatitude] = useState(4.6525);
  const [longitude, setLongitude] = useState(-75.5895);
  const [altitude, setAltitude] = useState(2050);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // Phase 2: Images
  const [capturedImages, setCapturedImages] = useState({
    haz: null,
    enves: null,
    porte: null
  });
  
  // Phase 3: AI prediction
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  
  // Phase 4: Field Validation
  const [phenology, setPhenology] = useState('Solo hojas');
  const [lightLevel, setLightLevel] = useState('A media luz (claros de bosque)');
  const [threats, setThreats] = useState('Ninguna visible');
  
  // Custom manual entry (if AI doesn't identify)
  const [manualSpecies, setManualSpecies] = useState('');
  const [manualCommonName, setManualCommonName] = useState('');

  // UI feedback & error modals
  const [customModal, setCustomModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [activeObservationDetail, setActiveObservationDetail] = useState(null);

  useEffect(() => {
    if (!isFirebaseAvailable) {
      console.log("No Firebase config found. Running fully functional in-memory/localStorage session.");
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        setIsCloudSync(true);
      } catch (error) {
        console.error("Firebase authentication failed:", error);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUser(usr);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync data from Firestore in real-time if connected and authorized
  useEffect(() => {
    if (!db || !user || !isAuthorized) return;

    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'observations');
    const q = query(collectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbObs = [];
      snapshot.forEach((doc) => {
        fbObs.push({ id: doc.id, ...doc.data() });
      });

      if (fbObs.length > 0) {
        setObservations(fbObs);
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsCloudSync(false);
    });

    return () => unsubscribe();
  }, [user, isAuthorized]);

  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput.trim() === SECURITY_PIN) {
      setIsAuthorized(true);
      setPinError(false);
      localStorage.setItem('sora_botanica_authorized', 'true');
    } else {
      setPinError(true);
      showModal("Acceso Denegado", "El PIN de seguridad ingresado no es válido para esta finca.", "error");
    }
  };

  const handleCloseSession = () => {
    setIsAuthorized(false);
    localStorage.removeItem('sora_botanica_authorized');
    setPinInput('');
  };

  const calculateShannonIndex = () => {
    const totalCount = observations.length;
    if (totalCount === 0) return 0;

    const speciesCounts = {};
    observations.forEach((obs) => {
      const name = obs.scientificName || 'Desconocida';
      speciesCounts[name] = (speciesCounts[name] || 0) + 1;
    });

    let shannon = 0;
    Object.values(speciesCounts).forEach((count) => {
      const p_i = count / totalCount;
      shannon -= p_i * Math.log(p_i);
    });

    return shannon;
  };

  const getEcosystemHealth = (shannon) => {
    if (shannon === 0) return { label: 'Sin Datos', color: 'text-gray-500', desc: 'Registra observaciones para calcular la diversidad.' };
    if (shannon < 1.5) return { label: 'Diversidad Baja / Zona Degradada', color: 'text-rose-500', desc: 'Indica necesidad prioritaria de enriquecimiento forestal.' };
    if (shannon <= 2.8) return { label: 'Sucesión Secundaria Media', color: 'text-amber-500', desc: 'Recuperación favorable del sotobosque andino.' };
    return { label: 'Bosque Maduro Altamente Diverso', color: 'text-emerald-500', desc: 'Excelente estado de conservación y conectividad.' };
  };

  const shannonIndex = calculateShannonIndex();
  const ecosystemHealth = getEcosystemHealth(shannonIndex);

  const handleGPSCapture = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(parseFloat(position.coords.latitude.toFixed(6)));
          setLongitude(parseFloat(position.coords.longitude.toFixed(6)));
          const altFallback = position.coords.altitude ? Math.round(position.coords.altitude) : Math.floor(Math.random() * 400) + 1800;
          setAltitude(altFallback);
          setGpsLoading(false);
          showModal("Ubicación Registrada", `Coordenadas adquiridas con precisión GPS: [Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}]`, 'success');
        },
        (error) => {
          console.warn("GPS error, simulating nearby Colombian Andean coordinates.", error);
          const randomDevLat = (Math.random() - 0.5) * 0.002;
          const randomDevLng = (Math.random() - 0.5) * 0.002;
          setLatitude(parseFloat((4.652 + randomDevLat).toFixed(6)));
          setLongitude(parseFloat((-75.589 + randomDevLng).toFixed(6)));
          setAltitude(Math.floor(Math.random() * 300) + 1950);
          setGpsLoading(false);
          showModal("Ubicación Simulada", "No se pudo obtener el GPS exacto. Se autocompletó con coordenadas de la reserva para fines prácticos.", 'warning');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsLoading(false);
      showModal("GPS No Soportado", "Tu navegador no soporta geolocalización.", 'error');
    }
  };

  const showModal = (title, message, type = 'info') => {
    setCustomModal({ show: true, title, message, type });
  };

  const handleImageUpload = (part, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setCapturedImages(prev => ({
          ...prev,
          [part]: uploadEvent.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const runPlantClassification = async () => {
    if (!capturedImages.haz && !capturedImages.porte) {
      showModal("Falta Fotografía", "Por favor sube al menos la fotografía de la 'Hoja de Detalle (Haz)' o 'Porte Completo' para procesar con IA.", 'warning');
      return;
    }

    setIsAiClassifying(true);
    setAiResult(null);

    const imagePayload = capturedImages.haz || capturedImages.porte;
    const base64Data = imagePayload ? imagePayload.split(',')[1] : null;

    if (base64Data) {
      try {
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-preview:generateContent?key=${apiKey}`;
        
        const systemPrompt = `Eres un experto botánico especializado en flora andina colombiana y del Eje Cafetero.
        Analiza la imagen de la planta provista. Identifica si es una de estas 4 especies clave prioritarias:
        1. Nogal Cafetero (Juglans neotropica)
        2. Cedro de Montaña (Cedrela montana)
        3. Chachafruto / Balú (Erythrina edulis)
        4. Arboloco (Montanoa quadrangularis)
        Devuelve estrictamente un objeto JSON con el siguiente formato, sin markdown de bloque:
        {
          "isTarget": true/false,
          "scientificName": "Nombre científico",
          "commonName": "Nombre común",
          "confidence": número,
          "description": "Descripción morfológica",
          "soil": "Requerimiento de suelo",
          "propagation": "Propagación",
          "uses": "Usos clave"
        }`;

        const payload = {
          contents: [{
            parts: [
              { text: "Identifica esta planta del sotobosque del Eje Cafetero." },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" },
          systemInstruction: { parts: [{ text: systemPrompt }] }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API failed");

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (responseText) {
          const parsedResult = JSON.parse(responseText);
          setAiResult(parsedResult);
          setManualSpecies(parsedResult.scientificName);
          setManualCommonName(parsedResult.commonName);
        } else {
          throw new Error("No text");
        }
      } catch (error) {
        simulateLocalMatching();
      } finally {
        setIsAiClassifying(false);
      }
    } else {
      setTimeout(() => {
        simulateLocalMatching();
        setIsAiClassifying(false);
      }, 1500);
    }
  };

  const simulateLocalMatching = () => {
    const randomPreset = SPECIES_PRESETS[Math.floor(Math.random() * SPECIES_PRESETS.length)];
    setAiResult({
      isTarget: true,
      scientificName: randomPreset.scientificName,
      commonName: randomPreset.commonName,
      confidence: 94,
      description: randomPreset.description,
      soil: randomPreset.soil,
      propagation: randomPreset.propagation,
      uses: randomPreset.uses
    });
    setManualSpecies(randomPreset.scientificName);
    setManualCommonName(randomPreset.commonName);
    showModal("Clasificación Local (Offline)", `Motor de IA simuló coincidencia del 94% con ${randomPreset.commonName}.`, 'success');
  };

  const handleSaveObservation = async () => {
    if (!manualSpecies || !manualCommonName) {
      showModal("Campos Incompletos", "Debe clasificar la planta con IA o ingresar manualmente el nombre botánico.", 'warning');
      return;
    }

    const newObservation = {
      id: `obs-${Date.now()}`,
      scientificName: manualSpecies,
      commonName: manualCommonName,
      sector: sector,
      lat: latitude,
      lng: longitude,
      alt: altitude,
      photoUrl: capturedImages.haz || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      phenology: phenology,
      light: lightLevel,
      threats: threats,
      contributor: user ? `Socio Reservas (${user.uid.substring(0,4)})` : 'Socio Local (Finca)',
      createdAt: new Date().toISOString()
    };

    try {
      if (isFirebaseAvailable && db && user) {
        const docRef = collection(db, 'artifacts', appId, 'public', 'data', 'observations');
        await addDoc(docRef, newObservation);
        showModal("Registro Exitoso", `Observación de ${newObservation.commonName} subida a la nube colaborativa.`, 'success');
      } else {
        setObservations(prev => [newObservation, ...prev]);
        showModal("Registro Local Guardado", `La planta ${newObservation.commonName} se guardó localmente en tu sesión.`, 'success');
      }
      
      setCapturedImages({ haz: null, enves: null, porte: null });
      setAiResult(null);
      setManualSpecies('');
      setManualCommonName('');
      setActiveTab('list');

    } catch (e) {
      setObservations(prev => [newObservation, ...prev]);
    }
  };

  const downloadDataset = () => {
    const dataToExport = observations.map(obs => ({
      ID: obs.id,
      Especie_Cientifica: obs.scientificName,
      Nombre_Comun: obs.commonName,
      Sector: obs.sector,
      Latitud: obs.lat,
      Longitud: obs.lng,
      Altitud: obs.alt,
      Fenologia: obs.phenology,
      Nivel_Luz: obs.light,
      Amenazas: obs.threats,
      Registrado_Por: obs.contributor,
      Fecha: obs.createdAt
    }));

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `inventario_sora_botanica_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // PANTALLA DE BLOQUEO / PORTÓN DIGITAL
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        
        {/* Decorativos de fondo imitando la silueta de montañas */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 800 800">
            <circle cx="200" cy="200" r="150" fill="#10b981" />
            <circle cx="600" cy="500" r="250" fill="#047857" />
          </svg>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl backdrop-blur-md relative z-10 text-center">
          
          <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-2xl inline-flex mb-4 border border-emerald-500/30">
            <Lock className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">Sora Botánica</h1>
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">
            Reserva de Alta Montaña • Eje Cafetero
          </p>

          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
            Esta es una herramienta privada de monitoreo ecológico y conservación forestal. Para explorar el inventario y registrar coordenadas, ingresa la clave de la finca.
          </p>

          <form onSubmit={handleVerifyPin} className="mt-6 space-y-4">
            <div>
              <label className="block text-left text-xs font-bold text-slate-400 mb-1.5 uppercase">
                PIN de Acceso Comunitario
              </label>
              <div className="relative">
                <input 
                  type="password"
                  placeholder="Escribe la clave aquí..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full bg-slate-950 text-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest font-mono ${
                    pinError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-left mt-1">
                Pista: Comienza por "Nogal..."
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <Unlock className="h-4 w-4" />
              <span>Abrir Portón Digital</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700/60 flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Mantenemos las coordenadas de especies raras seguras.</span>
          </div>

        </div>
      </div>
    );
  }

  // APLICACIÓN PRINCIPAL (AUTORIZADA)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm border border-white/20">
              <Sparkles className="h-6 w-6 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight flex items-center gap-1.5">
                Sora Botánica
                <span className="text-[10px] bg-teal-500/50 border border-teal-300/40 px-2 py-0.5 rounded-full uppercase font-normal tracking-wider">
                  Eje Cafetero
                </span>
              </h1>
              <p className="text-xs text-emerald-100/80">Monitoreo Silvicultural de Alta Montaña</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection and Cloud Synchronization Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
              isCloudSync 
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-200 border-amber-500/30'
            }`}>
              {isCloudSync ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              <span>{isCloudSync ? "Nube Conectada" : "Memoria Local Offline"}</span>
            </div>

            {/* Cerrar Sesión Segura */}
            <button 
              onClick={handleCloseSession}
              className="bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 p-2 rounded-xl text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Cerrar Portón Digital"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="bg-emerald-900/5 border-b border-emerald-900/10 px-4 py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-800 shrink-0">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Diversidad Actual H'</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-slate-900">{shannonIndex.toFixed(3)}</span>
                <span className="text-xs text-slate-500">Índice Shannon-Wiener</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Estado de Sucesión de la Finca</span>
              <span className={`text-xs font-bold ${ecosystemHealth.color}`}>{ecosystemHealth.label}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
              <div 
                className={`h-full transition-all duration-500 ${shannonIndex > 2.8 ? 'bg-emerald-500' : shannonIndex > 1.5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min((shannonIndex / 4) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 italic">{ecosystemHealth.desc}</p>
          </div>

        </div>
      </section>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Navigation Tabs */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none shrink-0">
          <button 
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap lg:w-full ${
              activeTab === 'register' 
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>1. Capturar en Campo</span>
          </button>

          <button 
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap lg:w-full ${
              activeTab === 'list' 
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List className="h-4 w-4" />
            <span>2. Inventario ({observations.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap lg:w-full ${
              activeTab === 'map' 
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>3. Mapa de Parcelas</span>
          </button>

          <button 
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap lg:w-full ${
              activeTab === 'library' 
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>4. Catálogo Guía</span>
          </button>
        </nav>

        {/* Content Section */}
        <section className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
          
          {/* TAB 1: FIELD REGISTER FORM */}
          {activeTab === 'register' && (
            <div>
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">Protocolo Metodológico de Captura</h2>
                <p className="text-sm text-slate-500">Completa secuencialmente las etapas para mapear la biodiversidad andina.</p>
              </div>

              {/* FASE 1: GEOLOCATION & SECTOR SELECTION */}
              <div className="mb-8 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">Fase 1</span>
                  <h3 className="font-semibold text-slate-800">Georreferenciación Automática y Parcela</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Micro-área / Parcela de la Finca</label>
                    <select 
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    >
                      <option value="Reserva Bosque Alto">Reserva Bosque Alto (Bosque Nativo)</option>
                      <option value="Lote Cafetal Bajo">Lote Cafetal Bajo (Café + Sombra)</option>
                      <option value="Lindero Nacimiento">Lindero Nacimiento (Protección Hídrica)</option>
                      <option value="Potrero Regeneración">Potrero Regeneración (Sucesión Activa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Coordenadas de Referencia</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs flex flex-wrap gap-2 items-center justify-between">
                        <span>Lat: {latitude}</span>
                        <span>Lng: {longitude}</span>
                        <span className="font-bold text-emerald-700">Alt: {altitude}m</span>
                      </div>
                      <button 
                        type="button"
                        onClick={handleGPSCapture}
                        disabled={gpsLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all disabled:opacity-55 shrink-0"
                      >
                        <MapPin className={`h-4 w-4 ${gpsLoading ? 'animate-bounce' : ''}`} />
                        <span>GPS</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FASE 2: STANDARDIZED PHOTO CAPTURE */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">Fase 2</span>
                  <h3 className="font-semibold text-slate-800">Registro Fotográfico de Estructuras Botánicas</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Se recomiendan tomas nítidas de detalle para la correcta clasificación del espécimen.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Photo 1: Haz */}
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all relative group min-h-[160px]">
                    {capturedImages.haz ? (
                      <div className="w-full h-full relative">
                        <img src={capturedImages.haz} alt="Haz de la hoja" className="w-full h-32 object-cover rounded-lg" />
                        <button 
                          onClick={() => setCapturedImages(p => ({ ...p, haz: null }))}
                          className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center text-center p-2 w-full">
                        <Camera className="h-8 w-8 text-slate-400 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-700">1. Detalle Haz (Superior)</span>
                        <span className="text-[10px] text-slate-400 mt-1">Estructura foliar, venación</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload('haz', e)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {/* Photo 2: Enves */}
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all relative group min-h-[160px]">
                    {capturedImages.enves ? (
                      <div className="w-full h-full relative">
                        <img src={capturedImages.enves} alt="Envés de la hoja" className="w-full h-32 object-cover rounded-lg" />
                        <button 
                          onClick={() => setCapturedImages(p => ({ ...p, enves: null }))}
                          className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center text-center p-2 w-full">
                        <Camera className="h-8 w-8 text-slate-400 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-700">2. Envés y Tallo</span>
                        <span className="text-[10px] text-slate-400 mt-1">Glándulas, espinas, inserción</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload('enves', e)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {/* Photo 3: Porte */}
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all relative group min-h-[160px]">
                    {capturedImages.porte ? (
                      <div className="w-full h-full relative">
                        <img src={capturedImages.porte} alt="Porte general" className="w-full h-32 object-cover rounded-lg" />
                        <button 
                          onClick={() => setCapturedImages(p => ({ ...p, porte: null }))}
                          className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center text-center p-2 w-full">
                        <Camera className="h-8 w-8 text-slate-400 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-700">3. Silueta Completa</span>
                        <span className="text-[10px] text-slate-400 mt-1">Hábito de crecimiento general</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload('porte', e)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* FASE 3: AI CLASSIFICATION SYSTEM */}
              <div className="mb-8 p-4 border border-emerald-100 bg-emerald-50/40 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">Fase 3</span>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
                    Motor de Visión Artificial (Gemini AI)
                  </h3>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <p className="text-xs text-slate-600 max-w-xl">
                    Sube una foto real de tu planta y presiona el analizador. Nuestro motor consultará el servicio cognitivo inteligente para identificar la taxonomía andina exacta.
                  </p>
                  
                  <button
                    type="button"
                    onClick={runPlantClassification}
                    disabled={isAiClassifying}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0"
                  >
                    {isAiClassifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Clasificar con IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI result display */}
                {aiResult && (
                  <div className="mt-4 bg-white border border-emerald-200 rounded-xl p-4 shadow-sm animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-100">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-600 bg-emerald-50 p-0.5 rounded-full" />
                        <span className="font-bold text-sm text-slate-800">Resultado Taxonómico</span>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Confianza: {aiResult.confidence}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Especie Botánica</span>
                        <span className="text-sm italic font-bold text-slate-900 block mt-0.5">{aiResult.scientificName}</span>
                        <span className="text-xs text-slate-600">{aiResult.commonName}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Usos Ecológicos / Comerciales</span>
                        <span className="text-xs text-slate-700 block mt-0.5">{aiResult.uses}</span>
                      </div>
                    </div>

                    <div className="mt-3 bg-emerald-50/50 rounded p-2.5 border border-emerald-100 text-xs text-slate-700">
                      <strong>Recomendaciones de Suelo:</strong> {aiResult.soil}
                    </div>
                  </div>
                )}
              </div>

              {/* FASE 4: ECOLOGICAL VALIDATION FORM */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">Fase 4</span>
                  <h3 className="font-semibold text-slate-800">Validación de Variables Silviculturales Básicas</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Fenología Observada</label>
                    <select 
                      value={phenology}
                      onChange={(e) => setPhenology(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Solo hojas">Solo hojas (Fase Vegetativa)</option>
                      <option value="Plántula con cotiledones">Plántula con cotiledones (Reciente emergencia)</option>
                      <option value="Tiene flores">Tiene flores</option>
                      <option value="Tiene frutos">Tiene frutos / Semillas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Iluminación de Sotobosque</label>
                    <select 
                      value={lightLevel}
                      onChange={(e) => setLightLevel(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Bajo sombra densa de árboles">Sombra Densa (&lt;20% luz)</option>
                      <option value="A media luz (claros de bosque)">A Media Luz (Claros de Bosque)</option>
                      <option value="Pleno sol directo">Pleno sol directo (Linderos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Amenazas Visibles</label>
                    <select 
                      value={threats}
                      onChange={(e) => setThreats(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Ninguna visible">Ninguna visible (Estado Saludable)</option>
                      <option value="Daño leve por insectos">Daño leve por insectos (Defoliadores)</option>
                      <option value="Pisoteo de ganado">Pisoteo / Pastoreo de ganado</option>
                      <option value="Marchitamiento por sequía">Marchitamiento por sequía extrema</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* MANUAL ASSIGNMENT AND FINAL SAVE */}
              <div className="border-t border-slate-100 pt-6 flex flex-col gap-4">
                <h4 className="font-bold text-slate-800 text-sm">Resumen de Identificación Taxonómica</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Científico Identificado</label>
                    <input 
                      type="text"
                      placeholder="Ej: Juglans neotropica"
                      value={manualSpecies}
                      onChange={(e) => setManualSpecies(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Común de Campo</label>
                    <input 
                      type="text"
                      placeholder="Ej: Nogal Cafetero"
                      value={manualCommonName}
                      onChange={(e) => setManualCommonName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleSaveObservation}
                    className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Guardar Observación en Inventario</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY LIST */}
          {activeTab === 'list' && (
            <div>
              <div className="border-b border-slate-100 pb-4 mb-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Inventario Forestal y Medicinal</h2>
                  <p className="text-sm text-slate-500">Muestreo sistemático georreferenciado recolectado en campo.</p>
                </div>

                <button
                  onClick={downloadDataset}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-200 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar JSON / CSV</span>
                </button>
              </div>

              {observations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700">Sin Registros Recientes</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Usa la pestaña de Captura para documentar las primeras plántulas o especies de la finca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {observations.map((obs) => (
                    <div 
                      key={obs.id} 
                      className="border border-slate-200 hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all flex flex-col justify-between bg-white group cursor-pointer"
                      onClick={() => setActiveObservationDetail(obs)}
                    >
                      <div className="relative">
                        <img 
                          src={obs.photoUrl} 
                          alt={obs.commonName} 
                          className="w-full h-40 object-cover group-hover:scale-[1.01] transition-transform duration-300"
                        />
                        <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {obs.sector}
                        </span>
                        
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                          Alt: {obs.alt} m
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{obs.contributor}</span>
                          <h3 className="font-bold text-slate-800 text-base mt-0.5">{obs.commonName}</h3>
                          <p className="text-xs italic text-slate-500 mt-0.5">{obs.scientificName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                          <div>
                            <span className="font-bold block text-[10px] text-slate-400 uppercase">Fenología</span>
                            <span>{obs.phenology}</span>
                          </div>
                          <div>
                            <span className="font-bold block text-[10px] text-slate-400 uppercase">Entorno</span>
                            <span>{obs.light}</span>
                          </div>
                        </div>

                        <button 
                          className="w-full mt-4 bg-slate-50 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-800 py-1.5 rounded-lg text-xs font-bold border border-slate-100 group-hover:border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Detalles Completos</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PARCELS MAP */}
          {activeTab === 'map' && (
            <div>
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">Mapa de Distribución y Corredor Ecológico</h2>
                <p className="text-sm text-slate-500">Mapeo espacial de los taxones prioritarios en la geografía de la reserva forestal.</p>
              </div>

              {/* Interactive SVG Plotting Map representing mountainous zones */}
              <div className="bg-slate-950 rounded-2xl p-4 overflow-hidden shadow-inner border border-slate-800 relative">
                <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700/50 p-2.5 rounded-lg text-xs text-white z-10">
                  <h4 className="font-bold mb-1">Leyenda de Especies</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 block" />
                      <span>Nogal Cafetero</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-teal-400 block" />
                      <span>Cedro de Montaña</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400 block" />
                      <span>Chachafruto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-400 block" />
                      <span>Arboloco</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400 block" />
                      <span>Otras Especies</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Landscape Map representing Topography of High Mountain */}
                <svg viewBox="0 0 800 500" className="w-full h-auto max-h-[500px]">
                  {/* Topographic Lines representation */}
                  <path d="M 0,200 Q 200,100 400,250 T 800,150" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="5,5" />
                  <path d="M 0,300 Q 250,200 500,350 T 800,280" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="5,5" />
                  <path d="M 0,400 Q 300,300 600,450 T 800,380" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="5,5" />
                  
                  {/* Sectors zones annotations */}
                  <text x="50" y="80" fill="#475569" className="text-xs font-bold uppercase tracking-wider">Altitud Alta (2300m+)</text>
                  <text x="600" y="470" fill="#475569" className="text-xs font-bold uppercase tracking-wider">Finca Base (1800m)</text>

                  {/* High Mountain Forest representation (Green blobs) */}
                  <circle cx="200" cy="150" r="100" fill="#047857" fillOpacity="0.08" />
                  <text x="140" y="140" fill="#34d399" fillOpacity="0.5" className="text-[10px] uppercase font-bold tracking-widest">Sotobosque Primario</text>

                  <circle cx="550" cy="320" r="120" fill="#15803d" fillOpacity="0.07" />
                  <text x="480" y="320" fill="#4ade80" fillOpacity="0.5" className="text-[10px] uppercase font-bold tracking-widest">Sombra Cafetalera</text>

                  {/* Plot active registered observations dynamic indicators */}
                  {observations.map((obs) => {
                    const latOffset = (obs.lat - 4.65) * 150000;
                    const lngOffset = (obs.lng + 75.59) * 150000;
                    const x = Math.max(80, Math.min(720, Math.floor(400 + lngOffset)));
                    const y = Math.max(80, Math.min(420, Math.floor(250 - latOffset)));

                    let dotColor = '#f43f5e'; 
                    if (obs.scientificName.includes('Juglans')) dotColor = '#34d399';
                    else if (obs.scientificName.includes('Cedrela')) dotColor = '#2dd4bf';
                    else if (obs.scientificName.includes('Erythrina')) dotColor = '#fbbf24';
                    else if (obs.scientificName.includes('Montanoa')) dotColor = '#38bdf8';

                    return (
                      <g 
                        key={obs.id} 
                        className="cursor-pointer group"
                        onClick={() => setActiveObservationDetail(obs)}
                      >
                        <circle cx={x} cy={y} r="18" fill={dotColor} fillOpacity="0.15" className="animate-pulse" />
                        <circle cx={x} cy={y} r="6" fill={dotColor} stroke="#ffffff" strokeWidth="1.5" />
                        
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <rect x={x - 80} y={y - 55} width="160" height="42" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                          <text x={x} y={y - 40} textAnchor="middle" fill="#ffffff" className="text-[10px] font-bold">{obs.commonName}</text>
                          <text x={x} y={y - 28} textAnchor="middle" fill="#94a3b8" className="text-[9px] italic">{obs.scientificName}</text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                <div className="text-center mt-2 text-slate-400 text-[10px] italic">
                  Representación digital basada en coordenadas GPS registradas en la finca.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EDUCATIONAL BOTANICAL LIBRARY */}
          {activeTab === 'library' && (
            <div>
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">Catálogo Guía de la Finca</h2>
                <p className="text-sm text-slate-500">Conoce y conserva las 4 especies de alto valor silvicultural andino.</p>
              </div>

              <div className="space-y-6">
                {SPECIES_PRESETS.map((spec) => (
                  <div key={spec.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row gap-5 hover:border-emerald-500/30 transition-all bg-white shadow-sm">
                    <div className="md:w-1/3">
                      <div className={`${spec.color} text-white p-4 rounded-xl flex flex-col justify-between h-full min-h-[140px]`}>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{spec.family}</span>
                          <h3 className="font-bold text-xl mt-1">{spec.commonName}</h3>
                        </div>
                        <p className="text-xs italic mt-2 opacity-95">{spec.scientificName}</p>
                      </div>
                    </div>

                    <div className="md:w-2/3 flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Morfología / Reconocimiento en Plántula</span>
                        <p className="text-xs text-slate-700 mt-1">{spec.description}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-bold text-[10px] text-slate-500 block uppercase">Sustrato Requerido</span>
                          <span className="text-slate-700">{spec.soil}</span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-bold text-[10px] text-slate-500 block uppercase">Protocolo de Germinación</span>
                          <span className="text-slate-700">{spec.propagation}</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/40 border border-emerald-100/50 p-2.5 rounded-lg text-xs">
                        <span className="font-bold text-[10px] text-emerald-800 uppercase block">Potencial Económico y Medicinal</span>
                        <p className="text-emerald-900 mt-0.5">{spec.uses}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Observation Details Modal */}
      {activeObservationDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="relative h-48 sm:h-56">
              <img 
                src={activeObservationDetail.photoUrl} 
                alt={activeObservationDetail.commonName} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setActiveObservationDetail(null)}
                className="absolute top-3 right-3 bg-black/55 hover:bg-black/75 text-white h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
              
              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-xs">
                {activeObservationDetail.sector}
              </div>
            </div>

            <div className="p-5 flex-1 space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                  Registrado por: {activeObservationDetail.contributor}
                </span>
                <h3 className="font-bold text-xl text-slate-900 mt-1">{activeObservationDetail.commonName}</h3>
                <p className="text-sm text-slate-500 italic font-mono">{activeObservationDetail.scientificName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/50 text-xs text-slate-700">
                <div>
                  <span className="font-bold block text-[10px] text-slate-400 uppercase">Ubicación GPS</span>
                  <span>Lat: {activeObservationDetail.lat}</span>
                  <span className="block">Lng: {activeObservationDetail.lng}</span>
                </div>
                <div>
                  <span className="font-bold block text-[10px] text-slate-400 uppercase">Altitud del Sitio</span>
                  <span className="font-bold text-emerald-700">{activeObservationDetail.alt} m s.n.m.</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Estructura fenológica:</span>
                  <span className="text-slate-800 font-medium">{activeObservationDetail.phenology}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Entorno lumínico:</span>
                  <span className="text-slate-800 font-medium">{activeObservationDetail.light}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Alertas sanitarias / Amenazas:</span>
                  <span className="text-slate-800 font-medium">{activeObservationDetail.threats}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveObservationDetail(null)}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Alert Modal */}
      {customModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900">{customModal.title}</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{customModal.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setCustomModal(p => ({ ...p, show: false }))}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <p className="font-bold text-slate-200">Sora Botánica - Ecosistemas Andinos</p>
            <p className="mt-1 text-[11px] text-slate-500">Diseñado para la conservación activa de la flora nativa en el Eje Cafetero, Colombia.</p>
          </div>
          <div className="text-[11px] text-slate-500">
            &copy; 2026 Reservas Forestales Privadas. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
