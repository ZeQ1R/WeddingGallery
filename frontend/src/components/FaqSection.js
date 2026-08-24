import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "@phosphor-icons/react";

const FAQS = [
  {
    q: "Do guests need to download an app?",
    a: "No. Guests just scan the QR code with their phone camera and upload directly from their browser — no app, no account, no sign-up.",
  },
  {
    q: "How long does the gallery stay available?",
    a: "It depends on the plan — Basic galleries stay live for 7 days after the wedding, Pro for 60 days, and Premium for 90 days.",
  },
  {
    q: "Can the couple download everything at once?",
    a: "Yes, couples on Pro and Premium plans can download a full-resolution zip of every photo and video in one click.",
  },
  {
    q: "What happens if we go over the upload limit?",
    a: "Guests will see a friendly message once the wedding's limit is reached. Contact us any time to upgrade a wedding's plan mid-event.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="max-w-3xl mx-auto px-6 pb-28">
      <div className="text-center mb-14">
        <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight">Frequently asked questions</h2>
      </div>
      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-2xl bg-white border border-wed-line overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-serif text-lg sm:text-xl">{item.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 text-wed-gold"
                >
                  <Plus size={20} weight="bold" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-wed-text2 leading-relaxed">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}