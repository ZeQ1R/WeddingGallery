import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Play, LockKey, Images } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/TopBar";
import { Gallery } from "@/components/Gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CoupleGallery() {
  const { user, refresh } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);
  const slug = user?.wedding_id;

  useEffect(() => {
    if (slug) api.get(`/public/wedding/${slug}`).then(({ data }) => setWedding(data)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (user && user.password_set === false) setPwdOpen(true);
  }, [user]);

  const savePassword = async (e) => {
    e?.preventDefault();
    if (pwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwd !== pwd2) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/auth/set-password", { password: pwd });
      toast.success(data.message || "Password saved");
      await refresh();
      setPwdOpen(false);
      setPwd(""); setPwd2("");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const firstTime = user && user.password_set === false;

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
      <TopBar title={wedding ? `${wedding.bride_name} & ${wedding.groom_name}` : "Your gallery"} subtitle="Your private wedding gallery"
        right={
          <div className="flex items-center gap-2">
            <Dialog open={pwdOpen} onOpenChange={(o) => { if (!firstTime) setPwdOpen(o); }}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="account-password-btn"
                  className="rounded-full border-wed-line text-wed-text2 bg-transparent px-4 hover:border-wed-gold hover:text-wed-gold">
                  <LockKey size={16} className="mr-1.5" /> <span className="hidden sm:inline">Password</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-wed-line max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-serif text-3xl font-light">
                    {firstTime ? "Create your password" : "Change your password"}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Set the password for this gallery account.</DialogDescription>
                </DialogHeader>
                <p className="text-wed-text2 text-sm -mt-1">
                  {firstTime
                    ? "Set a password so you can sign in and revisit your gallery anytime — no link needed."
                    : "Update the password you use to sign in."}
                </p>
                <form onSubmit={savePassword} className="space-y-4 mt-3" data-testid="set-password-form">
                  <div>
                    <Label className="text-wed-text2">New password</Label>
                    <Input data-testid="new-password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
                      minLength={6} required placeholder="At least 6 characters"
                      className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-5" />
                  </div>
                  <div>
                    <Label className="text-wed-text2">Confirm password</Label>
                    <Input data-testid="confirm-password" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)}
                      minLength={6} required placeholder="Re-enter password"
                      className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-5" />
                  </div>
                  <Button type="submit" disabled={saving} data-testid="save-password"
                    className="w-full rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-12">
                    {saving ? "Saving…" : "Save password"}
                  </Button>
                  {firstTime && <p className="text-center text-wed-muted text-xs">You can also do this later from the Password button.</p>}
                </form>
              </DialogContent>
            </Dialog>
            <Link to={`/slideshow/${slug}`} data-testid="couple-slideshow-btn">
              <Button variant="outline" className="rounded-full border-wed-gold text-wed-gold bg-transparent px-4">
                <Play weight="fill" size={16} className="mr-1.5" /> Slideshow
              </Button>
            </Link>
          </div>
        } />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {wedding && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-wed-goldLight px-4 py-1.5 text-xs tracking-widest uppercase text-wed-gold mb-4">
              <Heart weight="fill" size={13} /> Your memories
            </div>
            <h2 className="font-serif text-5xl font-light">{wedding.bride_name} <span className="text-wed-gold italic">&amp;</span> {wedding.groom_name}</h2>
            {wedding.wedding_date && <p className="text-wed-text2 mt-2">{new Date(wedding.wedding_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>}
          </motion.div>
        )}
        {wedding && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-wed-line px-5 py-2.5 text-sm text-wed-text2">
              <Images size={16} className="text-wed-gold" /> {wedding.upload_count || 0} memories collected so far
            </div>
          </div>
        )}
        <Gallery slug={slug} canDelete={true} />
      </main>
    </div>
  );
}