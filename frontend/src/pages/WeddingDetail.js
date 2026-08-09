import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, DownloadSimple, Copy, QrCode, CalendarBlank, MapPin, CheckCircle, EnvelopeSimple, Play } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { Gallery } from "@/components/Gallery";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function WeddingDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [wedding, setWedding] = useState(null);
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.get(`/weddings/${slug}`).then(({ data }) => setWedding(data)).catch((e) => {
      toast.error(formatApiError(e.response?.data?.detail)); navigate("/dashboard");
    });
    api.get(`/weddings/${slug}/qr`).then(({ data }) => setQr(data)).catch(() => {});
  }, [slug, navigate]);

  const copyLink = () => { if (qr) { navigator.clipboard.writeText(qr.url); toast.success("Link copied"); } };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr.qr_data_url; a.download = `${slug}-qr.png`; a.click();
  };

  const setStatus = async (status) => {
    try {
      await api.patch(`/weddings/${slug}/status`, null, { params: { status } });
      setWedding((w) => ({ ...w, status }));
      toast.success(`Marked as ${status}`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const inviteCouple = async () => {
    setInviting(true);
    try {
      const { data } = await api.post(`/weddings/${slug}/invite`);
      toast.success(data.message || "Invitation sent");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setInviting(false); }
  };

  if (!wedding) return <div className="min-h-screen flex items-center justify-center bg-wed-bg">
    <div className="w-10 h-10 rounded-full border-2 border-wed-gold border-t-transparent animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-wed-bg">
      <TopBar title={`${wedding.bride_name} & ${wedding.groom_name}`} subtitle={wedding.venue || "Wedding gallery"}
        right={
          <div className="flex items-center gap-2">
            <Link to={`/slideshow/${slug}`} data-testid="slideshow-btn">
              <Button variant="outline" className="rounded-full border-wed-gold text-wed-gold bg-transparent px-4 hidden sm:flex">
                <Play weight="fill" size={16} className="mr-1.5" /> Slideshow
              </Button>
            </Link>
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
            <DialogTrigger asChild>
              <Button data-testid="show-qr-btn" className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-5">
                <QrCode size={18} className="mr-1.5" /> QR code
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-wed-line max-w-sm text-center">
              <DialogHeader><DialogTitle className="font-serif text-3xl font-light">Guest QR code</DialogTitle></DialogHeader>
              {qr ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-3xl bg-white border border-wed-line p-4 wed-shadow mt-2">
                    <img src={qr.qr_data_url} alt="QR code" className="w-56 h-56" data-testid="qr-image" />
                  </div>
                  <p className="text-wed-muted text-xs mt-4 break-all px-4">{qr.url}</p>
                  <div className="flex gap-2 mt-5 w-full">
                    <Button onClick={downloadQr} data-testid="download-qr" className="flex-1 rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-11">
                      <DownloadSimple size={18} className="mr-1.5" /> Download
                    </Button>
                    <Button onClick={copyLink} variant="outline" data-testid="copy-link" className="flex-1 rounded-full border-wed-gold text-wed-gold bg-transparent h-11">
                      <Copy size={18} className="mr-1.5" /> Copy link
                    </Button>
                  </div>
                </div>
              ) : <div className="h-56 shimmer rounded-2xl" />}
            </DialogContent>
          </Dialog>
          </div>
        } />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-wed-text2 hover:text-wed-gold mb-6 text-sm" data-testid="back-link">
          <ArrowLeft size={16} /> All weddings
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white border border-wed-line p-8 wed-shadow mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs px-3 py-1 rounded-full ${wedding.status === "active" ? "bg-green-50 text-green-600" : wedding.status === "suspended" ? "bg-red-50 text-red-500" : "bg-wed-goldLight text-wed-gold"}`}>{wedding.status}</span>
              <span className="text-wed-muted text-sm">{wedding.upload_count || 0} memories</span>
            </div>
            <h2 className="font-serif text-4xl font-light">{wedding.bride_name} <span className="text-wed-gold italic">&amp;</span> {wedding.groom_name}</h2>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-wed-text2">
              <span className="flex items-center gap-1.5"><CalendarBlank size={15} className="text-wed-gold" /> {wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</span>
              {wedding.venue && <span className="flex items-center gap-1.5"><MapPin size={15} className="text-wed-gold" /> {wedding.venue}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={inviteCouple} disabled={inviting} data-testid="invite-couple"
              className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-11">
              <EnvelopeSimple size={18} className="mr-1.5" /> {inviting ? "Sending…" : "Invite couple"}
            </Button>
            {wedding.status !== "completed" ? (
              <Button onClick={() => setStatus("completed")} data-testid="mark-completed" variant="outline" className="rounded-full border-wed-gold text-wed-gold bg-transparent h-11">
                <CheckCircle size={18} className="mr-1.5" /> Mark completed
              </Button>
            ) : (
              <Button onClick={() => setStatus("active")} data-testid="mark-active" variant="outline" className="rounded-full border-wed-gold text-wed-gold bg-transparent h-11">
                Reopen
              </Button>
            )}
          </div>
        </motion.div>

        <Gallery slug={slug} canDelete={true} />
      </main>
    </div>
  );
}
