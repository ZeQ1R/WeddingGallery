import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Buildings, Confetti, Images, HardDrives, CurrencyDollar, VideoCamera, ImageSquare } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const PLAN_LABEL = { free_trial: "Free Trial", basic: "Basic", pro: "Pro", enterprise: "Enterprise" };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  const load = async () => {
    try {
      const [a, r] = await Promise.all([api.get("/admin/analytics"), api.get("/admin/restaurants")]);
      setStats(a.data); setRestaurants(r.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  useEffect(() => { load(); }, []);

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

  const cards = stats ? [
    { l: "Restaurants", v: stats.total_restaurants, icon: Buildings },
    { l: "Weddings", v: `${stats.total_weddings}`, sub: `${stats.active_weddings} active`, icon: Confetti },
    { l: "Total uploads", v: stats.total_uploads, sub: `${stats.photos} photos · ${stats.videos} videos`, icon: Images },
    { l: "Storage used", v: `${stats.storage_gb} GB`, icon: HardDrives },
    { l: "Monthly revenue", v: `$${stats.monthly_revenue.toLocaleString()}`, icon: CurrencyDollar },
  ] : [];

  return (
    <div className="min-h-screen bg-wed-bg">
      <TopBar title="Platform admin" subtitle="Analytics & management" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Analytics */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 sm:mb-12">
          {(stats ? cards : Array.from({ length: 5 })).map((c, i) => (
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
        </div>

        {/* Restaurants */}
        <h2 className="font-serif text-3xl font-light mb-5">Restaurants</h2>
        <div className="rounded-3xl bg-white border border-wed-line wed-shadow overflow-x-auto" data-testid="restaurant-table">
          <div className="min-w-[680px]">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-wed-line text-xs uppercase tracking-wider text-wed-muted">
            <div className="col-span-4">Venue</div>
            <div className="col-span-2">Weddings</div>
            <div className="col-span-3">Plan</div>
            <div className="col-span-3 text-right">Status</div>
          </div>
          {restaurants.length === 0 ? (
            <div className="px-6 py-12 text-center text-wed-muted">No restaurants registered yet.</div>
          ) : restaurants.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-wed-line/60 last:border-0 items-center" data-testid={`restaurant-row-${r.id}`}>
              <div className="col-span-4 min-w-0">
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
              <div className="col-span-3 text-right flex items-center justify-end gap-2">
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
              </div>
            </div>
          ))}
          </div>
        </div>
      </main>
    </div>
  );
}
