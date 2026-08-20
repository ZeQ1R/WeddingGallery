import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, QrCode, Images, Sparkle, ArrowRight, Camera } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const HERO = "https://images.unsplash.com/photo-1718463384055-738905bdd16e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjB3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwdGFibGUlMjBnb2xkfGVufDB8fHx8MTc4NjMxMjI3M3ww&ixlib=rb-4.1.0&q=85";
const COUPLE = "https://images.unsplash.com/photo-1561287495-a3fe1fd28504?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwY291cGxlJTIwaG9sZGluZyUyMGhhbmRzfGVufDB8fHx8MTc4NjMxMjI3M3ww&ixlib=rb-4.1.0&q=85";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] },
});

export default function Landing() {
  return (
    <div className="min-h-screen bg-wed-bg text-wed-text relative overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-wed-bg/70 border-b border-wed-line/60">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <Heart weight="fill" className="text-wed-gold" size={26} />
            <span className="font-serif text-2xl tracking-tight">WedSnap</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login">
              {/* <Button variant="ghost" className="rounded-full text-wed-text2 hover:text-wed-text hover:bg-wed-goldLight">Sign in</Button> */}
            </Link>
            {/* <Link to="/register" data-testid="nav-register">
              <Button className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white shadow-md shadow-wed-gold/20 px-6">
                Get started
              </Button>
            </Link> */}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full bg-wed-goldLight px-4 py-1.5 text-sm text-wed-gold mb-8">
            <Sparkle weight="fill" size={16} /> Every memory, beautifully kept
          </motion.div>
          <motion.h1 {...fade(0.05)} className="font-serif font-light text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
            Never lose a single<br />
            <span className="italic text-wed-gold">wedding memory</span>
          </motion.h1>
          <motion.p {...fade(0.12)} className="mt-8 text-lg text-wed-text2 max-w-md leading-relaxed">
            Every guest scans one elegant QR code, and instantly shares their photos and videos.
            The couple receives one private gallery with every moment — no app, no fuss.
          </motion.p>
          <motion.div {...fade(0.18)} className="mt-10 flex flex-wrap items-center gap-4">
            <Link data-testid="hero-cta">
              <Button className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white shadow-md shadow-wed-gold/20 px-8 h-12 text-base group">
                Start your gallery
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </Link>
            <Link to="/login">
              {/* <Button variant="outline" className="rounded-full border-wed-gold text-wed-gold hover:bg-wed-goldLight h-12 px-8 text-base bg-transparent">
                Sign in
              </Button> */}
            </Link>
          </motion.div>
        </div>

        <motion.div {...fade(0.2)} className="relative">
          <div className="rounded-[2rem] overflow-hidden wed-shadow-lg border border-wed-line">
            <img src={HERO} alt="Luxury wedding table setting" className="w-full h-[520px] object-cover" />
          </div>
          <motion.div {...fade(0.5)}
            className="absolute -bottom-6 -left-6 bg-white rounded-3xl p-5 wed-shadow border border-wed-line flex items-center gap-4">
            <img src={COUPLE} alt="Couple" className="w-14 h-14 rounded-2xl object-cover" />
            <div>
              <p className="font-serif text-xl leading-none">1,248 memories</p>
              <p className="text-sm text-wed-muted mt-1">captured by guests</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight">Uploading takes 15 seconds</h2>
          <p className="text-wed-text2 mt-4 text-lg">Three effortless steps for every guest.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: QrCode, t: "Scan the code", d: "Guests scan the wedding QR at their table. No downloads, no sign-ups." },
            { icon: Camera, t: "Tap to upload", d: "Photos and videos flow straight into the couple's private gallery." },
            { icon: Images, t: "Cherish forever", d: "The couple downloads every memory, favorites the best, and shares them." },
          ].map((s, i) => (
            <motion.div key={i} {...fade(i * 0.1)}
              className="rounded-3xl bg-white border border-wed-line p-10 wed-shadow hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-wed-goldLight flex items-center justify-center mb-6">
                <s.icon weight="light" size={28} className="text-wed-gold" />
              </div>
              <h3 className="font-serif text-2xl mb-3">{s.t}</h3>
              <p className="text-wed-text2 leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="rounded-[2rem] bg-wed-text text-white p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 30% 20%, #C5A059, transparent 60%)" }} />
          <Heart weight="fill" className="text-wed-gold mx-auto mb-6" size={36} />
          <h2 className="font-serif text-4xl sm:text-5xl font-light relative">For venues & wedding planners</h2>
          <p className="text-white/70 mt-4 max-w-xl mx-auto relative">
            Delight every couple with a keepsake gallery. Generate QR codes in seconds and manage all your weddings in one place.
          </p>
          {/* <Link to="/register" className="relative inline-block mt-8" data-testid="cta-bottom">
            <Button className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-10 h-12 text-base">
              Create your venue account
            </Button>
          </Link> */}
        </div>
      </section>

      <footer className="border-t border-wed-line py-10 text-center text-wed-muted text-sm">
        <p className="flex items-center justify-center gap-2">
          <Heart weight="fill" className="text-wed-gold" size={14} /> WedSnap — wedding memories, beautifully kept.
        </p>
      </footer>
    </div>
  );
}
