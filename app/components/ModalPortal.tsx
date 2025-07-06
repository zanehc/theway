import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  let el = typeof window !== 'undefined' ? document.getElementById('modal-root') : null;
  if (!el && typeof window !== 'undefined') el = document.body;
  return el ? createPortal(children, el) : null;
} 