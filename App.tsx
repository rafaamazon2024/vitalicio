
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LogOut, Search, Grid, Book, PlayCircle, X, 
  ArrowRight, Layers, Star, RotateCcw, Loader2, ExternalLink, 
  Database, AlertCircle, CheckCircle, Sparkles, Info, Plus, Trash2, Edit3, Save, LayoutDashboard, Settings as SettingsIcon, Image as ImageIcon
} from 'lucide-react';
import { User, Material, AppSettings, CATEGORIES, MaterialType } from './types';
import { supabase } from './supabase';

const VIBRANT_GRADIENTS = [
  'from-indigo-600 via-purple-600 to-pink-500',
  'from-amber-400 via-orange-500 to-red-600',
  'from-cyan-400 via-blue-500 to-indigo-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-fuchsia-500 via-purple-600 to-violet-700',
  'from-blue-600 via-indigo-700 to-purple-800'
];

const getRandomGradient = () => VIBRANT_GRADIENTS[Math.floor(Math.random() * VIBRANT_GRADIENTS.length)];

const DEFAULT_SETTINGS: AppSettings = {
  heroTitle: "Domine\nO Próximo Nível.",
  heroSubtitle: "Sua biblioteca privada de alta performance, agora 100% online e sob seu comando.",
  heroImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
  heroButtonText: "Começar Agora",
  heroButtonLink: "#vitrine"
};

const App: React.FC = () => {
  // --- ESTADOS DE AUTH E APP ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInit, setIsAppInit] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{id: string, message: string, type?: 'success' | 'error'}[]>([]);

  // --- ESTADOS DE CONTEÚDO ---
  const [items, setItems] = useState<Material[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'curso' | 'ebook'>('todos');
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  
  // --- ESTADOS DE ADMIN ---
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isEditing, setIsEditing] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({
    title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: ''
  });

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  };

  // Renderizador de links inteligentes
  const renderDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
            className="text-purple-400 hover:text-purple-300 underline underline-offset-4 decoration-purple-500/50 inline-flex items-center gap-1 transition-all font-black"
            onClick={(e) => e.stopPropagation()}>
            Acessar <ExternalLink size={14} />
          </a>
        );
      }
      return part;
    });
  };

  // --- EFEITOS DE INICIALIZAÇÃO ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) handleSetUser(session.user);
      } catch (err: any) {
        setConnError(err.message);
      } finally {
        setIsAppInit(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) handleSetUser(session.user);
      else if (!currentUser?.id.startsWith('admin-root')) setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetUser = (supabaseUser: any) => {
    const isAdmin = supabaseUser.email === 'admin@academia.com';
    setCurrentUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.full_name || supabaseUser.email?.split('@')[0] || 'Membro Elite',
      email: supabaseUser.email || '',
      isAdmin: isAdmin
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (authEmail === 'admin@academia.com' && authPassword === 'admin123') {
      setCurrentUser({ id: 'admin-root', name: 'Diretoria Vitalício', email: authEmail, isAdmin: true });
      setIsLoading(false);
      return;
    }
    try {
      const { error } = isAuthMode === 'login' 
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) throw error;
      addToast(isAuthMode === 'login' ? "Acesso autorizado!" : "Cadastro realizado!");
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: mData, error: mError } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (mError) throw mError;

      const { data: sData } = await supabase.from('settings').select('*').maybeSingle();
      if (sData) setSettings({
        heroTitle: sData.hero_title || DEFAULT_SETTINGS.heroTitle,
        heroSubtitle: sData.hero_subtitle || DEFAULT_SETTINGS.heroSubtitle,
        heroImageUrl: sData.hero_image_url || DEFAULT_SETTINGS.heroImageUrl,
        heroButtonText: sData.hero_button_text || DEFAULT_SETTINGS.heroButtonText,
        heroButtonLink: sData.hero_button_link || DEFAULT_SETTINGS.heroButtonLink,
      });
      
      setItems((mData || []).map(m => ({
        ...m,
        id: m.id,
        title: m.title,
        type: m.type as MaterialType,
        category: m.category,
        description: m.description || '',
        imageUrl: m.image_url || '',
        videoUrl: m.video_url || '',
        views: m.views || 0,
        gradient: m.gradient || getRandomGradient(),
        comments: [],
        isReadBy: []
      })));
    } catch (e: any) {
      addToast("Erro ao carregar dados.", "error");
    }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  // --- FUNÇÕES DE ADMIN ---
  const saveMaterial = async () => {
    setIsLoading(true);
    try {
      const payload = {
        title: materialForm.title,
        type: materialForm.type,
        category: materialForm.category,
        description: materialForm.description,
        image_url: materialForm.imageUrl,
        video_url: materialForm.videoUrl,
        gradient: isEditing?.gradient || getRandomGradient()
      };

      const { error } = isEditing 
        ? await supabase.from('materials').update(payload).eq('id', isEditing.id)
        : await supabase.from('materials').insert([payload]);

      if (error) throw error;
      addToast(isEditing ? "Atualizado!" : "Criado com sucesso!");
      setIsEditing(null);
      setMaterialForm({ title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: '' });
      fetchData();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm("Confirmar exclusão definitiva?")) return;
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      addToast("Removido.");
      fetchData();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
      const matchesTab = activeTab === 'todos' || item.type === activeTab;
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [items, searchTerm, activeCategory, activeTab]);

  if (isAppInit) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-t-4 border-purple-600 border-r-4 border-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black tracking-[10px] text-purple-500 uppercase">Vitalício</p>
    </div>
  );

  // --- LOGIN VIEW ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[200px] rounded-full animate-aurora"></div>
        <div className="glass max-w-md w-full p-12 md:p-16 rounded-[4rem] border border-white/10 text-center animate-fade-in relative z-10">
          <div className="w-20 h-20 mx-auto mb-10 p-5 rounded-[2rem] bg-gradient-primary shadow-2xl flex items-center justify-center animate-pulse"><Layers size={32} /></div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-gradient-primary uppercase">Vitalício</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[4px] mb-12">Portal da Elite</p>
          
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <input type="email" placeholder="E-mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-1 focus:ring-purple-500 transition-all" required />
            <input type="password" placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-1 focus:ring-purple-500 transition-all" required />
            <button type="submit" disabled={isLoading} className="w-full py-5 rounded-[2rem] bg-gradient-primary font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Acessar Academia'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5">
            <div className={`text-[10px] py-2 px-4 rounded-xl border font-bold uppercase ${connError ? 'border-red-500/20 text-red-500 bg-red-500/5' : 'border-green-500/20 text-green-500 bg-green-500/5'}`}>
              {connError ? `Erro de Conexão: ${connError}` : 'Pronto para Sincronizar'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- APP VIEW ---
  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row relative">
      <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`animate-slide-in glass px-6 py-4 rounded-2xl border-l-4 pointer-events-auto flex items-center gap-4 shadow-2xl ${t.type === 'error' ? 'border-red-500 bg-red-500/5' : 'border-purple-500 bg-purple-500/5'}`}>
            {t.type === 'error' ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle size={18} className="text-purple-500" />}
            <span className="text-xs font-black tracking-wide">{t.message}</span>
          </div>
        ))}
      </div>

      <aside className="w-full md:w-80 glass border-r border-white/10 p-10 flex flex-col gap-12 bg-[#050505]/98 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-gradient-primary shadow-xl"><Layers size={24} /></div><h2 className="text-2xl font-black text-gradient-primary tracking-tighter">VITALÍCIO</h2></div>
        
        {currentUser.isAdmin && (
          <button onClick={() => setIsAdminMode(!isAdminMode)} className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-xs font-black transition-all ${isAdminMode ? 'bg-orange-500 text-white shadow-xl' : 'bg-white/5 text-orange-400 hover:bg-white/10 border border-orange-500/20'}`}>
            <LayoutDashboard size={18} /> {isAdminMode ? 'Sair do Gerente' : 'Painel de Controle'}
          </button>
        )}

        <nav className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-[4px] mb-6 ml-4">Diretório</p>
          <button onClick={() => { setActiveCategory('Todos'); setIsAdminMode(false); }} className={`w-full text-left px-6 py-5 rounded-3xl text-xs font-black transition-all flex items-center gap-4 ${activeCategory === 'Todos' && !isAdminMode ? 'bg-purple-600 shadow-xl' : 'text-gray-500 hover:bg-white/5'}`}><Grid size={16} /> Todos</button>
          {CATEGORIES.map(cat => (<button key={cat} onClick={() => { setActiveCategory(cat); setIsAdminMode(false); }} className={`w-full text-left px-6 py-5 rounded-3xl text-xs font-black transition-all flex items-center gap-4 ${activeCategory === cat && !isAdminMode ? 'bg-purple-600 shadow-xl' : 'text-gray-500 hover:bg-white/5'}`}><Star size={16} /> {cat}</button>))}
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => setCurrentUser(null))} className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-3xl bg-red-500/5 text-red-400 font-black text-xs hover:bg-red-500/10 transition-all border border-red-500/10"><LogOut size={18} /> Sair</button>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
        {!isAdminMode ? (
          <>
            <section className="relative p-10 lg:p-24 rounded-[4rem] m-6 overflow-hidden shadow-3xl min-h-[600px] flex flex-col justify-center group border border-white/5">
              <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[30s] scale-105 group-hover:scale-110" alt="Hero" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
              <div className="relative z-10 max-w-4xl animate-fade-in">
                <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full glass border border-white/20 text-[10px] font-black uppercase tracking-[6px] mb-12 shadow-2xl backdrop-blur-3xl"><Sparkles size={16} fill="currentColor" className="text-purple-400" /> Premium Access</div>
                <h1 className="text-6xl lg:text-9xl font-black mb-10 leading-[0.85] tracking-tighter whitespace-pre-wrap">{settings.heroTitle}</h1>
                <p className="text-xl lg:text-3xl text-white/70 font-medium mb-16 leading-relaxed italic max-w-2xl">{settings.heroSubtitle}</p>
                <a href={settings.heroButtonLink} className="w-fit px-16 py-7 rounded-[2.5rem] bg-white text-black font-black uppercase text-[12px] tracking-[6px] hover:scale-105 transition-all shadow-3xl active:scale-95 inline-block">Começar Agora</a>
              </div>
            </section>

            <div id="vitrine" className="p-10 lg:p-20 space-y-16">
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div><h2 className="text-4xl lg:text-7xl font-black tracking-tighter mb-4">Acervo <span className="text-purple-500">Exclusivo</span></h2><p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Módulos vitalícios</p></div>
                <div className="flex bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
                  {(['todos', 'curso', 'ebook'] as const).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-12 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[4px] transition-all duration-300 ${activeTab === tab ? 'bg-purple-600 shadow-2xl scale-105' : 'text-gray-500 hover:text-white'}`}>{tab}</button>))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-12 lg:gap-16">
                {filteredItems.map((item, index) => (
                  <div key={item.id} className="relative group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }} onClick={() => setSelectedItem(item)}>
                    <div className={`absolute -inset-4 bg-gradient-to-br ${item.gradient} rounded-[4rem] opacity-0 group-hover:opacity-25 blur-[50px] transition-all duration-700 scale-90 group-hover:scale-110`}></div>
                    <div className="relative glass-card rounded-[3.5rem] border border-white/5 overflow-hidden h-full flex flex-col hover:-translate-y-6 transition-all duration-700 shadow-2xl hover:border-purple-500/40 bg-black/40">
                      <div className="h-80 overflow-hidden relative">
                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute top-6 left-6"><span className="px-6 py-2 glass rounded-2xl text-[11px] font-black uppercase tracking-[4px]">{item.type}</span></div>
                      </div>
                      <div className="p-12 flex flex-col flex-1">
                        <h3 className="text-3xl font-black mb-4 tracking-tighter group-hover:text-purple-400 transition-colors leading-tight">{item.title}</h3>
                        <div className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-10 italic">{renderDescription(item.description)}</div>
                        <div className="mt-auto flex justify-between items-center pt-10 border-t border-white/5">
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.category}</span>
                          <div className={`p-6 bg-gradient-to-br ${item.gradient} text-white rounded-[2rem] shadow-3xl hover:scale-110 transition-all`}><ArrowRight size={28}/></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="p-10 lg:p-20 space-y-12 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-5xl font-black tracking-tighter">Gerenciar <span className="text-orange-500">Acervo</span></h2>
              <button onClick={() => { setIsEditing(null); setMaterialForm({ title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: '' }); }} className="px-10 py-5 rounded-3xl bg-orange-500 font-black uppercase text-xs tracking-widest flex items-center gap-4 hover:scale-105 transition-all shadow-xl"><Plus size={20}/> Novo Material</button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <div className="glass p-12 rounded-[3.5rem] border border-orange-500/20 space-y-8">
                <h3 className="text-xl font-black flex items-center gap-4"><Edit3 className="text-orange-500"/> {isEditing ? 'Editar Item' : 'Cadastrar Novo'}</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Título do Material" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-orange-500" />
                  <div className="flex gap-4">
                    <select value={materialForm.type} onChange={e => setMaterialForm({...materialForm, type: e.target.value as MaterialType})} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-orange-500">
                      <option value="curso" className="bg-black">Curso</option>
                      <option value="ebook" className="bg-black">E-book</option>
                    </select>
                    <select value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-orange-500">
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                    </select>
                  </div>
                  <textarea placeholder="Descrição (Links serão automáticos)" value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 min-h-[150px] outline-none focus:ring-1 focus:ring-orange-500" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 ml-4"><ImageIcon size={12}/> URL da Capa (JPG/PNG)</div>
                    <input type="text" value={materialForm.imageUrl} onChange={e => setMaterialForm({...materialForm, imageUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 ml-4"><PlayCircle size={12}/> Link do Vídeo/Acesso</div>
                    <input type="text" value={materialForm.videoUrl} onChange={e => setMaterialForm({...materialForm, videoUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <button onClick={saveMaterial} className="w-full py-6 rounded-3xl bg-green-600 font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-green-500 transition-all shadow-xl">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20}/>} {isEditing ? 'Salvar Alterações' : 'Publicar na Biblioteca'}
                  </button>
                </div>
              </div>

              <div className="glass p-12 rounded-[3.5rem] border border-white/5 overflow-hidden flex flex-col">
                <h3 className="text-xl font-black mb-8 flex items-center gap-4"><Layers className="text-purple-500"/> Lista de Materiais</h3>
                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-4 scrollbar-hide">
                  {items.map(item => (
                    <div key={item.id} className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/[0.06] transition-all">
                      <div className="flex items-center gap-6">
                        <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                          <p className="font-black text-sm">{item.title}</p>
                          <p className="text-[10px] uppercase text-gray-500 font-bold">{item.category} • {item.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setIsEditing(item); setMaterialForm(item); }} className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={18}/></button>
                        <button onClick={() => deleteMaterial(item.id)} className="p-4 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DETALHES */}
      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10 animate-fade-in">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative w-full max-w-[1200px] h-full max-h-[92vh] flex flex-col glass border border-white/10 rounded-[4rem] shadow-3xl overflow-hidden">
            <div className="overflow-y-auto p-12 lg:p-24 scrollbar-hide">
              <div className="flex justify-between items-start mb-16">
                <div><h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-4">{selectedItem.title}</h2><p className="text-xs text-purple-400 font-black uppercase tracking-[6px]">{selectedItem.category}</p></div>
                <button onClick={() => setSelectedItem(null)} className="p-6 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/10"><X size={32} /></button>
              </div>
              <div className="aspect-video w-full rounded-[4rem] bg-gray-950 overflow-hidden mb-16 border border-white/5 relative group shadow-2xl">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover opacity-20" alt="" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <a href={selectedItem.videoUrl} target="_blank" className={`p-20 rounded-full bg-gradient-to-br ${selectedItem.gradient} hover:scale-110 transition-all shadow-2xl backdrop-blur-md`}>
                    {selectedItem.type === 'curso' ? <PlayCircle size={80} fill="white" /> : <Book size={80} fill="white" />}
                  </a>
                </div>
              </div>
              <div className="max-w-4xl space-y-12 pb-20">
                <h3 className="text-3xl font-black border-b border-white/5 pb-8 uppercase tracking-widest text-sm text-purple-500 flex items-center gap-4"><Info size={24} /> Ficha de Módulo</h3>
                <div className="text-gray-400 text-3xl italic leading-relaxed font-medium">{renderDescription(selectedItem.description)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
