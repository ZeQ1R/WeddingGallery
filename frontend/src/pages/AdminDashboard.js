import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Buildings, Confetti, Images, HardDrives, CurrencyDollar, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const PLAN_LABEL = { free_trial: "Free Trial", basic: "Basic", pro: "Pro", enterprise: "Enterprise" };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", business_name: "", plan: "free_trial" });
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = async () => {
    try {
      const [a, r] = await Promise.all([api.get("/admin/analytics"), api.get("/admin/restaurants")]);
      setStats(a.data); setRestaurants(r.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  useEffect(() => { load(); }, []);

  const createRestaurant = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/restaurants/create", form);
      toast.success("Restaurant account created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", business_name: "", plan: "free_trial" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const updatePlan = async (id, plan) => {
    try { await api.patch(`/admin/restaurants/${id}`, null, { params: { plan } }); toast.success("Plan updated"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const toggleSuspend = async (r) => {
    const status = r.status === "suspended" ? "active" : "suspended";
    try { await api.patch(`/admin/restaurants/${r.id}`, null, { params: { status } }); toast.success(`Restaurant ${status}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const approve = async (r) => {
    try { await api.patch(`/admin/restaurants/${r.id}`, null, { params: { status: "active" } }); toast.success("Venue approved"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const deleteRestaurant = async (r) => {
    setDeletingId(r.id);
    try {
      await api.delete(`/admin/restaurants/${r.id}`);
      toast.success(`${r.business_name} and all its weddings were deleted`);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setDeletingId(null); }
  };

  const cards = stats ? [
    { l: "Restaurants", v: stats.total_restaurants, icon: Buildings },
    { l: "Weddings", v: `${stats.total_weddings}`, sub: `${stats.active_weddings} active`, icon: Confetti },
    { l: "Total uploads", v: stats.total_uploads, sub: `${stats.photos} photos · ${stats.videos} videos`, icon: Images },
    { l: "Monthly revenue", v: `$${stats.monthly_revenue.toLocaleString()}`, icon: CurrencyDollar },
  ] : [];

  const storagePct = stats ? Math.min(stats.storage_percent_used, 100) : 0;
  const storageBarColor = storagePct > 75 ? "bg-red-500" : storagePct > 50 ? "bg-amber-400" : "bg-wed-gold";

  return (
    <div className="min-h-screen bg-wed-bg">
      <TopBar title="Platform admin" subtitle="Analytics & management"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-restaurant-btn" className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-5">
                <Plus size={18} className="mr-1.5" /> Add restaurant
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-wed-line max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-3xl font-light">Add a restaurant</DialogTitle>
                <DialogDescription className="text-wed-text2">Create a new venue account with login credentials.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createRestaurant} className="space-y-4 mt-2" data-testid="create-restaurant-form">
                <div>
                  <Label className="text-wed-text2">Contact name</Label>
                  <Input data-testid="restaurant-name" required value={form.name} onChange={upd("name")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="Jane Doe" />
                </div>
                <div>
                  <Label className="text-wed-text2">Business name (optional)</Label>
                  <Input data-testid="restaurant-business-name" value={form.business_name} onChange={upd("business_name")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="Nobel Palace" />
                </div>
                <div>
                  <Label className="text-wed-text2">Email</Label>
                  <Input data-testid="restaurant-email" type="email" required value={form.email} onChange={upd("email")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="venue@email.com" />
                </div>
                <div>
                  <Label className="text-wed-text2">Password</Label>
                  <Input data-testid="restaurant-password" type="password" required minLength={6} value={form.password} onChange={upd("password")}
                    className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line focus-visible:ring-wed-gold h-11 px-4" placeholder="At least 6 characters" />
                  <p className="text-xs text-wed-muted mt-1.5">Share this with the venue directly — they can sign in immediately, no approval step needed.</p>
                </div>
                <div>
                  <Label className="text-wed-text2">Plan</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                    <SelectTrigger data-testid="restaurant-plan" className="mt-1.5 rounded-full bg-wed-goldLight/50 border-wed-line h-11 px-4">
                      <SelectValue>{PLAN_LABEL[form.plan]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="submit-restaurant" type="submit" disabled={busy}
                  className="w-full rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-12">
                  {busy ? "Creating…" : "Create restaurant account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        } />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Analytics */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 sm:mb-12">
          {(stats ? cards : Array.from({ length: 4 })).map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-3xl bg-white border border-wed-line p-6 wed-shadow">
              {c ? (<>
                <c.icon weight="light" size={24} className="text-wed-gold mb-3" />
                <p className="font-serif text-3xl leading-none">{c.v}</p>
                <p className="text-wed-muted text-sm mt-1.5">{c.l}</p>
                {c.sub && <p className="text-wed-muted text-xs mt-0.5">{c.sub}</p>}
              </>) : <div className="h-20 shimmer rounded-xl" />}
            </motion.div>
          ))}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
            className="rounded-3xl bg-white border border-wed-line p-6 wed-shadow">
            {stats ? (<>
              <HardDrives weight="light" size={24} className="text-wed-gold mb-3" />
              <p className="font-serif text-3xl leading-none">{stats.storage_gb} GB</p>
              <p className="text-wed-muted text-sm mt-1.5">Storage used</p>
              <div className="w-full h-2 bg-wed-goldLight/60 rounded-full overflow-hidden mt-3">
                <div className={`h-full rounded-full ${storageBarColor}`} style={{ width: `${storagePct}%` }} />
              </div>
              <p className="text-wed-muted text-xs mt-1.5">{stats.storage_percent_used}% of {stats.storage_limit_gb}GB limit</p>
            </>) : <div className="h-20 shimmer rounded-xl" />}
          </motion.div>
        </div>

        {/* Restaurants */}
        <h2 className="font-serif text-3xl font-light mb-5">Restaurants</h2>
        <div className="rounded-3xl bg-white border border-wed-line wed-shadow overflow-x-auto" data-testid="restaurant-table">
          <div className="min-w-[760px]">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-wed-line text-xs uppercase tracking-wider text-wed-muted">
            <div className="col-span-3">Venue</div>
            <div className="col-span-2">Weddings</div>
            <div className="col-span-3">Plan</div>
            <div className="col-span-4 text-right">Status</div>
          </div>
          {restaurants.length === 0 ? (
            <div className="px-6 py-12 text-center text-wed-muted">No restaurants registered yet.</div>
          ) : restaurants.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-wed-line/60 last:border-0 items-center" data-testid={`restaurant-row-${r.id}`}>
              <div className="col-span-3 min-w-0">
                <p className="font-medium truncate">{r.business_name}</p>
                <p className="text-wed-muted text-sm truncate">{r.email}</p>
              </div>
              <div className="col-span-2 text-wed-text2">{r.wedding_count}</div>
              <div className="col-span-3">
                <Select value={r.plan} onValueChange={(v) => updatePlan(r.id, v)}>
                  <SelectTrigger className="rounded-full border-wed-line h-9 w-36" data-testid={`plan-select-${r.id}`}>
                    <SelectValue>{PLAN_LABEL[r.plan] || r.plan}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 text-right flex items-center justify-end gap-2">
                {r.status === "pending" && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">pending</span>
                )}
                {r.status === "pending" ? (
                  <Button size="sm" onClick={() => approve(r)} data-testid={`approve-${r.id}`}
                    className="rounded-full h-9 bg-wed-gold hover:bg-wed-goldHover text-white">
                    Approve
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => toggleSuspend(r)} data-testid={`suspend-${r.id}`}
                    className={`rounded-full h-9 bg-transparent ${r.status === "suspended" ? "border-green-300 text-green-600" : "border-red-200 text-red-500"}`}>
                    {r.status === "suspended" ? "Reactivate" : "Suspend"}
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid={`delete-${r.id}`}
                      className="rounded-full h-9 w-9 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 bg-transparent">
                      <Trash size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-wed-line mx-4">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-3xl font-light">Delete {r.business_name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the restaurant account, all {r.wedding_count} of its weddings, every guest upload, message, and couple account under them. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                      <AlertDialogCancel className="rounded-full mt-0">Keep restaurant</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteRestaurant(r)} disabled={deletingId === r.id} className="rounded-full bg-red-600 hover:bg-red-700">
                        {deletingId === r.id ? "Deleting…" : "Delete permanently"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          </div>
        </div>
      </main>
    </div>
  );
}