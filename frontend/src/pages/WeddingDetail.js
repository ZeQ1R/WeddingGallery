import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, DownloadSimple, Copy, QrCode, CalendarBlank, MapPin, CheckCircle, EnvelopeSimple, LockKey, Images, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function WeddingDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [wedding, setWedding] = useState(null);
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);

  const loadInviteStatus = () =>
    api.get(`/weddings/${slug}/invite-status`).then(({ data }) => setInviteInfo(data)).catch(() => {});

  useEffect(() => {
    api.get(`/weddings/${slug}`).then(({ data }) => setWedding(data)).catch((e) => {
      toast.error(formatApiError(e.response?.data?.detail)); navigate("/dashboard");
    });
    api.get(`/weddings/${slug}/qr`).then(({ data }) => setQr(data)).catch(() => {});
    loadInviteStatus();
    // eslint-disable-next-line
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
      if (data.email_sent === false) {
        try { await navigator.clipboard.writeText(data.link); } catch {}
        toast.info("Email isn't configured locally. The invitation link was copied to your clipboard.");
      } else {
        toast.success(data.message || "Invitation sent");
      }
      loadInviteStatus();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setInviting(false); }
  };

  const deleteWedding = async () => {
    setDeleting(true);
    try {
      await api.delete(`/weddings/${slug}`);
      toast.success("Wedding deleted");
      navigate("/dashboard");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setDeleting(false); }
  };

  if (!wedding) return <div className="min-h-screen flex items-center justify-center bg-wed-bg">
    <div className="w-10 h-10 rounded-full border-2 border-wed-gold border-t-transparent animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-wed-bg">
      <TopBar title={`${wedding.bride_name} & ${wedding.groom_name}`} subtitle={wedding.venue || "Wedding gallery"}
        right={
          <div className="flex items-center gap-2">
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
            <DialogTrigger asChild>
              <Button data-testid="show-qr-btn" className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-5">
                <QrCode size={18} className="mr-1.5" /> QR code
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-wed-line max-w-sm text-center">
              <DialogHeader>
                <DialogTitle className="font-serif text-3xl font-light">Guest QR code</DialogTitle>
                <DialogDescription className="text-wed-text2">Guests can scan this code to upload photos and videos.</DialogDescription>
              </DialogHeader>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-wed-text2 hover:text-wed-gold mb-6 text-sm" data-testid="back-link">
          <ArrowLeft size={16} /> All weddings
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white border border-wed-line p-5 sm:p-8 wed-shadow mb-8 sm:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs px-3 py-1 rounded-full ${wedding.status === "active" ? "bg-green-50 text-green-600" : wedding.status === "suspended" ? "bg-red-50 text-red-500" : "bg-wed-goldLight text-wed-gold"}`}>{wedding.status}</span>
              <span className="text-wed-muted text-sm">{wedding.upload_count || 0} memories</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light break-words">{wedding.bride_name} <span className="text-wed-gold italic">&amp;</span> {wedding.groom_name}</h2>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-wed-text2">
              <span className="flex items-center gap-1.5"><CalendarBlank size={15} className="text-wed-gold" /> {wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</span>
              {wedding.venue && <span className="flex items-center gap-1.5"><MapPin size={15} className="text-wed-gold" /> {wedding.venue}</span>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
            <Button onClick={inviteCouple} disabled={inviting} data-testid="invite-couple"
              className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-11 w-full sm:w-auto">
              <EnvelopeSimple size={18} className="mr-1.5" /> {inviting ? "Sending…" : inviteInfo?.invited ? "Resend invite" : "Invite couple"}
            </Button>
            {wedding.status !== "completed" ? (
              <Button onClick={() => setStatus("completed")} data-testid="mark-completed" variant="outline" className="rounded-full border-wed-gold text-wed-gold bg-transparent h-11 w-full sm:w-auto">
                <CheckCircle size={18} className="mr-1.5" /> Mark completed
              </Button>
            ) : (
              <Button onClick={() => setStatus("active")} data-testid="mark-active" variant="outline" className="rounded-full border-wed-gold text-wed-gold bg-transparent h-11 w-full sm:w-auto">
                Reopen
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button data-testid="delete-wedding" variant="outline" className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-11 w-full sm:w-auto">
                  <Trash size={18} className="mr-1.5" /> Delete wedding
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-wed-line mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-3xl font-light">Delete this wedding?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the wedding, its guest uploads, messages, and couple access. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                  <AlertDialogCancel className="rounded-full mt-0">Keep wedding</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteWedding} disabled={deleting} className="rounded-full bg-red-600 hover:bg-red-700">
                    {deleting ? "Deleting…" : "Delete permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-3xl bg-wed-goldLight/40 border border-wed-line p-10 sm:p-14 text-center" data-testid="privacy-panel">
          <div className="w-16 h-16 rounded-2xl bg-white border border-wed-line mx-auto flex items-center justify-center mb-6 wed-shadow">
            <LockKey weight="light" size={30} className="text-wed-gold" />
          </div>
          <h3 className="font-serif text-3xl sm:text-4xl font-light">These memories are private</h3>
          <p className="text-wed-text2 mt-4 max-w-lg mx-auto leading-relaxed">
            Only {wedding.bride_name} &amp; {wedding.groom_name} can view and download the photos, videos and
            messages guests share. As the venue you set up the wedding, share the QR code and invite the couple —
            but their gallery stays completely private to them.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-wed-line px-5 py-2.5 text-sm text-wed-text2">
              <Images size={16} className="text-wed-gold" /> {wedding.upload_count || 0} memories collected so far
            </div>
            {inviteInfo && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-wed-line px-5 py-2.5 text-sm" data-testid="invite-status">
                <span className={`w-2 h-2 rounded-full ${inviteInfo.opened ? "bg-green-500" : inviteInfo.invited ? "bg-amber-400" : "bg-wed-muted"}`} />
                <span className="text-wed-text2">
                  {inviteInfo.opened ? "Couple opened their gallery" : inviteInfo.invited ? "Invite sent — not opened yet" : inviteInfo.couple_email ? "Couple not invited yet" : "No couple email on file"}
                </span>
              </div>
            )}
          </div>
          <div className="mt-8">
            <Button onClick={inviteCouple} disabled={inviting} data-testid="invite-couple-panel"
              className="rounded-full bg-wed-gold hover:bg-wed-goldHover text-white h-12 px-8">
              <EnvelopeSimple size={18} className="mr-1.5" /> {inviting ? "Sending…" : inviteInfo?.invited ? "Resend invite" : "Invite the couple to their gallery"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
