import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, UploadSimple, CheckCircle, ImageSquare, VideoCamera, PaperPlaneTilt, X, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { publicApi, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const PREVIEW_LIMIT = 24; // decoding hundreds of full-size photos crashes iOS Safari tabs
const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const IN_APP_UA = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Twitter/i;

const isImage = (file) => (file.type || "").startsWith("image/");

const revokePreview = (item) => {
  if (item && item.preview) {
    try {
      URL.revokeObjectURL(item.preview);
    } catch (e) {
      // ignore
    }
  }
};

const friendlyError = (e) => {
  if (!e || !e.response) return "Connection problem. Please check your internet and try again.";
  return formatApiError(e.response.data && e.response.data.detail);
};

export default function GuestUpload() {
  const { slug } = useParams();
  const [wedding, setWedding] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | notfound | blocked | error
  const [loadMsg, setLoadMsg] = useState("");
  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState([]); // {file, id, status, preview, previewFailed}
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState("");
  const [msgSent, setMsgSent] = useState(false);
  const [showInAppTip, setShowInAppTip] = useState(false);
  const filesRef = useRef([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      filesRef.current.forEach(revokePreview);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined" && IN_APP_UA.test(navigator.userAgent || "")) {
      setShowInAppTip(true);
    }
  }, []);

  const loadWedding = useCallback(() => {
    setLoadState("loading");
    publicApi
      .get(`/public/wedding/${slug}`)
      .then(({ data }) => {
        setWedding(data);
        setLoadState("ready");
      })
      .catch((e) => {
        const status = e && e.response ? e.response.status : 0;
        if (status === 404) {
          setLoadState("notfound");
        } else if (status === 403) {
          setLoadMsg(formatApiError(e.response.data && e.response.data.detail));
          setLoadState("blocked");
        } else {
          setLoadState("error");
        }
      });
  }, [slug]);

  useEffect(() => {
    loadWedding();
  }, [loadWedding]);

  const addFiles = (list) => {
    const picked = Array.from(list);
    let previewCount = files.filter((f) => f.preview).length;
    const added = picked.map((file) => {
      let preview = null;
      if (isImage(file) && previewCount < PREVIEW_LIMIT) {
        try {
          preview = URL.createObjectURL(file);
          previewCount += 1;
        } catch (e) {
          preview = null;
        }
      }
      return { file, id: Math.random().toString(36).slice(2), status: "pending", preview, previewFailed: false };
    });
    setFiles((prev) => [...prev, ...added]);
  };

  const onPick = (e) => {
    const list = e.target.files;
    if (list && list.length) addFiles(list);
    e.target.value = ""; // lets the guest pick the same photo again
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    revokePreview(files.find((f) => f.id === id));
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const setStatus = (id, status) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));

  const markPreviewFailed = (id) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, previewFailed: true } : f)));

  const sendMessage = async (silent = false) => {
    if (!message.trim()) return;
    try {
      await publicApi.post(`/public/wedding/${slug}/message`, { guest_name: guestName, text: message });
      setMsgSent(true);
      if (!silent) toast.success("Your wish has been sent");
    } catch (e) {
      if (!silent) toast.error(friendlyError(e));
    }
  };

  const uploadAll = async () => {
    if (!files.length) {
      toast.error("Choose at least one photo or video");
      return;
    }
    const queue = files.filter((f) => f.status !== "done");
    if (!queue.length) {
      setDone(true);
      return;
    }

    setUploading(true);

    // keep the screen awake so the upload isn't interrupted when the phone dims (where supported)
    let wakeLock = null;
    try {
      if (typeof navigator !== "undefined" && navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      wakeLock = null;
    }

    let success = files.length - queue.length;
    let failed = 0;
    let lastError = "";

    for (const item of queue) {
      setStatus(item.id, "uploading");
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("guest_name", guestName);
      try {
        await publicApi.post(`/public/wedding/${slug}/upload`, fd, { timeout: UPLOAD_TIMEOUT_MS });
        setStatus(item.id, "done");
        success += 1;
      } catch (e) {
        setStatus(item.id, "error");
        failed += 1;
        lastError = friendlyError(e);
      }
    }

    try {
      if (wakeLock) await wakeLock.release();
    } catch (e) {
      // ignore
    }
    setUploading(false);

    if (success > 0 && message.trim() && !msgSent) await sendMessage(true);

    if (failed > 0) {
      toast.error(`${failed} ${failed === 1 ? "file" : "files"} didn't upload. ${lastError}`);
      return;
    }
    setDone(true);
  };

  const reset = () => {
    files.forEach(revokePreview);
    setFiles([]);
    setDone(false);
    setMessage("");
    setMsgSent(false);
  };

  const copyPageLink = () => {
    const fail = () => toast.error("Couldn't copy. Use the ⋯ menu and choose “Open in browser”.");
    try {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("Link copied — paste it in Safari or Chrome"))
        .catch(fail);
    } catch (e) {
      fail();
    }
  };

  if (loadState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wed-bg">
        <div className="w-10 h-10 rounded-full border-2 border-wed-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (loadState === "notfound") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-wed-bg px-6 text-center">
        <Heart weight="fill" className="text-wed-gold mb-4" size={40} />
        <h1 className="font-serif text-3xl">Gallery not found</h1>
        <p className="text-wed-text2 mt-2">This wedding link is invalid or has been removed.</p>
      </div>
    );
  }

  if (loadState === "blocked") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-wed-bg px-6 text-center">
        <Heart weight="fill" className="text-wed-gold mb-4" size={40} />
        <h1 className="font-serif text-3xl">Gallery unavailable</h1>
        <p className="text-wed-text2 mt-2">{loadMsg}</p>
      </div>
    );
  }

  if (loadState === "error" || !wedding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-wed-bg px-6 text-center">
        <Warning weight="fill" className="text-wed-gold mb-4" size={40} />
        <h1 className="font-serif text-3xl">Can't load this page</h1>
        <p className="text-wed-text2 mt-2 max-w-sm">
          Please check your internet connection and try again. If you opened this link inside another app,
          try opening it in Safari or Chrome.
        </p>
        <Button onClick={loadWedding} className="mt-6 rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-8 h-12">
          Try again
        </Button>
      </div>
    );
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

  const pendingCount = files.filter((f) => f.status !== "done").length;
  const hasError = files.some((f) => f.status === "error");
  const buttonLabel = uploading
    ? "Uploading…"
    : files.length
      ? hasError
        ? `Try again (${pendingCount})`
        : `Share ${pendingCount} ${pendingCount === 1 ? "memory" : "memories"}`
      : "Share memories";

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

        {showInAppTip && (
          <div className="mb-5 rounded-2xl border border-wed-gold/30 bg-white/70 px-4 py-3 text-sm text-wed-text2 text-center">
            Having trouble choosing photos? Open this page in Safari or Chrome.
            <button type="button" onClick={copyPageLink} className="ml-1 text-wed-gold font-medium underline">
              Copy link
            </button>
          </div>
        )}

        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5">
          <Input data-testid="guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name (optional)"
            className="rounded-full bg-white border-wed-line focus-visible:ring-wed-gold px-6 text-center h-12" />
        </motion.div>

        {/* Dropzone: a native <label> opens the picker in every browser, including in-app webviews */}
        <motion.label htmlFor="guest-file-input"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          data-testid="dropzone"
          className={`relative block cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-colors duration-200 ${
            dragOver ? "border-wed-gold bg-wed-goldLight" : "border-wed-gold/30 bg-white/60"
          }`}>
          <input id="guest-file-input" type="file" accept="image/*,video/*" multiple className="sr-only"
            data-testid="file-input" onChange={onPick} />
          <div className="w-16 h-16 rounded-2xl bg-wed-goldLight mx-auto flex items-center justify-center mb-5">
            <UploadSimple weight="light" size={30} className="text-wed-gold" />
          </div>
          <p className="font-serif text-2xl">Tap to add photos &amp; videos</p>
          <p className="text-wed-muted text-sm mt-2">or drag them here — you can select many at once</p>
        </motion.label>

        {/* File previews */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-3 mt-5" data-testid="file-list">
              {files.map((f) => (
                <motion.div key={f.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="relative rounded-2xl overflow-hidden bg-wed-goldLight border border-wed-line"
                  style={{ paddingTop: "100%" }}>
                  <div className="absolute inset-0">
                    {f.preview && !f.previewFailed ? (
                      <img src={f.preview} alt="" loading="lazy" decoding="async"
                        onError={() => markPreviewFailed(f.id)}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isImage(f.file)
                          ? <ImageSquare size={28} className="text-wed-gold" />
                          : <VideoCamera size={28} className="text-wed-gold" />}
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5">
                      {isImage(f.file)
                        ? <ImageSquare weight="fill" size={16} className="text-white drop-shadow" />
                        : <VideoCamera weight="fill" size={16} className="text-white drop-shadow" />}
                    </div>
                    {f.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </div>
                    )}
                    {f.status === "done" && (
                      <div className="absolute inset-0 bg-wed-gold/40 flex items-center justify-center">
                        <CheckCircle weight="fill" size={28} className="text-white" />
                      </div>
                    )}
                    {f.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center text-white text-xs">failed</div>
                    )}
                    {!uploading && f.status !== "done" && (
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(f.id); }}
                        className="absolute top-1.5 right-1.5 bg-black/40 rounded-full p-1 text-white"
                        data-testid={`remove-${f.id}`}>
                        <X size={12} weight="bold" />
                      </button>
                    )}
                  </div>
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
            {buttonLabel}
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