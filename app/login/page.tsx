'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Stati per tutti i campi della tabella profili su Supabase
  const [nomeReale, setNomeReale] = useState('');
  const [cognome, setCognome] = useState('');
  const [dataDiNascita, setDataDiNascita] = useState('');
  const [citta, setCitta] = useState('');
  const [sesso, setSesso] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [ruolo, setRuolo] = useState<'utente' | 'volontario'>('utente');
  const [isRegistrazione, setIsRegistrazione] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  const gestisciInvia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessaggio('');
    setCaricamento(true);

    if (isRegistrazione) {
      // 1. Registrazione dell'utente su Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      
      if (authError) { 
        setMessaggio(authError.message); 
        setCaricamento(false); 
        return; 
      }
      
      if (authData?.user) {
        // 2. Inserimento di tutti i dati anagrafici nella tabella 'profili'
        const { error: profiloError } = await supabase.from('profili').insert([{ 
          id: authData.user.id, 
          nome_reale: nomeReale.trim(),
          cognome: cognome.trim(),
          data_di_nascita: dataDiNascita ? dataDiNascita : null,
          citta: citta.trim(),
          sesso: sesso,
          nickname: nickname.trim(),
          ruolo: ruolo, 
          approvato: ruolo !== 'volontario', 
          stato_online: 'offline' 
        }]);
        
        if (profiloError) { 
          setMessaggio(profiloError.message); 
          setCaricamento(false); 
          return; 
        }
        
        setMessaggio("Account creato con successo! Verificando l'accesso...");
        setCaricamento(false);
        setTimeout(() => router.push('/'), 1500);
      }
    } else {
      // Logica di Login standard
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setCaricamento(false);
      if (error) setMessaggio(error.message); else router.push('/');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 text-[#3a3026] font-sans relative overflow-hidden" style={{ backgroundColor: '#f7f4ed' }}>
      
      {/* Sfumature di sfondo morbide (Rifugio Relax) */}
      <div className="absolute rounded-full pointer-events-none" style={{ top: '-10%', left: '-5%', width: '65vw', height: '65vw', backgroundColor: 'rgba(245, 230, 202, 0.5)', filter: 'blur(120px)' }} />
      <div className="absolute rounded-full pointer-events-none" style={{ bottom: '-15%', right: '-5%', width: '60vw', height: '60vw', backgroundColor: 'rgba(230, 209, 186, 0.4)', filter: 'blur(120px)' }} />

      {/* Card Principale - Si allarga dinamicamente se mostriamo la registrazione */}
      <div className={`w-full ${isRegistrazione ? 'max-w-xl' : 'max-w-md'} bg-white/60 backdrop-blur-xl border border-black/5 p-8 rounded-[2.5rem] shadow-xl z-10 relative space-y-6 transition-all duration-300`}>
        
        {/* Tasto indietro */}
        <Link 
          href="/" 
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-[#52443a] transition-all active:scale-90 text-xs font-bold"
          title="Torna alla Home"
        >
          ✕
        </Link>

        <div className="text-center space-y-1 pt-2">
          <h2 className="text-3xl font-black tracking-tight text-[#2d251e]">
            {isRegistrazione ? 'Crea un profilo' : 'Bentornato'}
          </h2>
          <p className="text-sm text-[#615347] font-semibold">
            {isRegistrazione ? 'Inizia il tuo viaggio con noi' : 'Riprendi da dove hai lasciato'}
          </p>
        </div>

        <form onSubmit={gestisciInvia} className="space-y-4">
          {isRegistrazione && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Riga: Nome & Cognome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Nome</label>
                  <input 
                    type="text" required placeholder="Il tuo nome..." value={nomeReale} 
                    onChange={(e) => setNomeReale(e.target.value)} 
                    className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Cognome</label>
                  <input 
                    type="text" required placeholder="Il tuo cognome..." value={cognome} 
                    onChange={(e) => setCognome(e.target.value)} 
                    className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
                  />
                </div>
              </div>

              {/* Riga: Data Nascita & Città */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Data di Nascita</label>
                  <input 
                    type="date" required value={dataDiNascita} 
                    onChange={(e) => setDataDiNascita(e.target.value)} 
                    className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Città</label>
                  <input 
                    type="text" required placeholder="La tua città..." value={citta} 
                    onChange={(e) => setCitta(e.target.value)} 
                    className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
                  />
                </div>
              </div>

              {/* Riga: Sesso & Nickname Pubblico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Sesso</label>
                  <div className="relative">
                    <select 
                      required value={sesso} onChange={(e) => setSesso(e.target.value)} 
                      className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Seleziona...</option>
                      <option value="M">Maschio</option>
                      <option value="F">Femmina</option>
                      <option value="Altro">Altro</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-xs opacity-50">▼</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Nickname Pubblico</label>
                  <input 
                    type="text" required placeholder="Es. AnimaLibera99" value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                    className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
                  />
                </div>
              </div>

              {/* Scelta del Ruolo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Cosa farai nel rifugio?</label>
                <div className="relative">
                  <select 
                    value={ruolo} onChange={(e) => setRuolo(e.target.value as any)} 
                    className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all appearance-none cursor-pointer"
                  >
                    <option value="utente">Sono un utente (Cerco ascolto e supporto)</option>
                    <option value="volontario">Voglio fare il volontario (Offro ascolto e supporto)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-xs opacity-50">▼</div>
                </div>
              </div>

              <div className="border-t border-[#dfc9ae]/30 my-2" />
            </div>
          )}

          {/* Credenziali di Accesso standard (Email e Password sempre visibili) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Email</label>
            <input 
              type="email" required placeholder="Inserisci la tua email..." value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">Password</label>
            <input 
              type="password" required placeholder="Inserisci la tua password..." value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.2rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={caricamento}
            className="w-full mt-4 bg-[#ebd9c1] hover:bg-[#e4cea9] text-[#4a3928] font-black p-4 rounded-[2.5rem] shadow-sm border border-[#dfc9ae] transition-all active:scale-95 tracking-wider uppercase text-sm disabled:opacity-50"
          >
            {caricamento ? 'Elaborazione...' : isRegistrazione ? 'Registrati' : 'Accedi'}
          </button>
        </form>

        {messaggio && (
          <p className="text-center text-xs text-amber-900 font-bold bg-amber-500/10 py-2.5 px-4 rounded-xl border border-amber-500/20">
            {messaggio}
          </p>
        )}
        
        <p className="text-center text-xs text-[#6e5f51]/80 font-medium pt-2">
          {isRegistrazione ? 'Hai già un account?' : 'Non hai un account?'} {' '}
          <span 
            onClick={() => { setIsRegistrazione(!isRegistrazione); setMessaggio(''); }} 
            className="text-[#4a3928] font-bold underline cursor-pointer hover:opacity-80"
          >
            Clicca qui
          </span>
        </p>
      </div>
    </main>
  );
}