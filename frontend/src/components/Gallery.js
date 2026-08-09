import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Trash, DownloadSimple, MagnifyingGlass, ImagesSquare, VideoCamera, Images, ChatCircleDots } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { API, formatApiError } from "@/lib/api";
import { AuthedMedia } from "@/components/AuthedMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Full gallery experience shared by restaurant + couple + admin.
export function Gallery({ slug, canDelete = true }) {
  const [items, setItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | photo | video | favorites
  const [view, setView] = useState("grid"); // grid | timeline | messages
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === "photo" || filter === "video") params.media_type = filter;
      if (filter === "favorites") params.favorites = true;
      if (search) params.search = search;
      const { data } = await api.get(`/gallery/${slug}`, { params });
      setItems(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const loadMessages = async () => {
    try { const { data } = await api.get(`/gallery/${slug}/messages`); setMessages(data); } catch {}
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, search]);
  useEffect(() => { loadMessages(); /* eslint-disable-next-line */ }, [slug]);

  const toggleFav = async (id) => {
    try {
      const { data } = await api.post(`/gallery/upload/${id}/favorite`);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_favorite: data.is_favorite } : i)));
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/gallery/upload/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setLightbox(null);
      toast.success("Removed");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const downloadAll = async (favoritesOnly = false) => {
    setDownloading(true);
    try {
      const res = await api.get(`/gallery/${slug}/download`, {
        params: favoritesOnly ? { favorites: true } : {},
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = favoritesOnly ? `${slug}-favorites.zip` : `${slug}-memories.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error("Could not download gallery"); }
    finally { setDownloading(false); }
  };

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((i) => {
      const d = i.created_at ? new Date(i.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Undated";
      (g[d] ||= []).push(i);
    });
    return g;
  }, [items]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-8">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="rounded-full bg-wed-goldLight/60 p-1">
            <TabsTrigger value="all" data-testid="filter-all" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-4">All</TabsTrigger>
            <TabsTrigger value="photo" data-testid="filter-photo" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-4">Photos</TabsTrigger>
            <TabsTrigger value="video" data-testid="filter-video" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-4">Videos</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="filter-favorites" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-4">Favorites</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-wed-muted" size={16} />
            <Input data-testid="gallery-search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by guest…" className="rounded-full bg-white border-wed-line focus-visible:ring-wed-gold h-11 pl-10 pr-4 w-48" />
          </div>
          <Button data-testid="download-all" onClick={() => downloadAll(filter === "favorites")} disabled={downloading || !items.length}
            className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-11 px-5">
            <DownloadSimple size={18} className="mr-1.5" /> {downloading ? "Zipping…" : filter === "favorites" ? "Download favorites" : "Download all"}
          </Button>
        </div>
      </div>

      {/* View switch */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { k: "grid", label: "Grid", icon: Images },
          { k: "timeline", label: "Timeline", icon: ImagesSquare },
          { k: "messages", label: `Guestbook (${messages.length})`, icon: ChatCircleDots },
        ].map((v) => (
          <button key={v.k} onClick={() => setView(v.k)} data-testid={`view-${v.k}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
              view === v.k ? "bg-wed-text text-white" : "bg-white border border-wed-line text-wed-text2 hover:border-wed-gold"
            }`}>
            <v.icon size={16} /> {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square rounded-2xl shimmer" />)}
        </div>
      ) : view === "messages" ? (
        <MessagesView messages={messages} />
      ) : items.length === 0 ? (
        <Empty />
      ) : view === "grid" ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4" data-testid="gallery-grid">
          {items.map((i, idx) => (
            <GalleryTile key={i.id} item={i} idx={idx} onFav={toggleFav} onDel={canDelete ? del : null} onOpen={() => setLightbox(i)} />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([date, list]) => (
            <div key={date} className="relative pl-6 border-l border-wed-line">
              <div className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-wed-gold" />
              <p className="font-serif text-2xl mb-4">{date}</p>
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                {list.map((i, idx) => (
                  <GalleryTile key={i.id} item={i} idx={idx} onFav={toggleFav} onDel={canDelete ? del : null} onOpen={() => setLightbox(i)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)} data-testid="lightbox">
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-3xl overflow-hidden bg-white">
              <AuthedMedia uploadId={lightbox.id} mediaType={lightbox.media_type} className="w-full max-h-[70vh] object-contain bg-black" />
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium">{lightbox.guest_name}</p>
                  <p className="text-wed-muted text-sm">{lightbox.created_at ? new Date(lightbox.created_at).toLocaleString() : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => toggleFav(lightbox.id)}
                    className={`rounded-full border-wed-gold ${lightbox.is_favorite ? "bg-wed-gold text-white" : "text-wed-gold bg-transparent"}`}>
                    <Heart weight={lightbox.is_favorite ? "fill" : "regular"} size={18} />
                  </Button>
                  {canDelete && (
                    <Button variant="outline" onClick={() => del(lightbox.id)} className="rounded-full border-red-200 text-red-500 bg-transparent hover:bg-red-50">
                      <Trash size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryTile({ item, idx, onFav, onDel, onOpen }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.4) }}
      className="relative group rounded-2xl overflow-hidden border border-wed-line break-inside-avoid bg-wed-goldLight" data-testid="gallery-item">
      <AuthedMedia uploadId={item.id} mediaType={item.media_type} onClick={onOpen}
        className="w-full cursor-pointer transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <button data-testid={`fav-${item.id}`} onClick={(e) => { e.stopPropagation(); onFav(item.id); }}
        className={`absolute top-2 right-2 rounded-full p-2 backdrop-blur-md transition ${item.is_favorite ? "bg-wed-gold text-white" : "bg-white/70 text-wed-text opacity-0 group-hover:opacity-100"}`}>
        <Heart weight={item.is_favorite ? "fill" : "regular"} size={16} />
      </button>
      {onDel && (
        <button data-testid={`del-${item.id}`} onClick={(e) => { e.stopPropagation(); onDel(item.id); }}
          className="absolute top-2 left-2 rounded-full p-2 bg-white/70 text-red-500 backdrop-blur-md opacity-0 group-hover:opacity-100 transition">
          <Trash size={16} />
        </button>
      )}
      <div className="absolute bottom-2 left-3 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition pointer-events-none drop-shadow">
        {item.guest_name}
      </div>
    </motion.div>
  );
}

function MessagesView({ messages }) {
  if (!messages.length) return <Empty label="No guest messages yet." />;
  return (
    <div className="grid sm:grid-cols-2 gap-5" data-testid="messages-list">
      {messages.map((m, i) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="rounded-3xl bg-white border border-wed-line p-7 wed-shadow">
          <ChatCircleDots weight="light" size={26} className="text-wed-gold mb-3" />
          <p className="font-serif text-xl leading-relaxed text-wed-text">“{m.text}”</p>
          <p className="text-wed-muted text-sm mt-4">— {m.guest_name}</p>
        </motion.div>
      ))}
    </div>
  );
}

function Empty({ label = "No memories here yet." }) {
  return (
    <div className="text-center py-24">
      <Images weight="light" size={48} className="text-wed-gold/50 mx-auto mb-4" />
      <p className="font-serif text-2xl text-wed-text2">{label}</p>
      <p className="text-wed-muted mt-1">Memories will appear here as guests upload them.</p>
    </div>
  );
}

export { API };
