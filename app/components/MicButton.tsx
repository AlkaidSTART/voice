"use client";

import { useRef, useEffect } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import gsap from "gsap";

export type MicButtonState = "idle" | "recording" | "processing" | "error";

interface MicButtonProps {
  state: MicButtonState;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function MicButton({
  state,
  onClick,
  disabled = false,
  className = "",
}: MicButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // 处理动画
  useEffect(() => {
    if (!buttonRef.current || !pulseRef.current || !iconRef.current) return;

    // 清除之前的动画
    gsap.killTweensOf([pulseRef.current, iconRef.current]);

    switch (state) {
      case "recording":
        // 录音脉冲动画
        gsap.to(pulseRef.current, {
          scale: 1.4,
          opacity: 0,
          duration: 1.4,
          ease: "power1.out",
          repeat: -1,
        });
        // 内圆轻微缩放
        gsap.to(iconRef.current, {
          scale: 0.95,
          duration: 0.3,
          ease: "back.out(1.7)",
          yoyo: true,
          repeat: -1,
        });
        break;

      case "processing":
        // 旋转动画
        gsap.to(pulseRef.current, {
          rotation: 360,
          duration: 1,
          ease: "none",
          repeat: -1,
        });
        break;

      case "error":
        // 错误shake动画
        gsap.to(buttonRef.current, {
          x: -6,
          duration: 0.1,
          yoyo: true,
          repeat: 5,
          ease: "power1.inOut",
          onComplete: () => {
            gsap.set(buttonRef.current, { x: 0 });
          },
        });
        break;

      case "idle":
      default:
        // 重置状态
        gsap.set(pulseRef.current, { scale: 1, opacity: 0.8, rotation: 0 });
        gsap.set(iconRef.current, { scale: 1 });
        break;
    }

    // 清理函数
    return () => {
      gsap.killTweensOf([pulseRef.current, iconRef.current]);
    };
  }, [state]);

  const getButtonStyles = () => {
    switch (state) {
      case "recording":
        return "bg-sakura text-white";
      case "processing":
        return "bg-macaron-blue-light text-macaron-blue";
      case "error":
        return "bg-error text-white";
      case "idle":
      default:
        return "bg-white text-text-secondary border-2 border-border hover:border-sakura hover:text-sakura";
    }
  };

  const getIcon = () => {
    switch (state) {
      case "recording":
        return <MicOff className="w-8 h-8" />;
      case "processing":
        return <Mic className="w-8 h-8 animate-pulse" />;
      case "error":
        return <AlertCircle className="w-8 h-8" />;
      case "idle":
      default:
        return <Mic className="w-8 h-8" />;
    }
  };

  const getAriaLabel = () => {
    switch (state) {
      case "recording":
        return "正在录音 - 点击停止";
      case "processing":
        return "处理中 - 请稍候";
      case "error":
        return "录音失败 - 点击重试";
      case "idle":
      default:
        return "点击开始录音";
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* 外圆脉冲 */}
      <div
        ref={pulseRef}
        className={`absolute inset-0 rounded-full ${
          state === "recording"
            ? "bg-sakura"
            : state === "processing"
            ? "bg-macaron-blue"
            : "bg-transparent"
        }`}
        style={{ opacity: state === "idle" ? 0 : 0.3 }}
      />

      {/* 按钮主体 */}
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || state === "processing"}
        className={`
          relative w-20 h-20 rounded-full
          flex items-center justify-center
          shadow-lg
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-sakura/50
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getButtonStyles()}
        `}
        role="button"
        aria-label={getAriaLabel()}
        aria-pressed={state === "recording"}
      >
        <div ref={iconRef}>{getIcon()}</div>
      </button>

      {/* 状态文字 */}
      <div className="mt-3 text-center">
        <p className="text-sm text-text-secondary">
          {state === "recording"
            ? "录音中..."
            : state === "processing"
            ? "处理中..."
            : state === "error"
            ? "录音失败"
            : "点击或长按说话"}
        </p>
      </div>
    </div>
  );
}
