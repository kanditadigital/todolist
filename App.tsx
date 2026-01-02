
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Todo, Note, NoteTodo, FilterType, ViewMode, AdviceResponse, User, TeamMember, Category, TaskStatus } from './types';
import TodoItem, { getCountdown } from './components/TodoItem';
import ModernButton from './components/RetroButton';
import { getRetroAdvice, suggestTasks, generatePartyRole } from './services/geminiService';

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];

const statusColors: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-slate-500 border-slate-200',
  todo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'in-progress': 'bg-blue-50 text-blue-600 border-blue-100',
  review: 'bg-amber-50 text-amber-600 border-amber-100',
  done: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const COLOR_PALETTE: Record<string, { bg: string, text: string, accent: string, ring: string, lightBg: string }> = {
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', accent: 'bg-indigo-600', ring: 'ring-indigo-100', lightBg: 'bg-indigo-50' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', accent: 'bg-emerald-500', ring: 'ring-emerald-100', lightBg: 'bg-emerald-50' },
  rose: { bg: 'bg-rose-400', text: 'text-rose-600', accent: 'bg-rose-400', ring: 'ring-rose-100', lightBg: 'bg-rose-50' },
  amber: { bg: 'bg-amber-400', text: 'text-amber-600', accent: 'bg-amber-400', ring: 'ring-amber-100', lightBg: 'bg-amber-50' },
  sky: { bg: 'bg-sky-400', text: 'text-sky-600', accent: 'bg-sky-400', ring: 'ring-sky-100', lightBg: 'bg-sky-50' },
  violet: { bg: 'bg-violet-400', text: 'text-violet-600', accent: 'bg-violet-400', ring: 'ring-violet-100', lightBg: 'bg-violet-50' },
  slate: { bg: 'bg-slate-400', text: 'text-slate-600', accent: 'bg-slate-400', ring: 'ring-slate-100', lightBg: 'bg-slate-100' },
};

const App: React.FC = () => {
  // SIMULATED "CLOUD" PERSISTENCE
  const [globalWorkspaces, setGlobalWorkspaces] = useState<Category[]>(() => {
    const saved = localStorage.getItem('flow-v17-global-workspaces');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalTodos, setGlobalTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('flow-v17-global-todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalNotes, setGlobalNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('flow-v17-global-notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('flow-v17-user');
    return saved ? JSON.parse(saved) : null;
  });

  // UI States
  const [inputText, setInputText] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [previewNoteId, setPreviewNoteId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('indigo');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | 'Dashboard'>('Dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [teamEmail, setTeamEmail] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'account'>('home');

  // Persistence to LocalStorage (acting as our cloud)
  useEffect(() => {
    localStorage.setItem('flow-v17-global-workspaces', JSON.stringify(globalWorkspaces));
    localStorage.setItem('flow-v17-global-todos', JSON.stringify(globalTodos));
    localStorage.setItem('flow-v17-global-notes', JSON.stringify(globalNotes));
    localStorage.setItem('flow-v17-user', JSON.stringify(user));
  }, [globalWorkspaces, globalTodos, globalNotes, user]);

  // DERIVED: workspaces accessible to current user
  const userWorkspaces = useMemo(() => {
    if (!user) return [];
    return globalWorkspaces.filter(ws => 
      ws.ownerEmail === user.email || ws.members.includes(user.email)
    );
  }, [globalWorkspaces, user]);

  const activeWorkspace = useMemo(() => {
    return userWorkspaces.find(ws => ws.id === activeWorkspaceId);
  }, [userWorkspaces, activeWorkspaceId]);

  const activeColor = useMemo(() => {
    if (activeWorkspaceId === 'Dashboard' || mobileTab === 'account') return COLOR_PALETTE.indigo;
    return COLOR_PALETTE[activeWorkspace?.color || 'indigo'];
  }, [activeWorkspace, activeWorkspaceId, mobileTab]);

  // LOGIN MOCKING
  const handleMockLogin = (email: string) => {
    const namePart = email.split('@')[0];
    setUser({
      id: crypto.randomUUID(),
      email: email,
      name: namePart.charAt(0).toUpperCase() + namePart.slice(1) + " Manager",
      picture: `https://ui-avatars.com/api/?name=${namePart}&background=6366f1&color=fff`
    });
    setMobileTab('home');
    setActiveWorkspaceId('Dashboard');
  };

  const handleAddWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !user) return;
    const newWs: Category = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      color: newCategoryColor,
      ownerEmail: user.email,
      members: []
    };
    setGlobalWorkspaces(prev => [...prev, newWs]);
    setNewCategoryName('');
    setIsCreatingCategory(false);
    setActiveWorkspaceId(newWs.id);
  };

  const handleDeleteWorkspace = (id: string) => {
    const ws = globalWorkspaces.find(x => x.id === id);
    if (!ws || ws.ownerEmail !== user?.email) {
      alert("Only the owner can delete this workspace.");
      return;
    }
    if (confirm("Permanently archive this workspace and all internal assets?")) {
      setGlobalWorkspaces(prev => prev.filter(x => x.id !== id));
      setGlobalTodos(prev => prev.filter(x => x.workspaceId !== id));
      setGlobalNotes(prev => prev.filter(x => x.workspaceId !== id));
      setActiveWorkspaceId('Dashboard');
    }
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || activeWorkspaceId === 'Dashboard') return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: inputText.trim(),
      workspaceId: activeWorkspaceId,
      completed: taskStatus === 'done',
      status: taskStatus,
      createdAt: Date.now(),
      deadline: taskDeadline ? new Date(taskDeadline).getTime() : undefined,
      assignedTo: taskAssignee || undefined
    };
    setGlobalTodos(prev => [newTodo, ...prev]);
    setInputText('');
    setTaskAssignee('');
    setTaskStatus('todo');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || activeWorkspaceId === 'Dashboard') return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      items: [],
      workspaceId: activeWorkspaceId,
      completed: false,
      status: 'todo',
      createdAt: Date.now(),
    };
    setGlobalNotes(prev => [newNote, ...prev]);
    setNoteTitle('');
    setNoteContent('');
  };

  const handleAddMemberToWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamEmail.trim() || !teamEmail.includes('@') || !activeWorkspace) return;
    const emailToAdd = teamEmail.trim().toLowerCase();
    if (activeWorkspace.members.includes(emailToAdd) || activeWorkspace.ownerEmail === emailToAdd) {
      alert("User already has access.");
      return;
    }
    setGlobalWorkspaces(prev => prev.map(ws => 
      ws.id === activeWorkspaceId ? { ...ws, members: [...ws.members, emailToAdd] } : ws
    ));
    setTeamEmail('');
  };

  const handleToggleTodo = useCallback((id: string) => {
    setGlobalTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, status: !t.completed ? 'done' : 'todo' } : t));
  }, []);

  const handleDeleteTodo = useCallback((id: string) => {
    setGlobalTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleStatusChange = (id: string, status: TaskStatus) => {
    setGlobalTodos(prev => prev.map(t => t.id === id ? { ...t, status, completed: status === 'done' } : t));
  };

  const filteredItems = useMemo(() => {
    if (activeWorkspaceId === 'Dashboard') return { todos: [], notes: [] };
    const wsTodos = globalTodos.filter(t => t.workspaceId === activeWorkspaceId);
    const wsNotes = globalNotes.filter(n => n.workspaceId === activeWorkspaceId);
    const filterFn = (item: { completed: boolean }) => {
      if (filter === 'all') return true;
      if (filter === 'active') return !item.completed;
      if (filter === 'completed') return item.completed;
      return true;
    };
    return { todos: wsTodos.filter(filterFn), notes: wsNotes.filter(filterFn) };
  }, [globalTodos, globalNotes, filter, activeWorkspaceId]);

  const workspaceStats = useMemo(() => {
    return userWorkspaces.map(ws => {
      const wsTodos = globalTodos.filter(t => t.workspaceId === ws.id);
      const wsNotes = globalNotes.filter(n => n.workspaceId === ws.id);
      const total = wsTodos.length + wsNotes.length;
      const done = wsTodos.filter(t => t.completed).length + wsNotes.filter(n => n.completed).length;
      return { ...ws, total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [userWorkspaces, globalTodos, globalNotes]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-8 transform rotate-3">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">TaskFlow</h1>
            <p className="text-slate-500 font-medium">Modern collaborative task management.</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => handleMockLogin('admin@taskflow.com')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95">Login as Admin</button>
            <button onClick={() => handleMockLogin('user@taskflow.com')} className="w-full bg-white border-2 border-slate-100 text-indigo-600 font-bold py-4 rounded-2xl transition-all shadow-sm active:scale-95">Login as User</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans pb-24 lg:pb-0">
      {/* Header */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveWorkspaceId('Dashboard'); setMobileTab('home'); }}>
          <div className={`w-10 h-10 ${activeColor.bg} rounded-2xl flex items-center justify-center transform -rotate-6 shadow-xl transition-all`}>
             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter">TaskFlow</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-slate-900 leading-none">{user.name}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user.email}</span>
           </div>
           <img src={user.picture} alt="profile" className="w-10 h-10 rounded-2xl border-2 border-slate-50 shadow-sm" />
           <button onClick={() => setUser(null)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {mobileTab === 'account' ? (
          /* NETWORK / ACCOUNT SWITCHER TAB */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
             <header className="space-y-1">
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">Personnel Network</h2>
               <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Collaborator Management</p>
            </header>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
               <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Simulate Network Context</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Switch accounts to test collaboration features. Workspaces shared by one user will appear for others if they are in the membership network.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {['admin@taskflow.com', 'user@taskflow.com', 'collaborator@taskflow.com', 'guest@taskflow.com'].map(e => (
                       <button key={e} onClick={() => handleMockLogin(e)} className={`p-5 rounded-3xl border-2 transition-all text-left ${user.email === e ? 'border-indigo-600 bg-indigo-50/30 shadow-md' : 'border-slate-50 hover:border-slate-200'}`}>
                          <p className="font-black text-slate-800 text-sm truncate">{e}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{user.email === e ? 'Currently Active' : 'Switch To'}</p>
                       </button>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        ) : activeWorkspaceId === 'Dashboard' ? (
          /* DASHBOARD: WORKSPACE LIST */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
            <header className="space-y-1">
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">Workspace Registry</h2>
               <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Your Private & Shared Hubs</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workspaceStats.map(stat => {
                const colors = COLOR_PALETTE[stat.color] || COLOR_PALETTE.indigo;
                const isOwner = stat.ownerEmail === user.email;
                return (
                  <div key={stat.id} onClick={() => { setActiveWorkspaceId(stat.id); setViewMode('tasks'); }} className="group bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer flex flex-col active:scale-[0.98]">
                    <div className="flex items-start justify-between mb-8">
                      <div className={`p-4 ${colors.bg} text-white rounded-2xl shadow-lg transition-all transform group-hover:rotate-6`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${isOwner ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                         {isOwner ? 'Owned' : `Guest of ${stat.ownerEmail.split('@')[0]}`}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-1 truncate">{stat.name}</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{stat.total} items • {stat.members.length + 1} personnel</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className={`text-[10px] font-black ${colors.text} uppercase tracking-widest`}>Sync Status</span>
                        <span className="text-lg font-black text-slate-900">{stat.percent}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                        <div className={`h-full ${colors.bg} transition-all duration-1000 shadow-lg`} style={{ width: `${stat.percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className={`flex flex-col p-6 rounded-[2.5rem] border-4 border-dashed transition-all group min-h-[220px] ${userWorkspaces.length === 0 ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                {isCreatingCategory || userWorkspaces.length === 0 ? (
                  <form onSubmit={handleAddWorkspace} className="h-full flex flex-col justify-center gap-6 p-2">
                    <input autoFocus type="text" placeholder="Workspace Name..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                      className="bg-white border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500 shadow-xl"
                    />
                    <div className="flex flex-wrap gap-2">
                       {Object.keys(COLOR_PALETTE).map(c => (
                         <button key={c} type="button" onClick={() => setNewCategoryColor(c)} className={`w-8 h-8 rounded-full ${COLOR_PALETTE[c].bg} ${newCategoryColor === c ? 'ring-4 ring-white shadow-lg scale-110' : 'opacity-40 hover:opacity-100'}`}/>
                       ))}
                    </div>
                    <div className="flex gap-3">
                      <ModernButton type="submit" className="flex-1 py-4">Create Hub</ModernButton>
                      {userWorkspaces.length > 0 && <ModernButton variant="secondary" onClick={() => setIsCreatingCategory(false)} className="flex-1">Cancel</ModernButton>}
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setIsCreatingCategory(true)} className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-indigo-600 transition-all">
                    <div className="p-6 rounded-3xl bg-slate-50 shadow-sm transition-all transform group-hover:-rotate-3"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></div>
                    <span className="font-black text-xs uppercase tracking-widest">Deploy Private Hub</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* WORKSPACE DETAIL: TASKS & VAULT */
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right duration-500">
             <div className="overflow-x-auto no-scrollbar flex items-center gap-3 pb-2 -mx-6 px-6">
                <button onClick={() => { setActiveWorkspaceId('Dashboard'); setMobileTab('home'); }} className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>Hubs
                </button>
                {userWorkspaces.map(ws => (
                    <button key={ws.id} onClick={() => setActiveWorkspaceId(ws.id)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${activeWorkspaceId === ws.id ? `${COLOR_PALETTE[ws.color].bg} border-transparent text-white shadow-xl` : 'bg-white border-slate-100 text-slate-400'}`}>{ws.name}</button>
                ))}
             </div>

             <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/30">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-4 bg-white shadow-xl ${activeColor.text} rounded-2xl transform rotate-3 shrink-0`}><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg></div>
                      <div className="min-w-0">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1 truncate">{activeWorkspace?.name}</h2>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${activeColor.text}`}>{activeWorkspace?.ownerEmail === user.email ? 'Owned Repository' : 'Collaborator Access'}</span>
                      </div>
                   </div>
                   <div className="flex bg-slate-100/50 p-1.5 rounded-2xl shrink-0">
                      <button onClick={() => setViewMode('tasks')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${viewMode === 'tasks' ? 'bg-white shadow-md ' + activeColor.text : 'text-slate-400'}`}>Tasks</button>
                      <button onClick={() => setViewMode('notes')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${viewMode === 'notes' ? 'bg-white shadow-md ' + activeColor.text : 'text-slate-400'}`}>Vault</button>
                   </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                   {/* NETWORK MANAGEMENT WITHIN WORKSPACE */}
                   {activeWorkspace?.ownerEmail === user.email && (
                     <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Operational Access List</h3>
                        <form onSubmit={handleAddMemberToWorkspace} className="flex flex-col sm:flex-row gap-3">
                           <input type="email" value={teamEmail} onChange={(e) => setTeamEmail(e.target.value)} placeholder="Personnel Email..." className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none shadow-sm focus:border-indigo-100"/>
                           <button type="submit" className={`${activeColor.bg} text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all`}>Authorize</button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                           {activeWorkspace.members.map(m => (
                             <div key={m} className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 shadow-sm flex items-center gap-2">
                                {m} <button onClick={() => setGlobalWorkspaces(prev => prev.map(ws => ws.id === activeWorkspaceId ? { ...ws, members: ws.members.filter(x => x !== m) } : ws))} className="text-rose-400 font-black">×</button>
                             </div>
                           ))}
                           {activeWorkspace.members.length === 0 && <p className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest px-1">Private hub: no external members</p>}
                        </div>
                     </div>
                   )}

                   {viewMode === 'tasks' ? (
                     <div className="space-y-6">
                        <form onSubmit={handleAddTodo} className={`${activeColor.lightBg} p-6 rounded-3xl border border-slate-50 space-y-5 shadow-inner`}>
                           <div className="flex flex-col sm:flex-row gap-3">
                              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Objective identifier..." className="flex-1 bg-white p-4 rounded-2xl text-sm font-bold outline-none shadow-sm"/>
                              <button type="submit" className={`${activeColor.bg} text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all`}>Deploy</button>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Assignee</label>
                                 <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="w-full bg-white p-3 rounded-xl text-xs font-bold border-none shadow-sm outline-none">
                                    <option value="">Self (Managed)</option>
                                    <option value={activeWorkspace?.ownerEmail}>{activeWorkspace?.ownerEmail} (Owner)</option>
                                    {activeWorkspace?.members.map(m => <option key={m} value={m}>{m}</option>)}
                                 </select>
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Lifecycle</label>
                                 <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as TaskStatus)} className="w-full bg-white p-3 rounded-xl text-xs font-bold border-none shadow-sm outline-none">
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                 </select>
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Deadline</label>
                                 <input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} className="w-full bg-white p-3 rounded-xl text-xs font-bold border-none shadow-sm outline-none"/>
                              </div>
                           </div>
                        </form>
                        <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-50 overflow-hidden shadow-sm">
                           {filteredItems.todos.length === 0 ? <p className="py-24 text-center text-[10px] font-black uppercase text-slate-200 tracking-[0.2em]">Repository clear</p> : 
                             filteredItems.todos.map(t => <TodoItem key={t.id} todo={t} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onStatusChange={handleStatusChange} />)}
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <form onSubmit={handleAddNote} className={`${activeColor.lightBg} p-6 rounded-3xl border border-slate-50 space-y-4 shadow-inner`}>
                           <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Vault Asset Title..." className="w-full bg-white p-4 rounded-2xl text-sm font-bold outline-none shadow-sm"/>
                           <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Contextual documentation..." className="w-full bg-white p-5 rounded-2xl text-sm outline-none shadow-sm min-h-[140px] resize-none" />
                           <button type="submit" className={`${activeColor.bg} text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest w-full active:scale-[0.99] transition-all`}>Commit to Archive</button>
                        </form>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {filteredItems.notes.map(n => (
                             <div key={n.id} onClick={() => setPreviewNoteId(n.id)} className="bg-white border-2 border-slate-50 p-7 rounded-3xl hover:border-indigo-100 hover:shadow-xl transition-all cursor-pointer shadow-sm group relative">
                                <h4 className="font-black text-slate-800 mb-2 group-hover:text-indigo-600 truncate pr-4">{n.title}</h4>
                                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-medium">"{n.content || 'Documentation empty...'}"</p>
                                <div className="mt-6 flex justify-end">
                                   <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Modified: {new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                   
                   {activeWorkspace?.ownerEmail === user.email && (
                     <div className="pt-10 flex justify-center">
                        <button onClick={() => handleDeleteWorkspace(activeWorkspace.id)} className="text-[10px] font-black text-rose-300 uppercase tracking-widest hover:text-rose-500 transition-colors">Terminate Workspace Context</button>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Navigation Layer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-6 pb-safe bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-between shadow-2xl">
         <button onClick={() => { setMobileTab('home'); setActiveWorkspaceId('Dashboard'); }} className={`p-4 flex flex-col items-center gap-1 transition-all ${mobileTab === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Hubs</span>
         </button>
         <div className="relative -mt-10">
            <button onClick={() => { if (activeWorkspaceId === 'Dashboard') setIsCreatingCategory(true); else setViewMode(viewMode === 'tasks' ? 'notes' : 'tasks'); }} className={`w-16 h-16 ${activeColor.bg} rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl border-4 border-white transition-all transform rotate-6 active:scale-90 active:rotate-0`}>
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>
         </div>
         <button onClick={() => setMobileTab('account')} className={`p-4 flex flex-col items-center gap-1 transition-all ${mobileTab === 'account' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Network</span>
         </button>
      </div>
    </div>
  );
};

export default App;
