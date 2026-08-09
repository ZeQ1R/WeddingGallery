import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BG = "https://images.unsplash.com/photo-1782686223394-af72f7de562c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjB3ZWRkaW5nJTIwcmVjZXB0aW9uJTIwdGFibGUlMjBnb2xkfGVufDB8fHx8MTc4NjMxMjI3M3ww&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Welcome back");
    const role = res.user.role;
    navigate(role === "admin" ? "/admin" : role === "couple" ? "/my-gallery" : "/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-wed-bg">
      <div className="hidden lg:block relative">
        <img src={BG} alt="Wedding" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-wed-text/30" />
        <div className="absolute bottom-14 left-14 text-white">
          <Heart weight="fill" className="text-wed-gold mb-4" size={32} />
          <p className="font-serif text-4xl font-light leading-tight max-w-sm">Every memory, in one elegant gallery.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <Heart weight="fill" className="text-wed-gold" size={24} />
            <span className="font-serif text-2xl">WedSnap</span>
          </Link>
          <h1 className="font-serif text-4xl font-light tracking-tight">Welcome back</h1>
          <p className="text-wed-text2 mt-2">Sign in to your account.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" data-testid="login-form">
            <div>
              <Label className="text-wed-text2">Email</Label>
              <Input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-2 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-12 px-5" placeholder="you@venue.com" />
            </div>
            <div>
              <Label className="text-wed-text2">Password</Label>
              <Input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-2 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-12 px-5" placeholder="••••••••" />
            </div>
            <Button data-testid="login-submit" type="submit" disabled={busy}
              className="w-full rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-12 text-base shadow-md shadow-wed-gold/20">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-wed-text2 mt-8 text-sm">
            New venue? <Link to="/register" className="text-wed-gold font-medium hover:underline" data-testid="link-register">Create an account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
