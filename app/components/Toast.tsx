"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import gsap from "gsap";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export default function Toast({
  id,
  type,
  message,
  onClose,
  duration = 4000,
}: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (!toastRef.current) return;

    gsap.to(toastRef.current, {
      x: 110,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => onClose(id),
    });
  };

  useEffect(() => {
    if (!toastRef.current) return;

    // 入场动画
    gsap.fromTo(
      toastRef.current,
      {
        x: 110,
        opacity: 0,
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
      }
    );

    // 自动关闭
    if (type !== "error" && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [type, duration]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <XCircle className="w-5 h-5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          border: "border-mint",
          bg: "bg-mint-light",
          iconColor: "text-mint",
        };
      case "error":
        return {
          border: "border-error",
          bg: "bg-error/10",
          iconColor: "text-error",
        };
      case "warning":
        return {
          border: "border-butter",
          bg: "bg-butter-light",
          iconColor: "text-butter",
        };
      case "info":
        return {
          border: "border-macaron-blue",
          bg: "bg-macaron-blue-light",
          iconColor: "text-macaron-blue",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      ref={toastRef}
      className={`
        flex items-start gap-3 p-4 rounded-xl
        border-l-4 ${styles.border} ${styles.bg}
        shadow-lg max-w-sm
      `}
      role="alert"
      aria-live="polite"
    >
      <div className={`flex-shrink-0 ${styles.iconColor}`}>{getIcon()}</div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-text-primary">{message}</p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="关闭通知"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
