import { Toaster as SonnerToaster } from 'sonner';

/** Midnight-themed Sonner toaster mounted once at the app root. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(8, 11, 22, 0.95)',
          border: '1px solid rgba(34, 211, 238, 0.25)',
          color: '#e2e8f0',
          backdropFilter: 'blur(12px)',
          borderRadius: '14px',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          boxShadow: '0 18px 50px -20px rgba(0, 0, 0, 0.7)',
        },
      }}
      theme="dark"
      richColors
      closeButton
    />
  );
}
