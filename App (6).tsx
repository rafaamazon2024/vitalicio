
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
  const [isUploading, setIsUploading] = useState<'none' | 'image' | 'content' | 'hero'>('none');
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({
    title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: ''
  });

  const [toasts, setToasts] = useState<{id: string, message: string, type?: 'success' | 'error'}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id));
    }, 6000);
  };

  const fetchData = async () => {
    try {
      // Tentar buscar materiais
      const { data: mData, error: mError } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      
      if (mError) {
        if (mError.message.includes("policy")) {
          addToast("Erro de RLS: Execute o script SQL no painel do Supabase!", "error");
        }
        console.error("Erro Materials:", mError);
      } else {
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
      }

      // Tentar buscar configurações
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
      console.error("Erro fatal ao carregar dados:", e);
    }
  };

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleSetUser(session.user);
      setIsAppInit(false);
    });

    // Ouvir mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) handleSetUser(session.user);
      else if (event === 'SIGNED_OUT') setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetUser = (supabaseUser: any) => {
    const isAdmin = supabaseUser.email === 'admin@academia.com';
    setCurrentUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Membro Elite',
      email: supabaseUser.email || '',
      isAdmin: isAdmin
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Bypass para admin local (facilita o primeiro acesso)
    if (authEmail === 'admin@academia.com' && authPassword === 'admin123') {
      setCurrentUser({ id: 'admin-local', name: 'Admin Root', email: authEmail, isAdmin: true });
      addToast("Acesso Administrativo Liberado!");
      setIsLoading(false);
      return;
    }

    try {
      if (isAuthMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: authEmail, 
          password: authPassword 
        });
        
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            throw new Error("E-mail não confirmado! Vá em Auth > Providers no Supabase e desative 'Confirm Email'.");
          }
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("E-mail ou senha incorretos.");
          }
          throw error;
        }
        
        if (data.user) handleSetUser(data.user);
        addToast("Logado com sucesso!");

      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword, 
          options: { 
            data: { full_name: authName }
          } 
        });
        
        if (error) throw error;

        if (data.user && data.session) {
           handleSetUser(data.user);
           addToast("Conta criada e logada!");
        } else {
           addToast("Cadastro realizado! Verifique seu e-mail (ou desative a confirmação no painel).", "error");
        }
      }
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.title) return addToast("Título é obrigatório", "error");

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
      let error;
      if (isEditing && materialForm.id) {
        const res = await supabase.from('materials').update(payload).eq('id', materialForm.id);
        error = res.error;
      } else {
        const res = await supabase.from('materials').insert([payload]);
        error = res.error;
      }
      
      if (error) throw error;
      
      addToast("Salvo com sucesso!");
      setIsEditing(false);
      setMaterialForm({ title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: '' });
      fetchData();
    } catch (e: any) {
      addToast("Erro ao salvar: " + e.message, "error");
    }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  if (isAppInit) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" size={32} /></div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[180px] rounded-full animate-aurora"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/10 blur-[180px] rounded-full animate-aurora" style={{animationDelay: '-5s'}}></div>
        </div>

        <div className="glass max-w-sm w-full p-10 rounded-[3rem] text-center space-y-8 relative z-10 border border-white/10 shadow-3xl">
          <div className="space-y-2">
            <ShieldCheck size={52} className="mx-auto text-purple-500 mb-2 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            <h1 className="text-3xl font-black text-gradient-primary tracking-tighter uppercase">VITALÍCIO</h1>
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[5px]">Portal de Membros Elite</p>
          </div>
          
          <div className="space-y-4">
            <form onSubmit={handleAuth} className="space-y-3 text-left">
              {isAuthMode === 'register' && (
                <input type="text" placeholder="Seu Nome" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 focus:border-purple-500 transition-all text-[11px] font-bold" required />
              )}
              <input type="email" placeholder="E-mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 focus:border-purple-500 transition-all text-[11px] font-bold" required />
              <input type="password" placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 focus:border-purple-500 transition-all text-[11px] font-bold" required />
              <button type="submit" disabled={isLoading} className="w-full py-4.5 bg-gradient-primary font-black uppercase text-[10px] tracking-widest rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-95 disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : isAuthMode === 'login' ? 'Entrar no Portal' : 'Criar minha conta'}
              </button>
            </form>
          </div>

          <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')} className="text-[9px] text-gray-500 hover:text-white transition-colors uppercase font-black tracking-widest block w-full">
            {isAuthMode === 'login' ? 'Novo por aqui? Cadastre-se' : 'Já sou membro? Fazer Login'}
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
          <p className="text-[8px] font-black uppercase text-gray-700 tracking-[3px] mb-4 ml-2">Conteúdos</p>
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
              <p className="text-[7px] uppercase font-black text-gray-600 tracking-widest">{currentUser.isAdmin ? 'Administrador' : 'Elite'}</p>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); }} className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-widest border border-red-500/10 hover:bg-red-500 hover:text-white transition-all"><LogOut size={12} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-10 relative">
        {currentUser.isAdmin ? (
          <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-8">
              <div>
                <p className="text-purple-500 font-black uppercase tracking-[5px] text-[10px] mb-2">Painel de Gestão</p>
                <h1 className="text-4xl font-black tracking-tighter">Vitalício Admin</h1>
              </div>
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-lg backdrop-blur-xl">
                <button onClick={() => setAdminTab('conteudo')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'conteudo' ? 'bg-purple-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Conteúdo</button>
                <button onClick={() => setAdminTab('vitrine')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'vitrine' ? 'bg-orange-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Vitrine</button>
              </div>
            </header>

            {adminTab === 'conteudo' ? (
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <div className="glass-card p-8 rounded-3xl border border-white/10 sticky top-5 shadow-3xl">
                    <h3 className="text-sm font-black mb-8 flex items-center gap-3 uppercase text-purple-400">
                      {isEditing ? <Edit3 size={20}/> : <Plus size={20}/>} 
                      {isEditing ? 'Editar Material' : 'Cadastrar Material'}
                    </h3>
                    <form onSubmit={handleSaveMaterial} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Nome do Módulo</label>
                        <input type="text" placeholder="Ex: Método IP do Milhão" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-[11px] font-bold focus:border-purple-500 transition-all" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Formato</label>
                          <select value={materialForm.type} onChange={e => setMaterialForm({...materialForm, type: e.target.value as MaterialType})} className="w-full bg-black p-4 rounded-xl border border-white/10 font-black uppercase text-[8px] tracking-widest outline-none">
                            <option value="curso">Vídeo</option>
                            <option value="ebook">PDF</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Nicho</label>
                          <select value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})} className="w-full bg-black p-4 rounded-xl border border-white/10 font-black uppercase text-[8px] tracking-widest outline-none">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Link da Imagem (Mockup)</label>
                        <input type="text" value={materialForm.imageUrl} onChange={e => setMaterialForm({...materialForm, imageUrl: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-[11px] font-bold" placeholder="https://..." />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Link do Vídeo ou PDF</label>
                        <input type="text" value={materialForm.videoUrl} onChange={e => setMaterialForm({...materialForm, videoUrl: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-[11px] font-bold" placeholder="https://..." />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Descrição</label>
                        <textarea placeholder="Fale sobre o conteúdo..." value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full bg-white/5 p-4 rounded-xl outline-none border border-white/10 h-28 resize-none text-[11px] font-medium" />
                      </div>

                      <button type="submit" className="w-full py-4.5 rounded-2xl bg-gradient-primary font-black uppercase tracking-[4px] text-[10px] shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                        {isEditing ? 'Salvar Alteração' : 'Publicar Módulo'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <div className="glass-card rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center text-[10px] font-black uppercase text-gray-500 tracking-[3px]">
                      Catálogo <span className="bg-purple-600/20 px-3 py-1 rounded-full text-purple-400 border border-purple-500/10">{items.length} ITENS</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto scrollbar-hide">
                      {items.map(item => (
                        <div key={item.id} className="p-6 flex items-center gap-6 hover:bg-white/[0.02] transition-all group">
                          <img src={item.imageUrl} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-xl group-hover:scale-105 transition-transform shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black truncate tracking-tight mb-1">{item.title}</h4>
                            <span className="text-[7px] uppercase font-black text-gray-600 tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">{item.category}</span>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => { setIsEditing(true); setMaterialForm(item); }} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/10 shadow-lg"><Edit3 size={16}/></button>
                            <button onClick={async () => { if(confirm('Excluir?')) { await supabase.from('materials').delete().eq('id', item.id); fetchData(); addToast('Removido'); } }} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/10 shadow-lg"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto glass-card p-10 rounded-[2.5rem] border border-white/10 space-y-10 shadow-3xl">
                 <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <Monitor size={24} className="text-orange-500" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Design da Área do Aluno</h3>
                 </div>
                 <button onClick={async () => {
                         const currentSettings = (await supabase.from('settings').select('id').maybeSingle()).data;
                         const { error } = await supabase.from('settings').upsert({ 
                           id: currentSettings?.id || undefined, 
                           hero_title: settings.heroTitle, 
                           hero_subtitle: settings.heroSubtitle, 
                           hero_image_url: settings.heroImageUrl, 
                           hero_button_text: settings.heroButtonText, 
                           hero_button_link: settings.heroButtonLink,
                           hero_button_2_text: settings.heroButton2Text,
                           hero_button_2_link: settings.heroButton2Link
                         });
                         if(error) addToast('Erro ao atualizar vitrine', 'error');
                         else addToast('Layout atualizado com sucesso!');
                       }} className="w-full py-5 bg-orange-600 rounded-[1.5rem] font-black uppercase tracking-[4px] text-[11px] shadow-3xl hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all">Publicar Alterações</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-16 animate-fade-in max-w-7xl mx-auto">
             <section className="relative p-8 md:p-16 rounded-[3rem] overflow-hidden shadow-4xl min-h-[500px] flex flex-col justify-center group border border-white/5">
              <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] scale-105 group-hover:scale-115" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent"></div>
              <div className="relative z-10 max-w-3xl text-left">
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass border border-white/10 text-[9px] font-black uppercase tracking-[4px] mb-8 animate-aurora shadow-2xl">
                  <Star size={14} fill="#FACC15" className="text-yellow-400" /> Membro Premium Ativo
                </div>
                <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-[0.9] tracking-tighter text-white whitespace-pre-wrap drop-shadow-2xl">{settings.heroTitle}</h1>
                <p className="text-base lg:text-lg text-white/80 font-medium mb-10 leading-relaxed italic drop-shadow-xl max-w-xl opacity-90">"{settings.heroSubtitle}"</p>
                <div className="flex flex-wrap items-center gap-5">
                   <a href="#vitrine" className="px-10 py-4.5 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-[4px] hover:shadow-white/20 hover:shadow-2xl transition-all shadow-xl active:scale-95">{settings.heroButtonText}</a>
                </div>
              </div>
            </section>

            <div id="vitrine" className="space-y-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-10 bg-gradient-primary rounded-full"></div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase tracking-[2px]">Catálogo <span className="text-purple-500">Exclusivo</span></h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {items.length === 0 && (
                  <div className="col-span-full py-20 text-center glass rounded-3xl border border-dashed border-white/10">
                    <p className="text-gray-500 font-black uppercase tracking-[5px] text-[10px]">Nenhum material cadastrado ainda</p>
                  </div>
                )}
                {items.map((item, index) => (
                  <div key={item.id} className="relative group animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
                    <div className="relative glass-card rounded-[2rem] border border-white/5 overflow-hidden h-full flex flex-col hover:-translate-y-3 transition-all duration-500 shadow-2xl">
                      <div className="h-48 overflow-hidden relative">
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.title} />
                      </div>
                      <div className="p-8 flex flex-col flex-1">
                        <h3 className="text-lg font-black mb-4 tracking-tight group-hover:text-purple-400 transition-colors leading-tight">{item.title}</h3>
                        <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2 mb-8 italic opacity-70 font-medium">{item.description}</p>
                        <button onClick={() => setSelectedItem(item)} className="mt-auto p-4 bg-purple-600/10 text-purple-400 rounded-2xl hover:bg-purple-600 hover:text-white transition-all shadow-2xl border border-purple-500/10 active:scale-90 flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest">
                          Acessar <ArrowRight size={16} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
           <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={() => setSelectedItem(null)}></div>
           <div className="relative w-full max-w-5xl h-full max-h-[85vh] flex flex-col glass border border-white/10 rounded-[3rem] shadow-4xl overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-black/60 scrollbar-hide">
                 <div className="flex justify-between items-start mb-12">
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tighter leading-none">{selectedItem.title}</h2>
                    <button onClick={() => setSelectedItem(null)} className="p-3 bg-white/5 rounded-2xl hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/5"><X size={24} /></button>
                 </div>
                 
                 <div className="aspect-video w-full rounded-[2rem] bg-gray-950 overflow-hidden mb-12 border border-white/5 relative group shadow-3xl flex flex-col items-center justify-center gap-6">
                    <a href={selectedItem.videoUrl} target="_blank" className="p-12 rounded-full bg-purple-600/30 border border-purple-500/50 hover:bg-purple-600 hover:scale-110 transition-all shadow-4xl backdrop-blur-xl group/play">
                       {selectedItem.type === 'curso' ? <PlayCircle size={64} fill="white" /> : <Book size={64} fill="white" />}
                    </a>
                    <p className="text-[10px] font-black uppercase tracking-[5px] text-white/50">Clique acima para abrir o conteúdo</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 space-y-3 z-[200]">
        {toasts.map(t => (
          <div key={t.id} className={`px-6 py-4 rounded-2xl text-[10px] font-black shadow-4xl animate-slide-in border-l-4 flex items-center gap-4 ${t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-200' : 'bg-green-600/10 border-green-500 text-green-200'} backdrop-blur-2xl`}>
            {t.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle size={18}/>} 
            <p className="uppercase tracking-widest">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
