'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ChatProps {
  stanzaId: string;
  mioNome: string;
  onAbbandona: () => void;
}

interface Messaggio {
  id?: string;
  stanza_id: string;
  mittente: string;
  testo: string;
  created_at?: string;
}

export default function Chat({ stanzaId, mioNome, onAbbandona }: ChatProps) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [nuovoMessaggio, setNuovoMessaggio] = useState<string>('');
  const [nomeInterlocutore, setNomeInterlocutore] = useState<string>('Anima in attesa...');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!stanzaId) return;

    const scaricaDatiStanza = async () => {
      const { data, error } = await supabase
        .from('stanze')
        .select('utente_sfogo, utente_ascolto')
        .eq('id', stanzaId)
        .single();

      if (data && !error) {
        const interlocutore = data.utente_sfogo === mioNome ? data.utente_ascolto : data.utente_sfogo;
        if (interlocutore) setNomeInterlocutore(interlocutore);
      }
    };

    const caricaMessaggi = async () => {
      const { data, error } = await supabase
        .from('messaggi')
        .select('*')
        .eq('stanza_id', stanzaId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Errore nel caricamento dei messaggi:', error);
      } else if (data) {
        setMessaggi(data);
        const altro = data.find((m) => m.mittente !== mioNome);
        if (altro) setNomeInterlocutore(altro.mittente);
      }
    };

    scaricaDatiStanza();
    caricaMessaggi();

    const canaleMessaggi = supabase
      .channel(`room_${stanzaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messaggi', filter: `stanza_id=eq.${stanzaId}` },
        (payload: { new: Messaggio }) => {
          const arrivato = payload.new;
          setMessaggi((prev) => {
            if (arrivato.id && prev.some((m) => m.id === arrivato.id)) return prev;
            if (arrivato.mittente !== mioNome) {
              setNomeInterlocutore(arrivato.mittente);
            }
            return [...prev, arrivato];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canaleMessaggi);
    };
  }, [stanzaId, mioNome]);

  // MODIFICA APPLICATA: block: 'nearest' evita che il browser cerchi di scrollare 
  // l'intero contenitore genitore, limitandosi al contenitore dei messaggi.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messaggi]);

  const inviaMessaggio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nuovoMessaggio.trim() || !mioNome) return;

    const messaggioDaInviare = {
      stanza_id: stanzaId,
      mittente: mioNome,
      testo: nuovoMessaggio.trim()
    };

    setNuovoMessaggio('');

    const { error } = await supabase
      .from('messaggi')
      .insert([messaggioDaInviare]);

    if (error) {
      console.error("Errore durante l'invio:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-white/70 border border-black/5 rounded-[2rem] backdrop-blur-xl shadow-xl overflow-hidden">
      
      <div className="flex items-center justify-between p-4 border-b border-[#dfc9ae]/40 bg-white/80 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-[#6e5f51]/60 uppercase tracking-wider shrink-0">In chat con:</span>
          <span className="text-sm font-black text-[#3a3026] truncate">{nomeInterlocutore}</span>
        </div>
        <button 
          type="button"
          onClick={onAbbandona}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-800 text-xs font-bold px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm shrink-0"
        >
          Lascia 🚪
        </button>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white/10 custom-scrollbar">
        {messaggi.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#6e5f51]/40 text-xs italic text-center px-4">
            La stanza è silenziosa... Scrivi qualcosa per iniziare. 🌸
          </div>
        ) : (
          messaggi.map((msg, index) => {
            const sonoIo = msg.mittente === mioNome;
            return (
              <div key={msg.id || `msg-${index}`} className={`flex flex-col ${sonoIo ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-[#6e5f51]/50 mb-1 px-2 uppercase font-black tracking-wider">
                  {sonoIo ? 'Tu' : msg.mittente}
                </span>
                <div className={`max-w-[85%] p-3.5 rounded-[1.4rem] text-sm font-medium shadow-sm leading-relaxed ${
                  sonoIo 
                    ? 'bg-[#52443a] text-[#f7f4ed] rounded-tr-none' 
                    : 'bg-white text-[#332a24] rounded-tl-none border border-black/5'
                }`}>
                  {msg.testo}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-white/50 border-t border-[#dfc9ae]/40 shrink-0">
        <form onSubmit={inviaMessaggio} className="flex gap-2 items-center">
          <input
            type="text"
            value={nuovoMessaggio}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuovoMessaggio(e.target.value)}
            placeholder="Lascia uscire le parole..."
            className="flex-1 bg-white text-[#2d251e] rounded-full px-5 py-3 text-sm border border-[#dfc9ae] placeholder-[#6e5f51]/40 focus:outline-none focus:ring-2 focus:ring-[#dfc9ae] transition-all shadow-inner"
          />
          <button 
            type="submit" 
            className="bg-[#ebd9c1] hover:bg-[#e4cea9] border border-[#dfc9ae] text-[#4a3928] p-3 rounded-full shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center w-11 h-11 text-base"
          >
            ✨
          </button>
        </form>
      </div>
    </div>
  );
}