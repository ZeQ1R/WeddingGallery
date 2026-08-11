import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, CalendarBlank, MapPin, Images, ArrowRight, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const isPending = user?.status === "pending";
  const [weddings, setWeddings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bride_name: "", groom_name: "", wedding_date: "", venue: "", couple_email: "" });
  const [busy, setBusy] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/weddings"); setWeddings(data); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/weddings", form);
      toast.success("Wedding created");
      setOpen(false);
      setForm({ bride_name: "", groom_name: "", wedding_date: "", venue: "", couple_email: "" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const filtered = weddings.filter((w) => tab === "all" || w.status === tab);
  const stats = {
    total: weddings.length,
    active: weddings.filter((w) => w.status === "active").length,
    uploads: weddings.reduce((a, w) => a + (w.upload_count || 0), 0),
  };

  return (
    <div className="min-h-screen bg-wed-bg">
      <TopBar title="Weddings" subtitle={user?.business_name}
        right={
          <Dialog open={open} onOpenChange={(o) => { if (isPending) { toast.error("Your venue is awaiting admin approval."); return; } setOpen(o); }}>
            <DialogTrigger asChild>
              <Button data-testid="new-wedding-btn" disabled={isPending} className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-5 disabled:opacity-50">
                <Plus size={18} className="mr-1.5" /> New wedding
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-wed-line max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-3xl font-light">Create a wedding</DialogTitle>
                <DialogDescription className="text-wed-text2">Add the couple and event details to start their gallery.</DialogDescription>
              </DialogHeader>
              <form onSubmit={create} className="space-y-4 mt-2" data-testid="create-wedding-form">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-wed-text2">Bride</Label>
                    <Input data-testid="bride-name" required value={form.bride_name} onChange={upd("bride_name")}
                      className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="Aria" /></div>
                  <div><Label className="text-wed-text2">Groom</Label>
                    <Input data-testid="groom-name" required value={form.groom_name} onChange={upd("groom_name")}
                      className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="Leo" /></div>
                </div>
                <div><Label className="text-wed-text2">Wedding date</Label>
                  <Input data-testid="wedding-date" type="date" required value={form.wedding_date} onChange={upd("wedding_date")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" /></div>
                <div><Label className="text-wed-text2">Venue (optional)</Label>
                  <Input data-testid="venue" value={form.venue} onChange={upd("venue")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="The Grand Ballroom" /></div>
                <div><Label className="text-wed-text2">Couple's email (optional)</Label>
                  <Input data-testid="couple-email" type="email" value={form.couple_email} onChange={upd("couple_email")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="couple@email.com" />
                  <p className="text-xs text-wed-muted mt-1.5">Creates a private gallery login for the couple.</p></div>
                <Button data-testid="submit-wedding" type="submit" disabled={busy}
                  className="w-full rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-12">
                  {busy ? "Creating…" : "Create wedding"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {isPending && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-testid="pending-banner"
            className="rounded-3xl bg-wed-goldLight/60 border border-wed-gold/30 p-6 sm:p-7 mb-8 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white border border-wed-line flex items-center justify-center shrink-0">
              <Sparkle weight="light" size={22} className="text-wed-gold" />
            </div>
            <div>
              <p className="font-serif text-2xl leading-tight">Your venue is awaiting approval</p>
              <p className="text-wed-text2 text-sm mt-1.5">
                Thanks for signing up! A platform admin will review your venue shortly. Once approved, you'll be able to
                create weddings, generate QR codes and invite couples.
              </p>
            </div>
          </motion.div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { l: "Total weddings", v: stats.total, icon: Sparkle },
            { l: "Active now", v: stats.active, icon: CalendarBlank },
            { l: "Memories captured", v: stats.uploads, icon: Images },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-3xl bg-white border border-wed-line p-6 wed-shadow">
              <s.icon weight="light" size={24} className="text-wed-gold mb-3" />
              <p className="font-serif text-4xl">{s.v}</p>
              <p className="text-wed-muted text-sm mt-1">{s.l}</p>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList className="rounded-full bg-wed-goldLight/60 p-1">
            <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-5">All</TabsTrigger>
            <TabsTrigger value="active" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-5">Active</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-wed-gold px-5">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 rounded-3xl shimmer" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Images weight="light" size={48} className="text-wed-gold/50 mx-auto mb-4" />
            <p className="font-serif text-3xl text-wed-text2">No weddings yet</p>
            <p className="text-wed-muted mt-2">Create your first wedding to generate a QR code.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="wedding-list">
            {filtered.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/dashboard/wedding/${w.slug}`} data-testid={`wedding-card-${w.slug}`}
                  className="block rounded-3xl bg-white border border-wed-line p-7 wed-shadow hover:-translate-y-1 transition-transform duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs px-3 py-1 rounded-full ${w.status === "active" ? "bg-green-50 text-green-600" : w.status === "suspended" ? "bg-red-50 text-red-500" : "bg-wed-goldLight text-wed-gold"}`}>
                      {w.status}
                    </span>
                    <ArrowRight className="text-wed-muted group-hover:text-wed-gold group-hover:translate-x-1 transition-all" size={18} />
                  </div>
                  <h3 className="font-serif text-3xl leading-tight">{w.bride_name} <span className="text-wed-gold italic">&amp;</span> {w.groom_name}</h3>
                  <div className="mt-4 space-y-1.5 text-sm text-wed-text2">
                    <p className="flex items-center gap-2"><CalendarBlank size={15} className="text-wed-gold" /> {w.wedding_date ? new Date(w.wedding_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</p>
                    {w.venue && <p className="flex items-center gap-2"><MapPin size={15} className="text-wed-gold" /> {w.venue}</p>}
                    <p className="flex items-center gap-2"><Images size={15} className="text-wed-gold" /> {w.upload_count || 0} memories</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
