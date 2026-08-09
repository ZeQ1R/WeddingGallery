import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { motion } from "framer-motion";

// Fetches a protected media file as a blob and renders it.
export function AuthedMedia({ uploadId, mediaType, alt, className, onClick }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);
  const urlRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/files/${uploadId}`, { responseType: "blob" });
        if (!active) return;
        const url = URL.createObjectURL(res.data);
        urlRef.current = url;
        setSrc(url);
      } catch {
        if (active) setErr(true);
      }
    })();
    return () => {
      active = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [uploadId]);

  if (err) {
    return <div className={`flex items-center justify-center bg-wed-goldLight text-wed-muted text-xs ${className}`}>unavailable</div>;
  }
  if (!src) {
    return <div className={`shimmer ${className}`} />;
  }
  if (mediaType === "video") {
    return (
      <video src={src} className={className} onClick={onClick} muted loop playsInline
        onMouseOver={(e) => e.target.play()} onMouseOut={(e) => e.target.pause()} />
    );
  }
  return (
    <motion.img
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      src={src} alt={alt} className={className} onClick={onClick} loading="lazy"
    />
  );
}
