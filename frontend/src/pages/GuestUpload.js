import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, UploadSimple, CheckCircle, ImageSquare, VideoCamera, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function GuestUpload() {
  const { slug } = useParams();
  const [wedding, setWedding] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState([]); // {file, id, status}
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState("");
  const [msgSent, setMsgSent] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get(`/public/wedding/${slug}`).then(({ data }) => setWedding(data)).catch(() => setNotFound(true));
  }, [slug]);

  const addFiles = (list) => {
    const arr = Array.from(list).map((file) => ({ file, id: Math.random().toString(36).slice(2), status: "pending" }));
    setFiles((prev) => [...prev, ...arr]);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const uploadAll = async () => {
    if (!files.length) { toast.error("Choose at least one photo or video"); return; }
    setUploading(true);
    let success = 0;
    for (const item of files) {
      if (item.status === "done") { success++; continue; }
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("guest_name", guestName);
      try {
        await api.post(`/public/wedding/${slug}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "done" } : f)));
        success++;
      } catch (e) {
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error" } : f)));
        toast.error(formatApiError(e.response?.data?.detail));
      }
    }
    setUploading(false);
    if (success > 0) {
      if (message.trim() && !msgSent) await sendMessage(true);
      setDone(true);
    }
  };

  const sendMessage = async (silent = false) => {
    if (!message.trim()) return;
    try {
      await api.post(`/public/wedding/${slug}/message`, { guest_name: guestName, text: message });
      setMsgSent(true);
      if (!silent) toast.success("Your wish has been sent");
    } catch (e) {
      if (!silent) toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const reset = () => { setFiles([]); setDone(false); setMessage(""); setMsgSent(false); };

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-wed-bg px-6 text-center">
        <Heart weight="fill" className="text-wed-gold mb-4" size={40} />
        <h1 className="font-serif text-3xl">Gallery not found</h1>
        <p className="text-wed-text2 mt-2">This wedding link is invalid or has been removed.</p>
      </div>
    );
  }

  if (!wedding) {
    return <div className="min-h-screen flex items-center justify-center bg-wed-bg">
      <div className="w-10 h-10 rounded-full border-2 border-wed-gold border-t-transparent animate-spin" /></div>;
  }

  const dateStr = wedding.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-wed-bg px-6 text-center relative">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <CheckCircle weight="fill" className="text-wed-gold mx-auto" size={72} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="font-serif text-4xl sm:text-5xl font-light mt-6">Thank you</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="text-wed-text2 mt-3 max-w-sm">
          Your memories are now part of {wedding.bride_name} &amp; {wedding.groom_name}'s gallery. They'll treasure them forever.
        </motion.p>
        <Button data-testid="upload-more" onClick={reset}
          className="mt-8 rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-8 h-12">
          Share more memories
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wed-bg px-5 py-10 relative">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-wed-goldLight px-4 py-1.5 text-xs tracking-widest uppercase text-wed-gold mb-5">
            <Heart weight="fill" size={13} /> The Wedding of
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[1.05] tracking-tight" data-testid="couple-names">
            {wedding.bride_name}
            <span className="block text-wed-gold italic text-3xl sm:text-4xl my-1">&amp;</span>
            {wedding.groom_name}
          </h1>
          {dateStr && <p className="text-wed-text2 mt-4 tracking-wide">{dateStr}</p>}
          {wedding.venue && <p className="text-wed-muted text-sm mt-1">{wedding.venue}</p>}
        </motion.div>

        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5">
          <Input data-testid="guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name (optional)"
            className="rounded-full bg-white border-wed-line focus-visible:ring-wed-gold h-13 px-6 text-center h-12" />
        </motion.div>

        {/* Dropzone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          data-testid="dropzone"
          className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-colors duration-200 ${
            dragOver ? "border-wed-gold bg-wed-goldLight" : "border-wed-gold/30 bg-white/60"
          }`}>
          <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden"
            data-testid="file-input" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <div className="w-16 h-16 rounded-2xl bg-wed-goldLight mx-auto flex items-center justify-center mb-5">
            <UploadSimple weight="light" size={30} className="text-wed-gold" />
          </div>
          <p className="font-serif text-2xl">Tap to add photos &amp; videos</p>
          <p className="text-wed-muted text-sm mt-2">or drag them here — you can select many at once</p>
        </motion.div>

        {/* File previews */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-3 mt-5" data-testid="file-list">
              {files.map((f) => (
                <motion.div key={f.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-wed-goldLight border border-wed-line">
                  {f.file.type.startsWith("image/") ? (
                    <img src={URL.createObjectURL(f.file)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><VideoCamera size={28} className="text-wed-gold" /></div>
                  )}
                  <div className="absolute top-1.5 left-1.5">
                    {f.file.type.startsWith("image/")
                      ? <ImageSquare weight="fill" size={16} className="text-white drop-shadow" />
                      : <VideoCamera weight="fill" size={16} className="text-white drop-shadow" />}
                  </div>
                  {f.status === "done" && <div className="absolute inset-0 bg-wed-gold/40 flex items-center justify-center"><CheckCircle weight="fill" size={28} className="text-white" /></div>}
                  {f.status === "error" && <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center text-white text-xs">failed</div>}
                  {!uploading && f.status !== "done" && (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                      className="absolute top-1.5 right-1.5 bg-black/40 rounded-full p-1 text-white" data-testid={`remove-${f.id}`}>
                      <X size={12} weight="bold" />
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6">
          <Textarea data-testid="guest-message" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message for the couple (optional)…"
            className="rounded-3xl bg-white border-wed-line focus-visible:ring-wed-gold resize-none min-h-[90px] px-5 py-4" />
        </motion.div>

        {/* Upload button */}
        <div className="sticky bottom-4 mt-6 z-10">
          <Button data-testid="upload-submit" onClick={uploadAll} disabled={uploading}
            className="w-full rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-14 text-lg shadow-lg shadow-wed-gold/30">
            {uploading ? "Uploading…" : files.length ? `Share ${files.length} ${files.length === 1 ? "memory" : "memories"}` : "Share memories"}
            {!uploading && <PaperPlaneTilt weight="fill" className="ml-2" size={18} />}
          </Button>
        </div>

        <p className="text-center text-wed-muted text-xs mt-6 flex items-center justify-center gap-1.5">
          <Heart weight="fill" size={11} className="text-wed-gold" /> Powered by WedSnap
        </p>
      </div>
    </div>
  );
}
