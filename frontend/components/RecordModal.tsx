"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function RecordModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      aria-label={title}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close dialog" className="rounded-lg border border-slate-300 px-3 py-1.5 text-lg leading-none hover:bg-slate-50">×</button>
      </div>
      <div className="px-5 py-6 sm:px-7">{children}</div>
    </dialog>
  );
}
