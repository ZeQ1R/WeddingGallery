import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WedToaster } from "@/components/WedToaster";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import GuestUpload from "@/pages/GuestUpload";
import RestaurantDashboard from "@/pages/RestaurantDashboard";
import WeddingDetail from "@/pages/WeddingDetail";
import CoupleGallery from "@/pages/CoupleGallery";
import AdminDashboard from "@/pages/AdminDashboard";
import InviteAccept from "@/pages/InviteAccept";
import Slideshow from "@/pages/Slideshow";

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-wed-bg">
      <div className="w-10 h-10 rounded-full border-2 border-wed-gold border-t-transparent animate-spin" />
    </div>
  );
}

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "couple") return <Navigate to="/my-gallery" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <div className="App grain">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            {/* <Route path="/register" element={<Register />} /> */}
            <Route path="/wedding/:slug" element={<GuestUpload />} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/slideshow/:slug" element={<Protected roles={["couple", "admin"]}><Slideshow /></Protected>} />
            <Route path="/dashboard" element={<Protected roles={["restaurant"]}><RestaurantDashboard /></Protected>} />
            <Route path="/dashboard/wedding/:slug" element={<Protected roles={["restaurant", "admin"]}><WeddingDetail /></Protected>} />
            <Route path="/my-gallery" element={<Protected roles={["couple"]}><CoupleGallery /></Protected>} />
            <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <WedToaster />
      </AuthProvider>
    </div>
  );
}

export default App;
