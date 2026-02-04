import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Upload, 
  BarChart3, 
  Target, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  TrendingUp,
  LineChart,
  Layout,
  ArrowRight,
  X,
  RefreshCcw,
  Youtube,
  Image as ImageIcon,
  MousePointer2,
  MessageSquare,
  Sparkles,
  FileText,
  Printer
} from 'lucide-react';

const apiKey = ""; // Fourni automatiquement par l'environnement

const App = () => {
  const [step, setStep] = useState('input');
  const [url, setUrl] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [isExportMode, setIsExportMode] = useState(false);

  // Gestion de l'upload d'images
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, {
          file,
          preview: URL.createObjectURL(file),
          base64: reader.result.split(',')[1],
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Fonction de répétition exponentielle pour l'API
  const fetchWithRetry = async (payload, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (response.ok) return result;
        
        if (response.status === 429 || response.status >= 500) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
          continue;
        }
        throw new Error(result.error?.message || "Erreur de configuration API.");
      } catch (e) {
        if (i === retries - 1) throw e;
      }
    }
  };

  const runAnalysis = async () => {
    if (!url && images.length === 0) {
      setError("Veuillez fournir au moins un lien YouTube ou une capture d'écran.");
      return;
    }

    setStep('analyzing');
    setError(null);

    const systemPrompt = `Tu es un expert en algorithme YouTube spécialisé dans le football. 
    TES MISSIONS :
    1. Si une URL est fournie, analyse le titre et le sujet.
    2. Si des images sont fournies, extrais visuellement les stats (CTR %, Rétention %, Engagement).
    3. Produis une analyse croisée honnête.
    
    RÈGLE STRICTE : Réponds EXCLUSIVEMENT en JSON pur.
    Structure :
    - score: nombre 0-100
    - extractedStats: { ctr: string, retention: string, title: string }
    - statAnalysis: Analyse concise
    - categories: tableau de 3 objets {name: string, icon: "hook"|"seo"|"engagement", details: tableau de reco}
    - todoList: tableau de 6 actions.`;

    const userParts = [{ text: `Analyse ma vidéo : ${url || "Lien non fourni"}. Extraits les stats des images jointes.` }];
    images.forEach(img => {
      userParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });

    try {
      const payload = {
        contents: [{ role: "user", parts: userParts }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              score: { type: "NUMBER" },
              extractedStats: {
                type: "OBJECT",
                properties: { ctr: { type: "STRING" }, retention: { type: "STRING" }, title: { type: "STRING" } }
              },
              statAnalysis: { type: "STRING" },
              categories: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    icon: { type: "STRING" },
                    details: { type: "ARRAY", items: { type: "STRING" } }
                  }
                }
              },
              todoList: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["score", "statAnalysis", "categories", "todoList", "extractedStats"]
          }
        }
      };

      const result = await fetchWithRetry(payload);
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) throw new Error("Réponse vide de l'IA.");

      const data = JSON.parse(rawText.trim());
      
      // Sécurisation des données reçues
      if (!data.categories) data.categories = [];
      if (!data.todoList) data.todoList = [];
      if (!data.extractedStats) data.extractedStats = { ctr: "N/A", retention: "N/A", title: "Inconnu" };

      setAnalysisData(data);
      setTodos(data.todoList.map((t, i) => ({ id: i, text: String(t), checked: false })));
      setStep('results');
    } catch (err) {
      console.error("Analysis Error:", err);
      setError(`Erreur d'analyse : ${err.message}. Essayez d'envoyer moins de captures d'écran.`);
      setStep('input');
    }
  };

  const getIcon = (iconName) => {
    const iconClass = "w-6 h-6";
    switch(iconName) {
      case 'hook': return <Zap className={`${iconClass} text-amber-500`} />;
      case 'seo': return <Target className={`${iconClass} text-blue-500`} />;
      case 'engagement': return <MessageSquare className={`${iconClass} text-green-500`} />;
      default: return <Sparkles className={`${iconClass} text-purple-500`} />;
    }
  };

  if (step === 'analyzing') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-8">
          <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Youtube className="text-blue-600 w-8 h-8" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Audit en cours...</h2>
        <p className="text-slate-500 font-medium italic">Analyse des données et des visuels...</p>
      </div>
    );
  }

  // --- VUE RÉSULTATS ---
  if (step === 'results' && analysisData) {
    return (
      <div className={`min-h-screen bg-white text-slate-900 font-sans ${isExportMode ? 'p-0' : 'p-6 md:p-12'}`}>
        <div className="max-w-5xl mx-auto">
          
          {/* Menu Actions (Caché à l'impression) */}
          {!isExportMode && (
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-slate-100 pb-8 gap-6 print:hidden">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Expert @Session_Vanne</span>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Tableau d'Audit</h1>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsExportMode(true)} 
                  className="flex items-center gap-2 text-sm font-bold bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  <FileText size={16} /> Mode PDF
                </button>
                <button onClick={() => setStep('input')} className="flex items-center gap-2 text-sm font-bold bg-slate-100 px-6 py-3 rounded-full border border-slate-200">
                  <RefreshCcw size={16} /> Relancer
                </button>
              </div>
            </div>
          )}

          {/* MODE EXPORT PDF / IMPRESSION */}
          {isExportMode && (
            <div className="bg-white p-8 md:p-16 border min-h-screen">
               <div className="flex justify-between items-start mb-12 print:hidden">
                  <button onClick={() => setIsExportMode(false)} className="text-sm font-bold text-slate-400 hover:text-slate-900 flex items-center gap-2">← Dashboard</button>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl"><Printer size={18}/> Imprimer / Sauver en PDF</button>
               </div>

               <div className="text-center mb-16">
                  <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">Stratégie d'Optimisation</h1>
                  <p className="text-slate-400 font-bold italic border-b pb-8 max-w-lg mx-auto">Analyse pour : {analysisData.extractedStats?.title || "Vidéo"}</p>
               </div>

               <div className="grid grid-cols-2 gap-8 mb-16">
                  <div className="border-l-4 border-blue-600 pl-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Statistiques Extraites</h3>
                    <div className="flex gap-8">
                       <div><p className="text-[10px] font-bold text-slate-400 uppercase">CTR</p><p className="text-3xl font-black">{analysisData.extractedStats?.ctr || "N/A"}</p></div>
                       <div><p className="text-[10px] font-bold text-slate-400 uppercase">RÉTENTION</p><p className="text-3xl font-black">{analysisData.extractedStats?.retention || "N/A"}</p></div>
                       <div><p className="text-[10px] font-bold text-slate-400 uppercase">SCORE</p><p className="text-3xl font-black text-blue-600">{analysisData.score || 0}/100</p></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 italic">Diagnostic IA</h3>
                     <p className="text-sm leading-relaxed text-slate-600 italic">"{analysisData.statAnalysis}"</p>
                  </div>
               </div>

               <div className="space-y-12 mb-16">
                  <h2 className="text-2xl font-black uppercase border-b pb-4">Recommandations Stratégiques</h2>
                  {analysisData.categories?.map((cat, i) => (
                    <div key={i} className="page-break-inside-avoid">
                       <h3 className="text-xl font-black text-blue-600 mb-6 flex items-center gap-3">
                          {getIcon(cat.icon)} {cat.name}
                       </h3>
                       <div className="grid gap-4 pl-10">
                          {cat.details?.map((d, di) => (
                            <div key={di} className="bg-slate-50 p-6 rounded-2xl relative border border-slate-100">
                               <span className="absolute -left-8 top-6 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">{di+1}</span>
                               <p className="text-sm font-medium leading-relaxed">{String(d)}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
               </div>

               <div className="bg-slate-900 text-white p-12 rounded-[50px]">
                  <h2 className="text-2xl font-black uppercase mb-8 italic flex items-center gap-3"><CheckCircle2 className="text-green-400"/> Checklist de Publication</h2>
                  <div className="grid gap-4">
                     {analysisData.todoList?.map((t, i) => (
                       <div key={i} className="flex items-center gap-4 p-4 border border-white/10 rounded-2xl">
                          <div className="w-6 h-6 rounded-full border-2 border-slate-700 flex-shrink-0"></div>
                          <span className="text-sm font-bold opacity-90">{String(t)}</span>
                       </div>
                     ))}
                  </div>
                  <p className="mt-12 text-center text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase">Document confidentiel • Session Vanne AI Expert</p>
               </div>
            </div>
          )}

          {/* DASHBOARD CLASSIQUE (Visuel Interactif) */}
          {!isExportMode && (
            <>
              <div className="grid md:grid-cols-4 gap-8 mb-12">
                <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                      <circle cx="64" cy="64" r="58" stroke="#2563eb" strokeWidth="10" fill="transparent" 
                        strokeDasharray="364.4" strokeDashoffset={364.4 - (364.4 * (analysisData.score || 0) / 100)}
                        strokeLinecap="round" className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-4xl font-black">{analysisData.score || 0}</span>
                  </div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-4">Score Global</p>
                </div>

                <div className="md:col-span-3 bg-slate-50 p-8 rounded-[40px] border border-slate-100 grid md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CTR Extrait</div>
                    <div className="text-2xl font-black text-blue-600">{analysisData.extractedStats?.ctr || "--%"}</div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rétention</div>
                    <div className="text-2xl font-black text-blue-600">{analysisData.extractedStats?.retention || "--%"}</div>
                  </div>
                  <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-center">
                    <h3 className="text-xs font-black uppercase italic flex items-center gap-2"><Zap size={14} fill="white"/> Résumé IA</h3>
                    <p className="text-[10px] leading-tight font-medium opacity-90 mt-1 line-clamp-4">{analysisData.statAnalysis}</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 mb-8 ml-2">Axes d'Optimisation</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {analysisData.categories?.map((cat, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-[35px] overflow-hidden hover:border-blue-300 transition-all shadow-sm">
                      <div className="p-8 border-b border-slate-50 flex flex-col items-center text-center">
                        <div className="mb-4">{getIcon(cat.icon)}</div>
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{cat.name}</h3>
                      </div>
                      <div className="p-4 space-y-2">
                        {cat.details?.map((detail, dIdx) => (
                          <div key={dIdx} className="border border-slate-50 rounded-2xl overflow-hidden bg-slate-50/30">
                            <details className="group">
                              <summary className="list-none p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Conseil {dIdx + 1}</span>
                                <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
                              </summary>
                              <div className="p-4 pt-0 text-xs leading-relaxed text-slate-500 font-medium">{String(detail)}</div>
                            </details>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-10 rounded-[50px] text-white shadow-2xl shadow-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black uppercase italic flex items-center gap-3"><CheckCircle2 className="text-green-400" /> Actions à cocher</h3>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{todos.filter(t => t.checked).length} / {todos.length}</div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {todos.map(todo => (
                    <div key={todo.id} onClick={() => toggleTodo(todo.id)} className={`p-5 rounded-2xl border cursor-pointer flex items-center gap-4 transition-all ${todo.checked ? 'bg-green-500/10 border-green-500/30 opacity-60' : 'bg-white/5 border-white/10'}`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${todo.checked ? 'bg-green-400 border-green-400 text-black' : 'border-slate-700'}`}>
                        {todo.checked && <CheckCircle2 size={14} />}
                      </div>
                      <span className={`text-sm font-bold tracking-tight ${todo.checked ? 'line-through text-slate-500' : 'text-slate-100'}`}>{todo.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- VUE INPUT (Accueil) ---
  return (
    <div className="min-h-screen bg-white p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest mb-6 shadow-xl">Audit Algorithmique</div>
          <h1 className="text-7xl font-black uppercase tracking-tighter mb-4 leading-none">YouTube Analyst Pro</h1>
          <p className="text-slate-400 font-bold italic text-xl">L'IA analyse votre Studio à partir de vos captures d'écran.</p>
        </div>

        <div className="bg-white rounded-[60px] shadow-2xl shadow-slate-100 p-10 md:p-16 border border-slate-100">
          {error && (
            <div className="mb-10 p-6 bg-red-50 text-red-600 rounded-[30px] flex items-start gap-4 text-sm font-bold border border-red-100">
              <AlertCircle size={24} className="flex-shrink-0" /> 
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-widest ml-4">Source Vidéo</h3>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-600"><Youtube size={24} /></div>
                <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Lien YouTube..." className="w-full bg-slate-50 border-2 border-transparent rounded-[30px] py-6 pl-16 pr-6 focus:ring-0 focus:border-blue-600 font-black text-lg shadow-inner" />
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="space-y-6">
              <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-widest ml-4">Captures Analytics (Studio)</h3>
              <div className="relative border-4 border-dashed border-slate-100 rounded-[40px] p-12 flex flex-col items-center justify-center hover:border-blue-600 hover:bg-blue-50/20 transition-all cursor-pointer bg-slate-50/50 group">
                <input type="file" multiple onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="bg-white p-6 rounded-3xl shadow-lg mb-4 group-hover:scale-110 transition-transform"><ImageIcon className="text-blue-600" size={40} /></div>
                <span className="text-lg font-black uppercase tracking-tighter">Ajouter vos screens</span>
                <span className="text-xs font-bold text-slate-400 mt-2 italic">CTR, Rétention, Temps Réel...</span>
              </div>
              
              {images.length > 0 && (
                <div className="flex gap-4 flex-wrap justify-center pt-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-2 border-white group">
                      <img src={img.preview} className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X size={20} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={runAnalysis} className="w-full py-8 rounded-[35px] font-black text-white uppercase tracking-widest text-2xl transition-all transform active:scale-95 shadow-2xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-4">Lancer l'Audit Automatique <ArrowRight size={28} /></button>
          </div>
        </div>
        <p className="mt-16 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">IA Propulsée par Gemini 2.5 Flash • Football Strategy 2026</p>
      </div>
    </div>
  );
};

export default App;