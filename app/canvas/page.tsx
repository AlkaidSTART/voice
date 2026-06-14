"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Image, LogOut, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import gsap from "gsap";
import MicButton, { MicButtonState } from "../components/MicButton";
import Toast, { ToastType } from "../components/Toast";
import TranscriptBar from "../components/TranscriptBar";
import { authDB, User as UserType } from "../lib/db";

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

export default function CanvasPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [micState, setMicState] = useState<MicButtonState>("idle");
  const [transcript, setTranscript] = useState("");
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const headerRef = useRef<HTMLElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const voiceAreaRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // 检查用户登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await authDB.getCurrentUser();
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    };
    checkAuth();
  }, [router]);

  // 页面入场动画
  useEffect(() => {
    if (!user) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      headerRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 }
    )
      .fromTo(
        canvasAreaRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.2)" },
        "-=0.3"
      )
      .fromTo(
        toolbarRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4 },
        "-=0.3"
      )
      .fromTo(
        transcriptRef.current,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3 },
        "-=0.2"
      )
      .fromTo(
        voiceAreaRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" },
        "-=0.2"
      );

    return () => {
      tl.kill();
    };
  }, [user]);

  // 模拟语音识别文本更新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (micState === "recording") {
      const phrases = [
        "画",
        "画一个",
        "画一个圆形",
        "画一个红色圆形",
        "画一个红色圆形在",
        "画一个红色圆形在中间",
      ];
      let i = 0;
      interval = setInterval(() => {
        if (i < phrases.length) {
          setTranscript(phrases[i]);
          i++;
        }
      }, 800);
    } else if (micState === "idle") {
      setTranscript("");
    }

    return () => clearInterval(interval);
  }, [micState]);

  // 添加Toast通知
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  // 移除Toast通知
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 处理麦克风按钮点击
  const handleMicClick = useCallback(() => {
    switch (micState) {
      case "idle":
        setMicState("recording");
        addToast("info", "开始录音...");
        break;
      case "recording":
        setMicState("processing");
        setTranscript("识别中...");
        // 模拟处理
        setTimeout(() => {
          setMicState("idle");
          setTranscript("");
          addToast("success", "语音识别完成");
        }, 2000);
        break;
      case "error":
        setMicState("idle");
        break;
      case "processing":
        // 处理中不允许点击
        break;
    }
  }, [micState, addToast]);

  // 处理登出
  const handleLogout = useCallback(async () => {
    await authDB.logout();
    router.push("/login");
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-secondary animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-sakura-light/5 to-macaron-blue-light/5 flex flex-col">
      {/* Toast 通知区域 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </div>

      {/* Header */}
      <header
        ref={headerRef}
        className="h-14 bg-surface/80 backdrop-blur-sm border-b border-sakura/10 flex items-center justify-between px-6"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sakura-light to-sakura/30 flex items-center justify-center shadow-sm">
            <span className="text-sakura font-bold text-sm">VC</span>
          </div>
          <span className="font-semibold text-text-primary">VoiceCanvas</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => addToast("info", "图库功能开发中")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-sakura-light/20 transition-all"
            aria-label="打开图库"
          >
            <Image className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">图库</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-sakura-light/20 transition-all"
            aria-label="登出"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">登出</span>
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-sakura-light flex items-center justify-center">
              <User className="w-4 h-4 text-sakura" />
            </div>
            <span className="text-sm text-text-primary hidden sm:inline font-medium">
              {user.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative p-4">
          <div
            ref={canvasAreaRef}
            className="absolute inset-4 bg-white rounded-3xl border border-sakura/10 shadow-lg shadow-sakura/5 overflow-hidden"
          >
            {/* 背景装饰网格 */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #FFB7C5 0.5px, transparent 0.5px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Canvas */}
            <canvas
              className="w-full h-full relative z-10"
              role="img"
              aria-label="绘图画布 - 通过语音指令控制绘图"
            />

            {/* Toolbar */}
            <div
              ref={toolbarRef}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-surface/95 backdrop-blur-sm rounded-2xl border border-sakura/10 shadow-lg px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addToast("info", "撤销功能开发中")}
                  className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-sakura-light/20 transition-all"
                  aria-label="撤销"
                  title="撤销"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => addToast("info", "重做功能开发中")}
                  className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-sakura-light/20 transition-all"
                  aria-label="重做"
                  title="重做"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-border" />

                <button
                  onClick={() => addToast("info", "清空功能开发中")}
                  className="p-2 rounded-xl text-text-secondary hover:text-error hover:bg-error/10 transition-all"
                  aria-label="清空画布"
                  title="清空画布"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-border" />

                {/* 当前颜色指示 */}
                <div className="flex items-center gap-2 px-2">
                  <div className="w-4 h-4 rounded-full bg-sakura border-2 border-white shadow-sm" />
                  <span className="text-xs text-text-secondary font-medium">
                    樱花粉
                  </span>
                </div>

                <div className="w-px h-6 bg-border" />

                {/* 模式标签 */}
                <div className="px-3 py-1.5 rounded-full bg-sakura-light text-sakura text-xs font-semibold">
                  绘图模式
                </div>
              </div>
            </div>

            {/* 右上角装饰 - 操作提示 */}
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-xl border border-sakura/10 shadow-sm px-4 py-2">
              <p className="text-xs text-text-secondary">
                试试说：
                <span className="text-sakura font-medium ml-1">
                  "画一个红色圆形"
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Transcript Bar */}
        <div ref={transcriptRef}>
          <TranscriptBar
            transcript={transcript}
            isRecording={micState === "recording"}
          />
        </div>

        {/* Voice Control Area */}
        <div
          ref={voiceAreaRef}
          className="h-28 bg-surface/80 backdrop-blur-sm border-t border-sakura/10 flex items-center justify-center relative"
        >
          {/* 背景声波装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sakura/10 to-transparent"
                style={{
                  bottom: `${20 + i * 15}%`,
                  opacity: micState === "recording" ? 0.5 - i * 0.08 : 0,
                  transition: "opacity 0.5s ease",
                  animation:
                    micState === "recording"
                      ? `voiceBar 1s ease-in-out ${i * 0.15}s infinite alternate`
                      : "none",
                }}
              />
            ))}
          </div>

          <MicButton state={micState} onClick={handleMicClick} />
        </div>
      </div>
    </div>
  );
}
