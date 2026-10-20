"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

type Props = {
  text: string;
  label?: string;
};

/** علامت سؤال با توضیح هنگام هاور، فوکوس یا کلیک — مناسب استفاده آسان */
export function HelpTip({ text, label = "راهنما" }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="help-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="help-tip-btn"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleHelp size={18} strokeWidth={2.25} />
      </button>
      {open && (
        <span id={id} role="tooltip" className="help-tip-bubble">
          {text}
        </span>
      )}
    </span>
  );
}

export function LabelWithHelp({
  children,
  help,
}: {
  children: React.ReactNode;
  help: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{children}</span>
      <HelpTip text={help} />
    </span>
  );
}
