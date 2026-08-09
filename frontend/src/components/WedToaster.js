import { Toaster } from "sonner";

export function WedToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "#FFFFFF",
          border: "1px solid #C5A059",
          color: "#1A1A1A",
          borderRadius: "9999px",
          fontFamily: "Manrope, sans-serif",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        },
      }}
    />
  );
}
