import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/TopBar";
import { Gallery } from "@/components/Gallery";

export default function CoupleGallery() {
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const slug = user?.wedding_id;

  useEffect(() => {
    if (slug) api.get(`/public/wedding/${slug}`).then(({ data }) => setWedding(data)).catch(() => {});
  }, [slug]);

  if (!slug) {
    return (
      <div className="min-h-screen bg-wed-bg">
        <TopBar title="Your gallery" />
        <div className="text-center py-32">
          <Heart weight="fill" size={40} className="text-wed-gold mx-auto mb-4" />
          <p className="font-serif text-3xl text-wed-text2">No gallery linked to your account yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wed-bg">
      <TopBar title={wedding ? `${wedding.bride_name} & ${wedding.groom_name}` : "Your gallery"} subtitle="Your private wedding gallery" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {wedding && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-wed-goldLight px-4 py-1.5 text-xs tracking-widest uppercase text-wed-gold mb-4">
              <Heart weight="fill" size={13} /> Your memories
            </div>
            <h2 className="font-serif text-5xl font-light">{wedding.bride_name} <span className="text-wed-gold italic">&amp;</span> {wedding.groom_name}</h2>
            {wedding.wedding_date && <p className="text-wed-text2 mt-2">{new Date(wedding.wedding_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>}
          </motion.div>
        )}
        <Gallery slug={slug} canDelete={true} />
      </main>
    </div>
  );
}
