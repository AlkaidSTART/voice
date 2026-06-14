"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { authDB } from "../lib/db";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        await authDB.login(formData.email, formData.password);
        router.push("/");
      } else {
        // 注册
        if (!formData.name.trim()) {
          throw new Error("请输入用户名");
        }
        await authDB.register(formData.email, formData.password, formData.name);
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      // 访客模式：创建临时用户
      const guestUser = await authDB.register(
        `guest_${Date.now()}@voicecanvas.temp`,
        "guest",
        "访客用户"
      );
      router.push("/");
    } catch (err) {
      setError("访客登录失败，请重试");
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sakura-light mb-4">
            <Mic className="w-8 h-8 text-sakura" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            VoiceCanvas
          </h1>
          <p className="text-text-secondary">
            用声音，创作你的世界
          </p>
        </div>

        {/* 登录/注册表单 */}
        <div className="bg-surface rounded-3xl p-8 shadow-lg border border-border">
          {/* 切换按钮 */}
          <div className="flex mb-6 bg-bg rounded-xl p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                isLogin
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                !isLogin
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              注册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="请输入用户名"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-sakura focus:border-transparent transition-all"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="请输入邮箱"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-sakura focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-sakura focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/20 border border-error/30">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${
                loading
                  ? "bg-text-disabled cursor-not-allowed"
                  : "bg-sakura hover:bg-sakura/90 active:scale-95"
              }`}
            >
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </button>
          </form>

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-text-secondary">或者</span>
            </div>
          </div>

          {/* 访客登录 */}
          <button
            onClick={handleGuestLogin}
            className="w-full py-3 px-6 rounded-xl font-medium border-2 border-border text-text-primary hover:border-macaron-blue hover:bg-macaron-blue-light/30 transition-all"
          >
            作为访客体验
          </button>

          <p className="mt-4 text-center text-sm text-text-secondary">
            访客模式下作品不会保存到云端
          </p>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center text-sm text-text-secondary">
          <p>© 2025 VoiceCanvas · 让每个人都能创作</p>
        </div>
      </div>
    </div>
  );
}
