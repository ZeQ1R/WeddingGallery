import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BG = "https://images.unsplash.com/photo-1572387147902-d7d137cb0fbd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwdGFibGUlMjBnb2xkfGVufDB8fHx8MTc4NjMxMjI3M3ww&ixlib=rb-4.1.0&q=85";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await register(form);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Account created — welcome!");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-wed-bg">
      <div className="flex items-center justify-center px-6 py-12 order-2 lg:order-1">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <Heart weight="fill" className="text-wed-gold" size={24} />
            <span className="font-serif text-2xl">WedSnap</span>
          </Link>
          <h1 className="font-serif text-4xl font-light tracking-tight">Create your venue account</h1>
          <p className="text-wed-text2 mt-2">Start with a free trial — one wedding, on us.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
            <div>
              <Label className="text-wed-text2">Venue / business name</Label>
              <Input data-testid="register-business" required value={form.business_name} onChange={upd("business_name")}
                className="mt-2 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-12 px-5" placeholder="The Grand Ballroom" />
            </div>
            <div>
              <Label className="text-wed-text2">Your name</Label>
              <Input data-testid="register-name" required value={form.name} onChange={upd("name")}
                className="mt-2 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-12 px-5" placeholder="Jordan Rivera" />
            </div>
            <div>
              <Label className="text-wed-text2">Email</Label>
              <Input data-testid="register-email" type="email" required value={form.email} onChange={upd("email")}
                className="mt-2 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-12 px-5" placeholder="you@venue.com" />
            </div>
            <div>
              <Label className="text-wed-text2">Password</Label>
              <Input data-testid="register-password" type="password" required minLength={6} value={form.password} onChange={upd("password")}
                className="mt-2 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-12 px-5" placeholder="At least 6 characters" />
            </div>
            <Button data-testid="register-submit" type="submit" disabled={busy}
              className="w-full rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-12 text-base shadow-md shadow-wed-gold/20">
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="text-wed-text2 mt-8 text-sm">
            Already have an account? <Link to="/login" className="text-wed-gold font-medium hover:underline" data-testid="link-login">Sign in</Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block relative order-1 lg:order-2">
        <img src={BG} alt="Champagne" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-wed-gold/10" />
      </div>
    </div>
  );
}
