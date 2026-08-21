import { motion } from "framer-motion";
import { CheckCircle } from "@phosphor-icons/react";

const TIERS = [
  {
    key: "basic",
    label: "Basic",
    price: 25,
    features: ["150 photo/video uploads", "Guest QR upload page", "Private couple gallery"],
  },
  {
    key: "pro",
    label: "Pro",
    price: 40,
    popular: true,
    features: ["500 photo/video uploads", "Everything in Basic", "Full-resolution zip download", "Guest message wall"],
  },
  {
    key: "premium",
    label: "Premium",
    price: 60,
    features: ["800 photo/video uploads", "Everything in Pro", "Slideshow mode for reception screens", "Priority support"],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 pb-24 scroll-mt-24">
      <div className="text-center mb-16">
        <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight">Simple, per-wedding pricing</h2>
        <p className="text-wed-text2 mt-4 text-lg">Choose the plan that fits your wedding size.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            whileHover={{ y: -6 }}
            className={`rounded-3xl p-6 sm:p-8 border wed-shadow flex flex-col transition-shadow ${
              tier.popular ? "bg-wed-text text-white border-wed-text sm:scale-105" : "bg-white border-wed-line"
            }`}
          >
            {tier.popular && (
              <span className="inline-block self-start mb-4 text-xs font-semibold tracking-wide uppercase bg-wed-gold text-white px-3 py-1 rounded-full">
                Most popular
              </span>
            )}
            <h3 className={`font-serif text-2xl sm:text-3xl font-light ${tier.popular ? "text-white" : "text-wed-text"}`}>
              {tier.label}
            </h3>
            <div className="mt-3 mb-6 flex items-baseline gap-1">
              <span className={`font-serif text-4xl sm:text-5xl font-light ${tier.popular ? "text-white" : "text-wed-text"}`}>
                €{tier.price}
              </span>
              <span className={`text-sm ${tier.popular ? "text-white/70" : "text-wed-muted"}`}>/ wedding</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm sm:text-[15px]">
                  <CheckCircle weight="fill" size={18} className="shrink-0 mt-0.5 text-wed-gold" />
                  <span className={tier.popular ? "text-white/90" : "text-wed-text2"}>{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}