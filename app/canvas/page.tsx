'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Image,
  LogOut,
  User,
  RotateCcw,
  RotateCw,
  FilePlus,
  Trash2,
  Save,
  Download,
  Sparkles,
} from 'lucide-react';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import { authDB, artworkDB } from '../lib/db';
import type { User as UserType } from '../lib/db';
import { DrawInstruction } from '../lib/draw-schema';
import XfyunVoiceInput from '../components/XfyunVoiceInput';
import SaveModal from '../components/SaveModal';
import Toast from '../components/Toast';

export default function CanvasPage() {
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const voiceAreaRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const [sessionDescription, setSessionDescription] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [currentArtworkId, setCurrentArtworkId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [micState, setMicState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [user, setUser] = useState<UserType | null>(null);

  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }[]>([]);

  // 加载用户信息
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authDB.getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLogout = useCallback(async () => {
    await authDB.logout();
    router.push('/login');
  }, [router]);

  const handleTranscriptChange = useCallback((newTranscript: string) => {
    setTranscript(newTranscript);
  }, []);

  const handleFinalResult = useCallback((finalTranscript: string) => {
    if (finalTranscript.trim()) {
      setSessionDescription(finalTranscript);
      setMicState('idle');
      addToast('success', '识别结果已填入绘图描述');
    }
  }, [addToast]);

  // 绘制图形到 Canvas
  const drawShapes = useCallback((instructions: DrawInstruction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置固定 Canvas 尺寸
    const fixedWidth = 800;
    const fixedHeight = 600;
    canvas.width = fixedWidth;
    canvas.height = fixedHeight;

    // 绘制背景
    if (instructions.backgroundColor) {
      ctx.fillStyle = instructions.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 绘制每个图形
    instructions.shapes.forEach((shape) => {
      ctx.beginPath();

      switch (shape.type) {
        case 'rectangle':
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

        case 'circle':
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

        case 'line':
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.x2 || shape.x + 100, shape.y2 || shape.y);
          ctx.strokeStyle = shape.strokeColor || '#000';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();
          break;

        case 'triangle':
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

        case 'text':
          ctx.font = '20px PingFang SC, Microsoft YaHei, sans-serif';
          ctx.fillStyle = shape.fillColor || '#000';
          ctx.fillText(shape.text || '', shape.x, shape.y);
          break;
      }
    });

    // 添加绘制完成动画
    gsap.fromTo(
      canvas,
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }
    );
  }, []);

  // 初始化Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置固定尺寸
    const fixedWidth = 800;
    const fixedHeight = 600;
    canvas.width = fixedWidth;
    canvas.height = fixedHeight;

    // 初始化白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 保存到图库（带命名）
  const handleSaveClick = useCallback(() => {
    const defaultTitle = sessionDescription.substring(0, 30) || '未命名作品';
    setSaveTitle(defaultTitle);
    setSaveModalOpen(true);
  }, [sessionDescription]);

  const handleSaveConfirm = useCallback(async (title: string) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      addToast('error', '无法获取画布内容');
      return;
    }

    try {
      const thumbnail = canvas.toDataURL('image/png');
      const canvasData = JSON.stringify({
        width: canvas.width,
        height: canvas.height,
        description: sessionDescription,
        timestamp: Date.now(),
      });

      if (currentArtworkId) {
        await artworkDB.update(currentArtworkId, {
          title,
          thumbnail,
          canvasData,
        });
      } else {
        await artworkDB.save({
          userId: user?.id || 'guest',
          title,
          thumbnail,
          canvasData,
        });
      }

      setSaveModalOpen(false);
      setHasUnsavedChanges(false);
      addToast('success', '作品已保存到图库');
    } catch (error) {
      console.error('保存失败:', error);
      addToast('error', '保存失败，请重试');
    }
  }, [canvasRef, sessionDescription, currentArtworkId, user, addToast]);

  // 新建画布（自动保存当前作品）
  const handleNewCanvas = useCallback(async () => {
    // 如果有未保存的更改，先自动保存
    if (hasUnsavedChanges) {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const thumbnail = canvas.toDataURL('image/png');
          const canvasData = JSON.stringify({
            width: canvas.width,
            height: canvas.height,
            description: sessionDescription,
            timestamp: Date.now(),
          });
          const defaultTitle = sessionDescription.substring(0, 30) || '未命名作品';

          if (currentArtworkId) {
            await artworkDB.update(currentArtworkId, {
              title: defaultTitle,
              thumbnail,
              canvasData,
            });
          } else {
            await artworkDB.save({
              userId: user?.id || 'guest',
              title: defaultTitle,
              thumbnail,
              canvasData,
            });
          }
          addToast('info', '当前作品已自动保存');
        } catch (error) {
          console.error('自动保存失败:', error);
        }
      }
    }

    // 清空画布和状态
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    setSessionDescription('');
    setTranscript('');
    setCurrentArtworkId(null);
    setHasUnsavedChanges(false);
    addToast('success', '已创建新画布');
  }, [hasUnsavedChanges, canvasRef, sessionDescription, currentArtworkId, user, addToast]);

  // 导出 PNG
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      addToast('error', '无法获取画布内容');
      return;
    }

    try {
      const link = document.createElement('a');
      const title = sessionDescription.substring(0, 30) || 'drawing';
      link.download = `${title}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      addToast('success', '图片已导出');
    } catch (error) {
      console.error('导出 PNG 失败:', error);
      addToast('error', '导出失败');
    }
  }, [canvasRef, sessionDescription, addToast]);

  // 清空画布
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasUnsavedChanges(true);
    addToast('success', '画布已清空');
  }, [canvasRef, addToast]);

  // 打开图库
  const openGallery = useCallback(() => {
    router.push('/gallery');
  }, [router]);

  // 处理开始绘图
  const handleStartDrawing = useCallback(async () => {
    if (!sessionDescription.trim()) {
      addToast('warning', '请先输入绘图描述');
      return;
    }

    setIsDrawing(true);
    addToast('info', '正在生成绘图...');

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sessionDescription }),
      });

      if (!response.ok) {
        throw new Error('绘图生成失败');
      }

      const instructions: DrawInstruction = await response.json();
      drawShapes(instructions);
      setHasUnsavedChanges(true);
      addToast('success', '绘图完成，记得保存作品');
    } catch (error) {
      console.error('Draw error:', error);
      addToast('error', '绘图失败，请重试');
    } finally {
      setIsDrawing(false);
    }
  }, [sessionDescription, drawShapes, addToast]);

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
            onClick={openGallery}
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
      <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-4">
        {/* Canvas Area with Sidebar */}
        <div className="flex gap-4 items-start">
          {/* Canvas Container */}
          <div
            ref={canvasAreaRef}
            className="relative bg-gradient-to-br from-white to-sakura-light/10 rounded-3xl border border-sakura/15 shadow-xl shadow-sakura/8 overflow-hidden"
            style={{ width: '800px', height: '600px' }}
          >
            {/* 背景装饰网格 */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #FFB7C5 0.5px, transparent 0.5px)',
                backgroundSize: '32px 32px',
              }}
            />

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
              style={{ width: '100%', height: '100%' }}
              role="img"
              aria-label="绘图画布 - 通过语音指令控制绘图"
            />

            {/* 右上角装饰 - 操作提示 */}
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-xl border border-sakura/10 shadow-sm px-4 py-2">
              <p className="text-xs text-text-secondary">
                试试说：
                <span className="text-sakura font-medium ml-1">
                  "画一个红色圆形&quot;
                </span>
              </p>
            </div>
          </div>

          {/* Sidebar Toolbar */}
          <div
            ref={toolbarRef}
            className="bg-surface/95 backdrop-blur-sm rounded-2xl border border-sakura/10 shadow-lg p-3 flex flex-col gap-1"
          >
            {/* 撤销 */}
            <button
              onClick={() => addToast('info', '撤销功能开发中')}
              className="p-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-sakura-light/20 transition-all"
              aria-label="撤销"
              title="撤销"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* 重做 */}
            <button
              onClick={() => addToast('info', '重做功能开发中')}
              className="p-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-sakura-light/20 transition-all"
              aria-label="重做"
              title="重做"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <div className="w-full h-px bg-border my-1" />

            {/* 新建画布 */}
            <button
              onClick={handleNewCanvas}
              className="p-3 rounded-xl text-text-secondary hover:text-lavender hover:bg-lavender-light/20 transition-all"
              aria-label="新建画布"
              title="新建画布"
            >
              <FilePlus className="w-5 h-5" />
            </button>

            {/* 清空画布 */}
            <button
              onClick={clearCanvas}
              className="p-3 rounded-xl text-text-secondary hover:text-error hover:bg-error/10 transition-all"
              aria-label="清空画布"
              title="清空画布"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="w-full h-px bg-border my-1" />

            {/* 保存到图库 */}
            <button
              onClick={handleSaveClick}
              className="p-3 rounded-xl text-text-secondary hover:text-mint hover:bg-mint-light/20 transition-all"
              aria-label="保存到图库"
              title="保存到图库"
            >
              <Save className="w-5 h-5" />
            </button>

            {/* 导出 PNG */}
            <button
              onClick={exportPNG}
              className="p-3 rounded-xl text-text-secondary hover:text-macaron-blue hover:bg-macaron-blue-light/20 transition-all"
              aria-label="导出 PNG"
              title="导出 PNG"
            >
              <Download className="w-5 h-5" />
            </button>

            <div className="w-full h-px bg-border my-1" />

            {/* 当前颜色指示 */}
            <div className="flex flex-col items-center gap-1 p-2">
              <div className="w-6 h-6 rounded-full bg-sakura border-2 border-white shadow-sm" />
              <span className="text-xs text-text-secondary font-medium">樱花粉</span>
            </div>

            <div className="w-full h-px bg-border my-1" />

            {/* 模式标签 */}
            <div className="px-3 py-2 rounded-full bg-sakura-light text-sakura text-xs font-semibold text-center">
              绘图模式
            </div>
          </div>
        </div>

        {/* Description Area - 缩小高度 */}
        <div
          ref={descriptionRef}
          className="w-full max-w-3xl mt-4"
        >
          <section className="rounded-3xl border border-sakura/10 bg-white/90 shadow-sm shadow-sakura/5">
            <div className="flex items-center gap-2 px-5 pt-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender/20 text-lavender">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary">
                绘图描述
              </h2>
            </div>

            <div className="p-4 pt-2">
              <textarea
                value={sessionDescription}
                onChange={(event) => setSessionDescription(event.target.value)}
                placeholder="输入绘图描述..."
                className="min-h-[60px] max-h-[100px] w-full resize-none rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none transition-all placeholder:text-text-disabled focus:border-sakura focus:ring-2 focus:ring-sakura/30"
                aria-label="绘图描述输入框"
              />

              {/* 绘图 Agent 按钮 */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleStartDrawing}
                  disabled={!sessionDescription.trim() || isDrawing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    sessionDescription.trim() && !isDrawing
                      ? 'bg-lavender hover:bg-lavender/90 text-white shadow-sm'
                      : 'bg-text-disabled text-white cursor-not-allowed'
                  }`}
                  aria-label="开始绘图"
                >
                  <Sparkles className={`w-4 h-4 ${isDrawing ? 'animate-spin' : ''}`} />
                  {isDrawing ? '绘制中...' : '开始绘图'}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Voice Control Area - 缩小高度 */}
        <div
          ref={voiceAreaRef}
          className="w-full max-w-3xl mt-4 mb-4"
        >
          {/* 语音输入组件 */}
          <XfyunVoiceInput
            onTranscriptChange={handleTranscriptChange}
            onFinalResult={handleFinalResult}
            transcript={transcript}
          />
        </div>
      </div>

      {/* Save Modal */}
      <SaveModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveConfirm}
        title={saveTitle}
        onTitleChange={setSaveTitle}
      />
    </div>
  );
}
