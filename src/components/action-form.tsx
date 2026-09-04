"use client";

import { useRef, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import styles from "./action-form.module.css";

export function ActionForm({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const panel = useRef<HTMLDetailsElement>(null);
  return <details className={styles.panel} id={id} ref={panel}>
    <summary className={styles.trigger}><Plus size={18} className={styles.closed} aria-hidden="true" /><X size={18} className={styles.opened} aria-hidden="true" /><span className={styles.closed}>{label}</span><span className={styles.opened}>Fechar formulário</span></summary>
    <div className={styles.content}>{children}<button className={styles.close} type="button" onClick={() => { if (panel.current) { panel.current.open = false; panel.current.querySelector("summary")?.focus(); } }}>Fechar sem publicar</button></div>
  </details>;
}
