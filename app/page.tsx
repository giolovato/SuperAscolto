'use client';

import { useState, useEffect } from 'react';
import { generaUsernameAnonimo } from '../utils/usernameGenerator';
import { supabase } from '../lib/supabase';
import Chat from '../components/Chat';
import Link from 'next/link';

export default function Home() {
  const [utenteLoggato, setUtenteLoggato] = useState<any>(null);
  const [profiloDb, setProfiloDb] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [ruolo, setRuolo] = useState<"sfogo" | "ascolto" | null>(null);
  const [usaNomeVero, setUsaNomeVero] = useState<boolean>(false);
  const [cercaVolontario, setCercaVolontario] = useState<boolean>(false);
  const [caricamento, setCaricamento] = useState<boolean>(false);
  const [stanzaId, setStanzaId] = useState<string | null>(null);
  const [nicknameMomentaneo, setNicknameMomentaneo] = useState<string>('');

  useEffect(() => {
    const controllaSessione = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUtenteLoggato(session.user);
        const { data: profilo } = await supabase.from('profili').select('*').eq('id', session.user.id).single();
        if (profilo) {
          setProfiloDb(profilo);
        }
      }
    };
    resettaStato();
    controllaSessione();
  }, []);

  const resettaStato = () => {
    setUsername(null);
    setRuolo(null);
    setStanzaId(null);
    setCaricamento(false);
    setCercaVolontario(false);
    setNicknameMomentaneo('');
  };

  const annullaRicerca = async () => {
    if (!username) return;
    setCaricamento(true);
    await supabase.from('presenze').delete().eq('username', username);
    supabase.removeAllChannels();
    resettaStato();
  };

  const avviaMatching = async (mioNome: string, mioRuolo: "sfogo" | "ascolto", richiedeVolontario: boolean) => {
    const ruoloOpposto = mioRuolo === 'sfogo' ? 'ascolto' : 'sfogo';
    
    const canalePresenze = supabase
      .channel('cambiamenti_stanze')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stanze' }, (payload: any) => {
        const stanza = payload.new;
        if (stanza.utente_sfogo === mioNome || stanza.utente_ascolto === mioNome) {
          setStanzaId(stanza.id);
        }
      })
      .subscribe();

    if (richiedeVolontario) {
      const { data: volontari } = await supabase
        .from('profili')
        .select('nickname')
        .ilike('ruolo', 'volontario')
        .limit(1);

      if (volontari && volontari.length > 0) {
        const partnerVolontario = volontari[0].nickname;
        const { data: nuovaStanza } = await supabase.from('stanze').insert([{ utente_sfogo: mioNome, utente_ascolto: partnerVolontario, attiva: true }]).select().single();
        if (nuovaStanza) { setStanzaId(nuovaStanza.id); return; }
      }
    } 
    
    const { data: candidati } = await supabase
      .from('presenze')
      .select('*')
      .eq('ruolo', ruoloOpposto)
      .eq('stato', 'in_attesa')
      .order('created_at', { ascending: true })
      .limit(1);

    if (candidati && candidati.length > 0) {
      const partner = candidati[0];
      
      const utenteSfogo = mioRuolo === 'sfogo' ? mioNome : partner.username;
      const utenteAscolto = mioRuolo === 'ascolto' ? mioNome : partner.username;

      const { data: nuovaStanza } = await supabase
        .from('stanze')
        .insert([{ utente_sfogo: utenteSfogo, utente_ascolto: utenteAscolto, attiva: true }])
        .select()
        .single();

      if (nuovaStanza) {
        await supabase.from('presenze').update({ stato: 'in_chat' }).eq('username', partner.username);
        await supabase.from('presenze').update({ stato: 'in_chat' }).eq('username', mioNome);
        setStanzaId(nuovaStanza.id);
        return;
      }
    }
  };

  const gestisciScelta = async (ruoloScelto: "sfogo" | "ascolto", opzioneVolontario: boolean = false) => {
    setCaricamento(true);
    setCercaVolontario(opzioneVolontario);
    
    let nomeFinale = "";
    
    if (ruoloScelto === 'ascolto') {
      nomeFinale = profiloDb?.nickname || utenteLoggato?.user_metadata?.nickname || utenteLoggato?.email?.split('@')[0] || "Ascoltatore Registrato";
    } else {
      if (utenteLoggato) {
        nomeFinale = usaNomeVero && profiloDb?.nickname ? profiloDb.nickname : generaUsernameAnonimo('sfogo');
      } else {
        nomeFinale = nicknameMomentaneo.trim() !== '' ? nicknameMomentaneo.trim() : generaUsernameAnonimo('sfogo');
      }
    }
    
    const { error } = await supabase.from('presenze').insert([{ username: nomeFinale, ruolo: ruoloScelto, stato: 'in_attesa' }]);
    if (error) { setCaricamento(false); return; }
    
    setUsername(nomeFinale);
    setRuolo(ruoloScelto);
    setCaricamento(false);
    
    avviaMatching(nomeFinale, ruoloScelto, opzioneVolontario);
  };

  const eseguiLogout = async () => {
    await supabase.auth.signOut();
    setUtenteLoggato(null);
    setProfiloDb(null);
    resettaStato();
  };

  const isLoggato = !!utenteLoggato;
  const ruoloRealeDb = profiloDb?.ruolo ? profiloDb.ruolo.toLowerCase().trim() : 'utente';
  
  const isAscoltatore = ruoloRealeDb === 'ascoltatore' || ruoloRealeDb === 'ascolto';
  const isVolontario = ruoloRealeDb === 'volontario';
  const isUtenteRegistrato = ruoloRealeDb === 'utente' || !profiloDb?.ruolo;

  return (
    <main className="flex h-screen w-screen flex-col text-[#3a3026] font-sans relative overflow-hidden" style={{ backgroundColor: '#f7f4ed' }}>
      
      {/* Sfumature di sfondo ultra morbide */}
      <div className="absolute rounded-full pointer-events-none" style={{ top: '-10%', left: '-5%', width: '65vw', height: '65vw', backgroundColor: 'rgba(245, 230, 202, 0.6)', filter: 'blur(120px)' }} />
      <div className="absolute rounded-full pointer-events-none" style={{ bottom: '-15%', right: '-5%', width: '60vw', height: '60vw', backgroundColor: 'rgba(230, 209, 186, 0.5)', filter: 'blur(120px)' }} />
      <div className="absolute rounded-full pointer-events-none" style={{ top: '35%', left: '20%', width: '45vw', height: '45vw', backgroundColor: 'rgba(241, 233, 217, 0.7)', filter: 'blur(100px)' }} />

      {/* BARRA UTENTE SUPERIORE STABILE */}
      <header className="w-full flex justify-end p-6 z-50 shrink-0">
        {isLoggato ? (
          <div className="flex items-center gap-4 bg-white/40 backdrop-blur-xl border border-black/5 p-2 pl-4 rounded-[2rem] shadow-sm">
            <span className="text-sm font-semibold text-[#52443a]">
              {profiloDb?.nickname || 'Anima'} <span className="text-xs opacity-60">({ruoloRealeDb})</span>
            </span>
            <button onClick={eseguiLogout} className="bg-[#dfd5c6] hover:bg-[#d5caa9] text-[#52443a] text-xs font-bold px-4 py-2 rounded-[1.5rem] transition-all">Esci</button>
          </div>
        ) : (
          <Link href="/login" className="bg-[#ebd9c1] hover:bg-[#e4cea9] text-[#4a3928] text-sm font-bold px-6 py-3 rounded-[2rem] shadow-sm border border-[#dfc9ae] transition-all">
            Accedi / Registrati ✨
          </Link>
        )}
      </header>

      {/* CONTENITORE CENTRALE DINAMICO (Flessibile e protetto da altezze anomale) */}
      <div className="flex-1 w-full max-w-xl mx-auto px-4 pb-6 z-10 flex flex-col items-center justify-center overflow-hidden">
        
        {!stanzaId && (
          <div className="relative inline-block mb-4 shrink-0">
            <div className="absolute inset-0 bg-[#edd6ba] blur-2xl opacity-40" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-[#ebd8c0] to-[#dfc09b] rounded-[2rem] flex items-center justify-center border border-white/60 shadow-md">
              <span className="text-4xl">🧸</span>
            </div>
          </div>
        )}

        {/* STATO 1: SCELTA DEI BOTTONI */}
        {!username && !stanzaId ? (
          <div className="space-y-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-500 overflow-y-auto no-scrollbar py-2">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-black tracking-tight text-[#2d251e]">Benvenuto nel tuo rifugio.</h1>
              <p className="text-sm text-[#615347] font-semibold">Scegli come vuoi sentirti oggi.</p>
            </div>

            {!isLoggato && (
              <div className="w-full max-w-sm mx-auto bg-white/40 backdrop-blur-md p-4 rounded-[2rem] border border-black/5 shadow-sm space-y-2 text-left">
                <label className="text-xs font-bold text-[#52443a] uppercase tracking-wider block pl-1">
                  Scegli come chiamarti (Opzionale)
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={nicknameMomentaneo}
                  onChange={(e) => setNicknameMomentaneo(e.target.value)}
                  placeholder="Scrivi un nickname momentaneo..."
                  className="w-full bg-white/80 border border-[#dfc9ae] rounded-[1.5rem] px-4 py-2.5 text-sm font-medium text-[#2d251e] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all"
                />
                <p className="text-[10px] text-[#6e5f51]/70 italic pl-1">
                  Lascia vuoto se desideri che te ne assegniamo uno noi a caso ✨
                </p>
              </div>
            )}

            {isLoggato && !isAscoltatore && (
              <div className="bg-white/30 backdrop-blur-md p-1.5 rounded-[2rem] border border-black/5 flex items-center justify-between max-w-sm mx-auto shadow-sm">
                <span className="text-xs text-[#6e5f51] pl-4 font-bold uppercase tracking-widest">Identità Sfogo</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setUsaNomeVero(false)} className={`px-4 py-2 rounded-[1.2rem] text-xs font-black transition-all ${!usaNomeVero ? 'bg-white text-[#4a3928] shadow-sm' : 'text-[#2d251e]/40'}`}>ANONIMO</button>
                  <button type="button" onClick={() => setUsaNomeVero(true)} className={`px-4 py-2 rounded-[1.2rem] text-xs font-black transition-all ${usaNomeVero ? 'bg-white text-[#4a3928] shadow-sm' : 'text-[#2d251e]/40'}`}>NICKNAME</button>
                </div>
              </div>
            )}

            <div className="grid gap-3 w-full max-w-sm mx-auto">
              {!isLoggato && (
                <button 
                  onClick={() => gestisciScelta('sfogo')} 
                  disabled={caricamento}
                  className="w-full bg-white/50 hover:bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-black/5 transition-all active:scale-95 shadow-sm group text-center flex flex-col items-center justify-center disabled:opacity-50"
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💭</div>
                  <div className="text-sm font-black text-[#332a24]">
                    {nicknameMomentaneo.trim() !== '' ? `Entra come "${nicknameMomentaneo}"` : "Match Rapido a Caso"}
                  </div>
                  <div className="text-[10px] text-[#6e5f51]/60 uppercase font-bold mt-0.5">Entra subito senza account</div>
                </button>
              )}

              {isLoggato && isUtenteRegistrato && (
                <div className="space-y-3 w-full">
                  <button onClick={() => gestisciScelta('sfogo')} className="w-full bg-white/50 hover:bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-black/5 transition-all active:scale-95 shadow-sm group text-center flex flex-col items-center justify-center">
                    <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💬</div>
                    <div className="text-sm font-black text-[#332a24]">Match Rapido</div>
                    <div className="text-[10px] text-[#6e5f51]/60 uppercase font-bold mt-0.5">{usaNomeVero ? "Con il tuo Nickname" : "In Anonimo"}</div>
                  </button>
                  <button onClick={() => gestisciScelta('sfogo', true)} className="w-full bg-[#ebd9c1] hover:bg-[#e4cea9] p-4 rounded-[2rem] font-black text-[#4a3928] border border-[#dfc9ae] shadow-sm transition-all active:scale-95 text-xs tracking-wide">
                    🤝 PARLA CON UN VOLONTARIO VERO
                  </button>
                </div>
              )}

              {isLoggato && isAscoltatore && (
                <button onClick={() => gestisciScelta('ascolto')} className="w-full bg-white/50 hover:bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-black/5 transition-all active:scale-95 shadow-sm group text-center flex flex-col items-center justify-center">
                  <div className="text-2xl mb-1">🎧</div>
                  <div className="text-sm font-black text-[#332a24]">Avvia Ascolto Libero</div>
                  <div className="text-[10px] text-[#5c4936] font-bold uppercase mt-0.5">Offri supporto come ({profiloDb?.nickname || '...'}) 📝</div>
                </button>
              )}

              {isLoggato && isVolontario && (
                <div className="space-y-3 w-full">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => gestisciScelta('sfogo')} className="group bg-white/50 hover:bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-black/5 transition-all active:scale-95 shadow-sm text-center flex flex-col items-center justify-center">
                      <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💬</div>
                      <div className="text-sm font-black text-[#332a24]">Match Rapido</div>
                    </button>
                    <button onClick={() => gestisciScelta('ascolto')} className="group bg-white/50 hover:bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-black/5 transition-all active:scale-95 shadow-sm text-center flex flex-col items-center justify-center">
                      <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎧</div>
                      <div className="text-sm font-black text-[#332a24]">Ascolto Libero</div>
                    </button>
                  </div>
                  <button onClick={() => gestisciScelta('sfogo', true)} className="w-full bg-[#ebd9c1] hover:bg-[#e4cea9] p-4 rounded-[2rem] font-black text-[#4a3928] border border-[#dfc9ae] shadow-sm transition-all active:scale-95 text-xs tracking-wide">
                    🤝 PARLA CON UN VOLONTARIO VERO
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : !stanzaId ? (
          /* STATO 2: SCHERMATA DI ATTESA MATCH */
          <div className="space-y-6 py-4 w-full max-w-md animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
            <div className="space-y-1">
              <p className="text-[9px] text-[#6e5f51]/60 font-black uppercase tracking-[0.3em]">Sessione attiva come</p>
              <h2 className="text-3xl font-black text-[#2d251e]">{username}</h2>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#dfc09b] rounded-full blur-lg animate-pulse" />
                <div className="w-3 h-3 bg-[#5c4a36] rounded-full relative" />
              </div>
              <p className="text-xs text-[#52443a] italic px-8 leading-relaxed">
                {ruolo === 'ascolto' 
                  ? "Ti sei proposto come ascoltatore col tuo nickname. Aspettiamo un'anima che abbia bisogno di posare il suo zaino di pensieri..." 
                  : cercaVolontario 
                    ? "Un volontario certificato sta arrivando per ascoltare il tuo cuore..." 
                    : "In viaggio verso un'altra anima..."}
              </p>
            </div>
            <button onClick={annullaRicerca} className="mt-4 bg-black/5 hover:bg-black/10 text-[#6e5f51] border border-black/5 px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all">
              Annulla e torna indietro 🌸
            </button>
          </div>
        ) : (
          /* STATO 3: CHAT ATTIVA (Altezza blindata all'interno dello spazio rimanente dello schermo) */
          <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
            <Chat stanzaId={stanzaId} mioNome={username!} onAbbandona={resettaStato} />
          </div>
        )}
      </div>
    </main>
  );
}