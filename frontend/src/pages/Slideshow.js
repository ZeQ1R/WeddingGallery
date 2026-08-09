import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, Pause, Play, CaretLeft, CaretRight } from "@phosphor-icons/react";
import api from "@/lib/api";
import { AuthedMedia } from "@/components/AuthedMedia";

const ADVANCE_MS = 5500;
const POLL_MS = 12000;

export default function Slideshow() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [wedding, setWedding] = useState(null);
  const [newest, setNewest] = useState(null);
  const timer = useRef(null);

  const loadWedding = useCallback(() => {
    api.get(`/public/wedding/${slug}`).then(({ data }) => setWedding(data)).catch(() => {});
  }, [slug]);

  const loadPhotos = useCallback(async () => {
    try {
      const { data } = await api.get(`/gallery/${slug}`, { params: { media_type: "photo" } });
      const ordered = [...data].reverse(); // oldest -> newest for a natural story
      setItems((prev) => {
        if (data.length && (!prev.length || prev[0]?.__latest !== data[0]?.id)) {
          setNewest(data[0]);
          setTimeout(() => setNewest(null), 4000);
        }
        ordered.__latest = data[0]?.id;
        return ordered;
      });
    } catch {}
  }, [slug]);

  useEffect(() => { loadWedding(); loadPhotos(); }, [loadWedding, loadPhotos]);
  useEffect(() => {
    const p = setInterval(loadPhotos, POLL_MS);
    return () => clearInterval(p);
  }, [loadPhotos]);

  useEffect(() => {
    if (!playing || items.length <= 1) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % items.length), ADVANCE_MS);
    return () => clearInterval(timer.current);
  }, [playing, items.length]);

  useEffect(() => { if (idx >= items.length) setIdx(0); }, [items.length, idx]);

  const go = (d) => { setIdx((i) => (i + d + items.length) % items.length); };
  const current = items[idx];

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none" data-testid="slideshow">
      {/* Media */}
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.id} className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <motion.div className="w-full h-full" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: ADVANCE_MS / 1000 + 1, ease: "linear" }}>
              <AuthedMedia uploadId={current.id} mediaType="photo" className="w-full h-full object-contain" />
            </motion.div>
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Heart weight="fill" size={44} className="text-wed-gold animate-pulse mb-4" />
            <p className="font-serif text-3xl text-white/80">Waiting for the first memory…</p>
            <p className="text-white/40 mt-2">Guest photos will appear here live.</p>
          </div>
        )}
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)} data-testid="slideshow-back"
          className="flex items-center gap-2 text-white/70 hover:text-white bg-white/10 backdrop-blur-md rounded-full px-4 py-2">
          <ArrowLeft size={18} /> Exit
        </button>
        {wedding && (
          <div className="text-center">
            <p className="text-wed-gold text-xs tracking-[0.3em] uppercase">Live gallery</p>
            <h1 className="font-serif text-3xl font-light leading-tight">{wedding.bride_name} <span className="text-wed-gold italic">&amp;</span> {wedding.groom_name}</h1>
          </div>
        )}
        <div className="w-20" />
      </div>

      {/* New photo toast */}
      <AnimatePresence>
        {newest && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-wed-gold text-white rounded-full px-5 py-2 text-sm shadow-lg flex items-center gap-2">
            <Heart weight="fill" size={14} /> New memory from {newest.guest_name}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 p-6 flex items-center justify-center gap-4 z-10">
        <button onClick={() => go(-1)} className="rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 p-3" data-testid="slide-prev"><CaretLeft size={22} /></button>
        <button onClick={() => setPlaying((p) => !p)} className="rounded-full bg-wed-gold hover:bg-wed-goldHover p-4" data-testid="slide-play">
          {playing ? <Pause weight="fill" size={22} /> : <Play weight="fill" size={22} />}
        </button>
        <button onClick={() => go(1)} className="rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 p-3" data-testid="slide-next"><CaretRight size={22} /></button>
        {items.length > 0 && <span className="absolute right-6 text-white/50 text-sm">{idx + 1} / {items.length}</span>}
      </div>

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="absolute bottom-24 inset-x-0 flex items-center justify-center gap-1.5 z-10">
          {items.slice(0, 20).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx % 20 ? "w-6 bg-wed-gold" : "w-1.5 bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
