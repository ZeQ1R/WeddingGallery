import { Link, useNavigate } from "react-router-dom";
import { Heart, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function TopBar({ title, subtitle, right, backTo }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate("/login"); };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-wed-bg/70 border-b border-wed-line/60">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Heart weight="fill" className="text-wed-gold" size={24} />
            <span className="font-serif text-2xl hidden sm:inline">WedSnap</span>
          </Link>
          {title && (
            <div className="pl-4 border-l border-wed-line min-w-0">
              <h1 className="font-serif text-2xl leading-none truncate">{title}</h1>
              {subtitle && <p className="text-wed-muted text-sm mt-1 truncate">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          <span className="hidden md:inline text-sm text-wed-text2 mr-1">{user?.business_name || user?.name}</span>
          <Button data-testid="logout-btn" variant="ghost" size="icon" onClick={onLogout}
            className="rounded-full text-wed-text2 hover:bg-wed-goldLight hover:text-wed-text">
            <SignOut size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}
