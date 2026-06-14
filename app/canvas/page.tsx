"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Image, LogOut } from "lucide-react";
import MicButton, { MicButtonState } from "../components/MicButton";
import Toast, { ToastType } from "../components/Toast";
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
        // 模拟处理
        setTimeout(() => {
          setMicState("idle");
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
        <div className="text-text-secondary">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
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
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sakura-light flex items-center justify-center">
            <span className="text-sakura font-bold text-sm">VC</span>
          </div>
          <span className="font-semibold text-text-primary">VoiceCanvas</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => addToast("info", "图库功能开发中")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
            aria-label="打开图库"
          >
            <Image className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">图库</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
            aria-label="登出"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">登出</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-macaron-blue-light flex items-center justify-center">
              <User className="w-4 h-4 text-macaron-blue" />
            </div>
            <span className="text-sm text-text-primary hidden sm:inline">
              {user.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-white m-4 rounded-2xl border border-border shadow-sm">
            {/* Canvas */}
            <canvas
              className="w-full h-full"
              role="img"
              aria-label="绘图画布 - 通过语音指令控制绘图"
            />

            {/* Toolbar */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-surface/95 backdrop-blur-sm rounded-2xl border border-border shadow-lg px-4 py-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => addToast("info", "撤销功能开发中")}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
                  aria-label="撤销"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => addToast("info", "重做功能开发中")}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
                  aria-label="重做"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                    />
                  </svg>
                </button>

                <div className="w-px h-6 bg-border" />

                <button
                  onClick={() => addToast("info", "清空功能开发中")}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
                  aria-label="清空画布"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>

                <div className="w-px h-6 bg-border" />

                {/* 当前颜色指示 */}
                <div className="flex items-center gap-2 px-2">
                  <div className="w-4 h-4 rounded-full bg-macaron-blue border border-border" />
                  <span className="text-xs text-text-secondary">蓝色</span>
                </div>

                <div className="w-px h-6 bg-border" />

                {/* 模式标签 */}
                <div className="px-3 py-1 rounded-full bg-macaron-blue-light text-macaron-blue text-xs font-medium">
                  绘图模式
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Bar */}
        <div className="h-12 bg-surface border-t border-border flex items-center px-6">
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sakura animate-pulse" />
            <p className="text-sm text-text-secondary">
              {transcript || "说出你想绘制的内容..."}
            </p>
          </div>
        </div>

        {/* Voice Control Area */}
        <div className="h-24 bg-surface border-t border-border flex items-center justify-center">
          <MicButton state={micState} onClick={handleMicClick} />
        </div>
      </div>
    </div>
  );
}
