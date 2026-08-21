import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const STATS = [
  { to: 340, suffix: "+", label: "Weddings hosted" },
  { to: 58000, suffix: "+", label: "Memories captured" },
  { to: 98, suffix: "%", label: "Guests upload in under a minute" },
];

export function StatsSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="rounded-[2rem] bg-white border border-wed-line wed-shadow px-8 sm:px-14 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 text-center"
      >
        {STATS.map((s, i) => (
          <div key={i}>
            <p className="font-serif text-4xl sm:text-5xl font-light text-wed-gold">
              <AnimatedCounter to={s.to} suffix={s.suffix} />
            </p>
            <p className="text-wed-text2 mt-2 text-sm sm:text-base">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}