
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LogOut, Search, Grid, List, Book, PlayCircle, Plus, Trash2, Edit3, 
  LayoutDashboard, MessageSquare, Eye, CheckCircle, X, Send, 
  ArrowRight, Users, Layers, Star, RotateCcw, Loader2, ExternalLink, 
  Database, AlertCircle, Image as ImageIcon, Info, FileText, UploadCloud,
  Settings as SettingsIcon, Monitor, Sparkles, Link as LinkIcon, Mail, ShieldCheck
} from 'lucide-react';
import { User, Material, AppSettings, CATEGORIES, MaterialType } from './types';
import { supabase } from './supabase';

const getRandomGradient = () => {
  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-600',
    'from-amber-500 via-orange-600 to-red-600',
    'from-cyan-500 via-blue-600 to-indigo-700',
    'from-emerald-500 via-teal-600 to-cyan-700',
    'from-rose-500 via-fuchsia-600 to-purple-700'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

const DEFAULT_SETTINGS: AppSettings = {
  heroTitle: "Domine\nO Próximo Nível.",
  heroSubtitle: "Sua biblioteca privada de alta performance, agora 100% online.",
  heroImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
  heroButtonText: "Explorar Conteúdo",
  heroButtonLink: "#vitrine",
  heroButton2Text: "Ver Catálogo",
  heroButton2Link: "#vitrine"
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInit, setIsAppInit] = useState(true);
  
  const [items, setItems] = useState<Material[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'curso' | 'ebook'>('todos');
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [adminTab, setAdminTab] = useState<'conteudo' | 'vitrine'>('conteudo');
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({
    title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: ''
  });

  const [toasts, setToasts] = useState<{id: string, message: string, type?: 'success' | 'error'}[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id));
    }, 10000); // Toasts duram mais tempo para você conseguir ler os erros
  };

  const fetchData = async () => {
    try {
      const { data: mData, error: mError } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (!mError) {
        const formattedItems = (mData || []).map((m: any) => ({
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
        }));
        setItems(formattedItems);
      } else {
        console.error("Erro Materials:", mError);
      }

      const { data: sData } = await supabase.from('settings').select('*').maybeSingle();
      if (sData) {
        setSettings({
          heroTitle: sData.hero_title || DEFAULT_SETTINGS.heroTitle,
          heroSubtitle: sData.hero_subtitle || DEFAULT_SETTINGS.heroSubtitle,
          heroImageUrl: sData.hero_image_url || DEFAULT_SETTINGS.heroImageUrl,
          heroButtonText: sData.hero_button_text || DEFAULT_SETTINGS.heroButtonText,
          heroButtonLink: sData.hero_button_link || DEFAULT_SETTINGS.heroButtonLink,
          heroButton2Text: sData.hero_button_2_text || DEFAULT_SETTINGS.heroButton2Text,
          heroButton2Link: sData.hero_button_2_link || DEFAULT_SETTINGS.heroButton2Link,
        });
      }
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    }
  };

  useEffect(() => {
    // Verificar se existe bypass no localStorage
    const savedBypass = localStorage.getItem('portal_admin_bypass');
    if (savedBypass === 'true') {
      setCurrentUser({ id: 'admin-hardcoded', name: 'Administrador Elite', email: 'admin@academia.com', isAdmin: true });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !savedBypass) handleSetUser(session.user);
      setIsAppInit(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !localStorage.getItem('portal_admin_bypass')) handleSetUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetUser = (supabaseUser: any) => {
    const isAdmin = supabaseUser.email === 'admin@academia.com';
    setCurrentUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
      email: supabaseUser.email || '',
      isAdmin: isAdmin
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const inputEmail = authEmail.trim().toLowerCase();

    // LOGIN BYPASS (ADMIN ROOT) - Força a entrada independente do Supabase
    if (inputEmail === 'admin@academia.com' && authPassword === 'admin123') {
      localStorage.setItem('portal_admin_bypass', 'true');
      setCurrentUser({ id: 'admin-hardcoded', name: 'Administrador Elite', email: inputEmail, isAdmin: true });
      addToast("Acesso Administrativo Vitalício!");
      setIsLoading(false);
      return;
    }

    try {
      if (isAuthMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: inputEmail, 
          password: authPassword 
        });
        
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            addToast("ERRO: Sua conta existe mas não foi confirmada. Mude 'ENABLE_EMAIL_AUTOCONFIRM' para 'true' no EasyPanel!", "error");
            throw new Error("E-mail não confirmado no servidor.");
          }
          throw error;
        }
        
        if (data.user) handleSetUser(data.user);
        addToast("Bem-vindo ao Portal!");

      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: inputEmail, 
          password: authPassword, 
          options: { data: { full_name: authName } } 
        });
        
        if (error) throw error;

        if (data.user && data.session) {
           handleSetUser(data.user);
           addToast("Cadastro realizado e logado!");
        } else {
           addToast("Cadastro pendente! Mude 'ENABLE_EMAIL_AUTOCONFIRM' para 'true' no seu painel para liberar!", "error");
        }
      }
    } catch (e: any) {
      addToast(e.message || "Erro na conexão com o Supabase", "error");
      console.error("Erro detalhado:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.title) return addToast("Preencha o título", "error");

    const payload = { 
      title: materialForm.title, 
      type: materialForm.type, 
      category: materialForm.category, 
      description: materialForm.description, 
      image_url: materialForm.imageUrl, 
      video_url: materialForm.videoUrl, 
      gradient: materialForm.gradient || getRandomGradient() 
    };

    try {
      const { error } = isEditing && materialForm.id 
        ? await supabase.from('materials').update(payload).eq('id', materialForm.id)
        : await supabase.from('materials').insert([payload]);
      
      if (error) throw error;
      addToast("Salvo com sucesso!");
      setIsEditing(false);
      setMaterialForm({ title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: '' });
      fetchData();
    } catch (e: any) {
      addToast("Erro no banco: " + e.message, "error");
    }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  if (isAppInit) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" size={32} /></div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden">
        <div className="glass max-w-sm w-full p-10 rounded-[3rem] text-center space-y-8 relative z-10 border border-white/10 shadow-3xl">
          <div className="space-y-2">
            <ShieldCheck size={52} className="mx-auto text-purple-500 mb-2 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            <h1 className="text-3xl font-black text-gradient-primary tracking-tighter uppercase">VITALÍCIO</h1>
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[5px]">Membro Premium</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-3 text-left">
            {isAuthMode === 'register' && (
              <input type="text" placeholder="Nome" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 focus:border-purple-500 transition-all text-[11px] font-bold" required />
            )}
            <input type="email" placeholder="E-mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 focus:border-purple-500 transition-all text-[11px] font-bold" required />
            <input type="password" placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 focus:border-purple-500 transition-all text-[11px] font-bold" required />
            <button type="submit" disabled={isLoading} className="w-full py-4.5 bg-gradient-primary font-black uppercase text-[10px] tracking-widest rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-95 disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : isAuthMode === 'login' ? 'Entrar Agora' : 'Cadastrar'}
            </button>
          </form>

          <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')} className="text-[9px] text-gray-500 hover:text-white transition-colors uppercase font-black tracking-widest block w-full">
            {isAuthMode === 'login' ? 'Criar nova conta' : 'Já sou membro'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-white/10 p-6 flex flex-col gap-8 glass z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-primary rounded-xl shadow-lg"><Layers size={20}/></div>
          <h2 className="text-lg font-black text-gradient-primary tracking-tighter">VITALÍCIO</h2>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
          <button onClick={() => setActiveCategory('Todos')} className={`w-full text-left px-4 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' ? 'bg-purple-600 shadow-xl text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>Tudo</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)} className={`w-full text-left px-4 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-purple-600 shadow-xl text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>{c}</button>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-black text-[11px] shadow-lg">{currentUser.name?.[0] || 'U'}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black truncate">{currentUser.name}</p>
              <p className="text-[7px] uppercase font-black text-gray-600 tracking-widest">{currentUser.isAdmin ? 'Admin' : 'Elite'}</p>
            </div>
          </div>
          <button onClick={() => { 
            localStorage.removeItem('portal_admin_bypass');
            supabase.auth.signOut(); 
            setCurrentUser(null); 
          }} className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-widest border border-red-500/10 hover:bg-red-500 hover:text-white transition-all"><LogOut size={12} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-10">
        {currentUser.isAdmin ? (
          <div className="max-w-6xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-8">
              <div>
                <h1 className="text-4xl font-black tracking-tighter">Administração</h1>
              </div>
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                <button onClick={() => setAdminTab('conteudo')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${adminTab === 'conteudo' ? 'bg-purple-600 text-white shadow-xl' : 'text-gray-500'}`}>Módulos</button>
                <button onClick={() => setAdminTab('vitrine')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${adminTab === 'vitrine' ? 'bg-orange-600 text-white shadow-xl' : 'text-gray-500'}`}>Design</button>
              </div>
            </header>

            {adminTab === 'conteudo' ? (
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <div className="glass-card p-8 rounded-3xl border border-white/10 sticky top-5 shadow-3xl">
                    <form onSubmit={handleSaveMaterial} className="space-y-4">
                      <input type="text" placeholder="Nome do Curso" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-[11px] font-bold" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={materialForm.type} onChange={e => setMaterialForm({...materialForm, type: e.target.value as MaterialType})} className="bg-black p-4 rounded-xl border border-white/10 text-[8px] font-black uppercase">
                          <option value="curso">VÍDEO</option>
                          <option value="ebook">PDF</option>
                        </select>
                        <select value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})} className="bg-black p-4 rounded-xl border border-white/10 text-[8px] font-black uppercase">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <input type="text" placeholder="URL da Imagem" value={materialForm.imageUrl} onChange={e => setMaterialForm({...materialForm, imageUrl: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-[11px] font-bold" />
                      <input type="text" placeholder="URL de Destino" value={materialForm.videoUrl} onChange={e => setMaterialForm({...materialForm, videoUrl: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-[11px] font-bold" />
                      <textarea placeholder="Descrição..." value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 h-24 text-[11px]" />
                      <button type="submit" className="w-full py-4.5 rounded-2xl bg-gradient-primary font-black uppercase tracking-[4px] text-[10px] shadow-2xl">
                        {isEditing ? 'Atualizar' : 'Publicar'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <div className="glass-card rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto scrollbar-hide">
                      {items.map(item => (
                        <div key={item.id} className="p-6 flex items-center gap-6 hover:bg-white/[0.02] transition-all">
                          <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover border border-white/10" alt="" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black truncate">{item.title}</h4>
                            <span className="text-[7px] uppercase font-black text-gray-600 tracking-widest">{item.category}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setIsEditing(true); setMaterialForm(item); }} className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg"><Edit3 size={14}/></button>
                            <button onClick={async () => { if(confirm('Excluir?')) { await supabase.from('materials').delete().eq('id', item.id); fetchData(); addToast('Removido'); } }} className="p-2.5 bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto glass-card p-10 rounded-[2.5rem] border border-white/10 space-y-6">
                 <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">Layout da Página</h3>
                 <div className="space-y-4">
                    <input value={settings.heroTitle} onChange={e => setSettings({...settings, heroTitle: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 font-black text-lg" placeholder="Título Hero" />
                    <button onClick={async () => {
                         const currentSettings = (await supabase.from('settings').select('id').maybeSingle()).data;
                         const { error } = await supabase.from('settings').upsert({ 
                           id: currentSettings?.id || undefined, 
                           hero_title: settings.heroTitle, 
                           hero_subtitle: settings.heroSubtitle, 
                           hero_image_url: settings.heroImageUrl
                         });
                         if(error) addToast('Erro no banco', 'error');
                         else addToast('Atualizado!');
                       }} className="w-full py-5 bg-orange-600 rounded-2xl font-black uppercase tracking-[4px] text-[10px]">Salvar Design</button>
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-16 animate-fade-in max-w-7xl mx-auto">
             <section className="relative p-10 md:p-20 rounded-[4rem] overflow-hidden shadow-4xl min-h-[500px] flex flex-col justify-center border border-white/5">
              <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[0.9] tracking-tighter whitespace-pre-wrap">{settings.heroTitle}</h1>
                <p className="text-white/60 font-medium mb-10 italic text-lg">"{settings.heroSubtitle}"</p>
                <a href="#vitrine" className="px-12 py-5 rounded-2xl bg-white text-black font-black uppercase text-[11px] tracking-[4px] shadow-xl hover:-translate-y-1 transition-all inline-block">ACESSAR CATÁLOGO</a>
              </div>
            </section>

            <div id="vitrine" className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {items.map(item => (
                  <div key={item.id} className="relative group">
                    <div className="relative glass-card rounded-[2rem] border border-white/5 overflow-hidden h-full flex flex-col hover:-translate-y-2 transition-all duration-300">
                      <div className="h-44 overflow-hidden"><img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" /></div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-md font-black mb-3 leading-tight">{item.title}</h3>
                        <p className="text-gray-500 text-[10px] line-clamp-2 mb-6">{item.description}</p>
                        <button onClick={() => setSelectedItem(item)} className="mt-auto p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-all font-black uppercase text-[9px] flex items-center justify-center gap-2">
                          ABRIR <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
           <div className="relative w-full max-w-4xl glass border border-white/10 rounded-[3rem] overflow-hidden p-8 md:p-12">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-3xl font-black tracking-tighter">{selectedItem.title}</h2>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-red-500/20 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <div className="aspect-video w-full rounded-2xl bg-gray-950 flex flex-col items-center justify-center gap-4 border border-white/5 shadow-2xl">
                 <a href={selectedItem.videoUrl} target="_blank" className="p-8 rounded-full bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600 transition-all">
                   {selectedItem.type === 'curso' ? <PlayCircle size={48} fill="white" /> : <Book size={48} fill="white" />}
                 </a>
                 <p className="text-[9px] font-black uppercase tracking-[4px] text-white/40">Clique para abrir o material oficial</p>
              </div>
              <p className="mt-8 text-gray-400 leading-relaxed text-sm italic">"{selectedItem.description}"</p>
           </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 space-y-3 z-[200] max-w-xs">
        {toasts.map(t => (
          <div key={t.id} className={`px-6 py-4 rounded-xl text-[10px] font-black shadow-4xl animate-slide-in flex items-center gap-3 border ${t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'} backdrop-blur-xl`}>
            {t.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>} 
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
