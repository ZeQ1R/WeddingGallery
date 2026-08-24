import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, QrCode, Images, Sparkle, ArrowRight, Camera, List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/PricingSection";
import { StatsSection } from "@/components/StatsSection";
import { FaqSection } from "@/components/FaqSection";

const HERO = "https://images.unsplash.com/photo-1718463384055-738905bdd16e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjB3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwdGFibGUlMjBnb2xkfGVufDB8fHx8MTc4NjMxMjI3M3ww&ixlib=rb-4.1.0&q=85";
const COUPLE = "https://images.unsplash.com/photo-1561287495-a3fe1fd28504?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwY291cGxlJTIwaG9sZGluZyUyMGhhbmRzfGVufDB8fHx8MTc4NjMxMjI3M3ww&ixlib=rb-4.1.0&q=85";

const fadeUp = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] },
});

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] },
});

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-wed-bg/85 border-wed-line/70 shadow-sm"
          : "backdrop-blur-md bg-wed-bg/50 border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, -6, 0] }}
            transition={{ duration: 0.6 }}
            className="w-9 h-9 rounded-xl bg-wed-goldLight flex items-center justify-center"
          >
            <Heart weight="fill" className="text-wed-gold" size={18} />
          </motion.div>
          
          <span className="font-serif text-2xl tracking-tight">WedSnap</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm text-wed-text2 hover:text-wed-gold transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 w-0 h-px bg-wed-gold transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button
            onClick={() => scrollTo("#pricing")}
            className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white shadow-md shadow-wed-gold/20 px-6"
          >
            View pricing
          </Button>
        </div>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-wed-goldLight text-wed-text"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-wed-line/60 bg-wed-bg/95 backdrop-blur-xl"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left py-3 text-wed-text2 hover:text-wed-gold border-b border-wed-line/40 last:border-0"
                >
                  {link.label}
                </button>
              ))}
              <Button
                onClick={() => scrollTo("#pricing")}
                className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white mt-4 h-11"
              >
                View pricing
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-wed-bg text-wed-text relative overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center relative">
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 pointer-events-none hidden lg:block"
          style={{ background: "radial-gradient(circle, #C5A059 0%, transparent 70%)" }}
        />
        <div>
          <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 rounded-full bg-wed-goldLight px-4 py-1.5 text-sm text-wed-gold mb-8">
            <Sparkle weight="fill" size={16} /> Every memory, beautifully kept
          </motion.div>
          <motion.h1 {...fadeUp(0.05)} className="font-serif font-light text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
            Never lose a single<br />
            <span className="italic text-wed-gold">wedding memory</span>
          </motion.h1>
          <motion.p {...fadeUp(0.12)} className="mt-8 text-lg text-wed-text2 max-w-md leading-relaxed">
            Every guest scans one elegant QR code, and instantly shares their photos and videos.
            The couple receives one private gallery with every moment — no app, no fuss.
          </motion.p>
          <motion.div {...fadeUp(0.18)} className="mt-10 flex flex-wrap items-center gap-4">
            <Button
              onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="hero-cta"
              className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white shadow-md shadow-wed-gold/20 px-8 h-12 text-base group"
            >
              Start your gallery
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Button>
          </motion.div>
        </div>

        <motion.div {...fadeUp(0.2)} className="relative">
          <div className="rounded-[2rem] overflow-hidden wed-shadow-lg border border-wed-line">
            <img src={HERO} alt="Luxury wedding table setting" className="w-full h-[520px] object-cover" />
          </div>
          <motion.div
            {...fadeUp(0.5)}
            animate={{ y: [0, -8, 0] }}
            transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute -bottom-6 -left-6 bg-white rounded-3xl p-5 wed-shadow border border-wed-line flex items-center gap-4"
          >
            <img src={COUPLE} alt="Couple" className="w-14 h-14 rounded-2xl object-cover" />
            <div>
              <p className="font-serif text-xl leading-none">1,248 memories</p>
              <p className="text-sm text-wed-muted mt-1">captured by guests</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 pb-24 scroll-mt-24">
        <motion.div {...reveal()} className="text-center mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight">Uploading takes 15 seconds</h2>
          <p className="text-wed-text2 mt-4 text-lg">Three effortless steps for every guest.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: QrCode, t: "Scan the code", d: "Guests scan the wedding QR at their table. No downloads, no sign-ups." },
            { icon: Camera, t: "Tap to upload", d: "Photos and videos flow straight into the couple's private gallery." },
            { icon: Images, t: "Cherish forever", d: "The couple downloads every memory, favorites the best, and shares them." },
          ].map((s, i) => (
            <motion.div
              key={i}
              {...reveal(i * 0.1)}
              whileHover={{ y: -6 }}
              className="rounded-3xl bg-white border border-wed-line p-10 wed-shadow transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl bg-wed-goldLight flex items-center justify-center mb-6">
                <s.icon weight="light" size={28} className="text-wed-gold" />
              </div>
              <h3 className="font-serif text-2xl mb-3">{s.t}</h3>
              <p className="text-wed-text2 leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <StatsSection />

      <PricingSection />


      <section id="faq" className="scroll-mt-24">
        <FaqSection />
      </section>

      {/* CTA */}
      {/* <motion.section {...reveal()} className="max-w-5xl mx-auto px-6 pb-28">
        <div className="rounded-[2rem] bg-wed-text text-white p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 30% 20%, #C5A059, transparent 60%)" }} />
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart weight="fill" className="text-wed-gold mx-auto mb-6" size={36} />
          </motion.div>
          <h2 className="font-serif text-4xl sm:text-5xl font-light relative">For venues & wedding planners</h2>
          <p className="text-white/70 mt-4 max-w-xl mx-auto relative">
            Delight every couple with a keepsake gallery. We handle setup, QR codes, and every wedding — venues simply earn a commission on each one hosted.
          </p>
        </div>
      </motion.section> */}

      {/* Footer */}
      <footer className="border-t border-wed-line pt-14 pb-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Heart weight="fill" className="text-wed-gold" size={20} />
              <span className="font-serif text-xl">WedSnap</span>
            </div>
            <p className="text-wed-muted text-sm leading-relaxed">Wedding memories, beautifully kept.</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-wed-muted mb-4">Product</p>
            <ul className="space-y-2.5 text-sm text-wed-text2">
              <li><button onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-wed-gold transition-colors">How it works</button></li>
              <li><button onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-wed-gold transition-colors">Pricing</button></li>
              <li><button onClick={() => document.querySelector("#faq")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-wed-gold transition-colors">FAQ</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-wed-muted mb-4">Company</p>
            <ul className="space-y-2.5 text-sm text-wed-text2">
              <li className="hover:text-wed-gold transition-colors cursor-default">For venues</li>
              <li className="hover:text-wed-gold transition-colors cursor-default">Contact us</li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-wed-muted mb-4">Legal</p>
            <ul className="space-y-2.5 text-sm text-wed-text2">
              <li className="hover:text-wed-gold transition-colors cursor-default">Privacy</li>
              <li className="hover:text-wed-gold transition-colors cursor-default">Terms</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-wed-line/60 text-center text-wed-muted text-sm">
          <p className="flex items-center justify-center gap-2">
            <Heart weight="fill" className="text-wed-gold" size={14} /> WedSnap — wedding memories, beautifully kept.
          </p>
        </div>
      </footer>
    </div>
  );
}