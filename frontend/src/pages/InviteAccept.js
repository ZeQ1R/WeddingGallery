import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, WarningCircle } from "@phosphor-icons/react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await api.post(`/auth/invite/${token}`);
        await refresh();
        if (active) navigate("/my-gallery", { replace: true });
      } catch (e) {
        if (active) setError(formatApiError(e.response?.data?.detail) || "This invitation is invalid.");
      }
    })();
    return () => { active = false; };
  }, [token, navigate, refresh]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-wed-bg px-6 text-center">
      {error ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <WarningCircle weight="light" size={48} className="text-wed-gold mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-light" data-testid="invite-error">Invitation unavailable</h1>
          <p className="text-wed-text2 mt-2 max-w-sm">{error}</p>
          <Button onClick={() => navigate("/login")} className="mt-6 rounded-full bg-wed-gold hover:bg-wed-goldHover text-white px-8">
            Go to sign in
          </Button>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center">
          <Heart weight="fill" size={40} className="text-wed-gold animate-pulse mb-5" />
          <div className="w-9 h-9 rounded-full border-2 border-wed-gold border-t-transparent animate-spin" />
          <p className="text-wed-text2 mt-5 font-serif text-2xl">Opening your gallery…</p>
        </div>
      )}
    </div>
  );
}
