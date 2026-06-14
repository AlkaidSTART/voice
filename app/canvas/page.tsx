"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Image,
  LogOut,
  RotateCcw,
  RotateCw,
  Trash2,
  Sparkles,
  Download,
  Save,
} from "lucide-react";
import gsap from "gsap";
import type { MicButtonState } from "../components/MicButton";
import Toast, { ToastType } from "../components/Toast";
import XfyunVoiceInput from "../components/XfyunVoiceInput";
import { authDB, artworkDB, User as UserType } from "../lib/db";
import type { DrawInstruction } from "../lib/draw-schema";

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
  const [sessionDescription, setSessionDescription] = useState("");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const voiceAreaRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        descriptionRef.current,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3 },
        "-=0.2"
      )
      .fromTo(
        voiceAreaRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" },
        "-=0.15"
      );

    return () => {
      tl.kill();
    };
  }, [user]);

  // 添加Toast通知
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  // 移除Toast通知
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 处理麦克风按钮点击 - 切换录音状态
  const handleMicClick = useCallback(() => {
    switch (micState) {
      case "idle":
        setMicState("recording");
        addToast("info", "开始录音...");
        break;
      case "recording":
        setMicState("processing");
        addToast("info", "识别中...");
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

  // 处理语音识别结果
  const handleTranscriptChange = useCallback((newTranscript: string) => {
    setTranscript(newTranscript);
    if (newTranscript && micState === "processing") {
      setTimeout(() => {
        setMicState("idle");
        addToast("success", "语音识别完成");
      }, 500);
    }
  }, [micState, addToast]);

  // 处理语音识别最终结果
  const handleFinalResult = useCallback((finalTranscript: string) => {
    const trimmed = finalTranscript.trim();
    if (!trimmed) return;

    setTranscript(trimmed);
    setSessionDescription(trimmed);
    setMicState("idle");
    addToast("success", "识别结果已填入会话描述");
  }, [addToast]);

  // 绘制图形到 Canvas
  const drawShapes = useCallback((instructions: DrawInstruction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置 Canvas 尺寸为容器大小
    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    } else {
      canvas.width = 800;
      canvas.height = 600;
    }

    // 绘制背景
    if (instructions.backgroundColor) {
      ctx.fillStyle = instructions.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 绘制每个图形
    instructions.shapes.forEach((shape) => {
      ctx.beginPath();

      switch (shape.type) {
        case "rectangle":
          if (shape.fillColor) {
            ctx.fillStyle = shape.fillColor;
            ctx.fillRect(shape.x, shape.y, shape.width || 100, shape.height || 100);
          }
          if (shape.strokeColor) {
            ctx.strokeStyle = shape.strokeColor;
            ctx.lineWidth = shape.strokeWidth || 2;
            ctx.strokeRect(shape.x, shape.y, shape.width || 100, shape.height || 100);
          }
          break;

        case "circle":
          ctx.arc(shape.x, shape.y, shape.radius || 50, 0, Math.PI * 2);
          if (shape.fillColor) {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          if (shape.strokeColor) {
            ctx.strokeStyle = shape.strokeColor;
            ctx.lineWidth = shape.strokeWidth || 2;
            ctx.stroke();
          }
          break;

        case "line":
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.x2 || shape.x + 100, shape.y2 || shape.y);
          ctx.strokeStyle = shape.strokeColor || "#000";
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();
          break;

        case "triangle":
          const baseX = shape.x;
          const baseY = shape.y;
          const triWidth = shape.width || 100;
          const triHeight = shape.height || 100;
          ctx.moveTo(baseX, baseY);
          ctx.lineTo(baseX + triWidth / 2, baseY - triHeight);
          ctx.lineTo(baseX + triWidth, baseY);
          ctx.closePath();
          if (shape.fillColor) {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          if (shape.strokeColor) {
            ctx.strokeStyle = shape.strokeColor;
            ctx.lineWidth = shape.strokeWidth || 2;
            ctx.stroke();
          }
          break;

        case "text":
          ctx.font = "20px PingFang SC, Microsoft YaHei, sans-serif";
          ctx.fillStyle = shape.fillColor || "#000";
          ctx.fillText(shape.text || "", shape.x, shape.y);
          break;
      }
    });

    // 添加绘制完成动画
    gsap.fromTo(
      canvas,
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.4)" }
    );
  }, []);

  // 保存到图库
  const saveToGallery = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      addToast("error", "无法获取画布内容");
      return;
    }

    try {
      const thumbnail = canvas.toDataURL("image/png");
      const canvasData = JSON.stringify({
        width: canvas.width,
        height: canvas.height,
        description: sessionDescription,
        timestamp: Date.now(),
      });

      await artworkDB.save({
        userId: user?.id || "guest",
        title: sessionDescription.substring(0, 30) + (sessionDescription.length > 30 ? "..." : "") || "未命名作品",
        thumbnail,
        canvasData,
      });
      addToast("success", "作品已保存到图库");
    } catch (error) {
      console.error("保存到图库失败:", error);
      addToast("error", "保存到图库失败");
    }
  }, [canvasRef, sessionDescription, user, addToast]);

  // 导出 PNG
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      addToast("error", "无法获取画布内容");
      return;
    }

    try {
      const link = document.createElement("a");
      link.download = `${sessionDescription.substring(0, 30) || "drawing"}_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      addToast("success", "图片已导出");
    } catch (error) {
      console.error("导出 PNG 失败:", error);
      addToast("error", "导出失败");
    }
  }, [canvasRef, sessionDescription, addToast]);

  // 处理开始绘图
  const handleStartDrawing = useCallback(async () => {
    if (!sessionDescription.trim()) {
      addToast("warning", "请先输入绘图描述");
      return;
    }

    setIsDrawing(true);
    addToast("info", "正在生成绘图...");

    try {
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sessionDescription }),
      });

      if (!response.ok) {
        throw new Error("绘图生成失败");
      }

      const instructions: DrawInstruction = await response.json();
      drawShapes(instructions);
      addToast("success", "绘图完成");
      
      // 自动保存到图库
      await saveToGallery();
    } catch (error) {
      console.error("Draw error:", error);
      addToast("error", "绘图失败，请重试");
    } finally {
      setIsDrawing(false);
    }
  }, [sessionDescription, drawShapes, addToast, saveToGallery]);

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
            className="absolute inset-4 bg-gradient-to-br from-white to-sakura-light/10 rounded-3xl border border-sakura/15 shadow-xl shadow-sakura/8 overflow-hidden"
          >
            {/* 背景装饰网格 */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #FFB7C5 0.5px, transparent 0.5px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full relative z-10 rounded-3xl"
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

                {/* 保存到图库 */}
                <button
                  onClick={saveToGallery}
                  className="p-2 rounded-xl text-text-secondary hover:text-mint hover:bg-mint-light/20 transition-all"
                  aria-label="保存到图库"
                  title="保存到图库"
                >
                  <Save className="w-5 h-5" />
                </button>

                {/* 导出 PNG */}
                <button
                  onClick={exportPNG}
                  className="p-2 rounded-xl text-text-secondary hover:text-macaron-blue hover:bg-macaron-blue-light/20 transition-all"
                  aria-label="导出 PNG"
                  title="导出 PNG"
                >
                  <Download className="w-5 h-5" />
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
                  &quot;画一个红色圆形&quot;
                </span>
              </p>
            </div>
          </div>
        </div>

        <div
          ref={descriptionRef}
          className="px-4 pb-4 bg-surface/80 backdrop-blur-sm"
        >
          <section className="rounded-3xl border border-sakura/10 bg-white/90 shadow-sm shadow-sakura/5">
            <div className="flex items-center gap-2 px-5 pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lavender/20 text-lavender">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  会话描述
                </h2>
                <p className="text-xs text-text-secondary">
                  语音识别完成后会先填入这里，等待下一步处理
                </p>
              </div>
            </div>

            <div className="p-4 pt-3">
              <textarea
                value={sessionDescription}
                onChange={(event) => setSessionDescription(event.target.value)}
                placeholder="识别结果会自动填入这里，你也可以继续补充或修改描述。"
                className="min-h-28 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-disabled focus:border-sakura focus:ring-2 focus:ring-sakura/30"
                aria-label="会话描述输入框"
              />

              {/* 绘图 Agent 按钮 */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleStartDrawing}
                  disabled={!sessionDescription.trim() || isDrawing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    sessionDescription.trim() && !isDrawing
                      ? "bg-lavender hover:bg-lavender/90 text-white shadow-sm"
                      : "bg-text-disabled text-white cursor-not-allowed"
                  }`}
                  aria-label="开始绘图"
                >
                  <Sparkles className={`w-4 h-4 ${isDrawing ? "animate-spin" : ""}`} />
                  {isDrawing ? "绘制中..." : "开始绘图"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Voice Control Area */}
        <div
          ref={voiceAreaRef}
          className="bg-surface/80 backdrop-blur-sm border-t border-sakura/10 p-4"
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

          {/* 语音输入组件 */}
          <XfyunVoiceInput
            onTranscriptChange={handleTranscriptChange}
            onFinalResult={handleFinalResult}
            transcript={transcript}
          />
        </div>
      </div>
    </div>
  );
}
