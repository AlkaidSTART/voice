"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, ArrowRight } from "lucide-react";
import gsap from "gsap";

export default function Home() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  // 粒子生成
  useEffect(() => {
    if (!particlesRef.current) return;

    const particles: HTMLDivElement[] = [];
    const colors = ["#FFB7C5", "#B5D5F5", "#D4C5F5", "#B5E8C7", "#FFE5A0"];

    for (let i = 0; i < 20; i++) {
      const el = document.createElement("div");
      el.className = "absolute rounded-full pointer-events-none";
      el.style.width = `${4 + Math.random() * 8}px`;
      el.style.height = el.style.width;
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.opacity = "0.4";
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      particlesRef.current.appendChild(el);
      particles.push(el);

      // 浮动动画
      gsap.to(el, {
        y: -30 - Math.random() * 50,
        x: (Math.random() - 0.5) * 40,
        opacity: 0,
        duration: 3 + Math.random() * 4,
        repeat: -1,
        delay: Math.random() * 5,
        ease: "power1.inOut",
        onRepeat: () => {
          el.style.left = `${Math.random() * 100}%`;
          el.style.top = `${Math.random() * 100}%`;
          gsap.set(el, { opacity: 0.4, y: 0, x: 0 });
        },
      });
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, []);

  // 入场动画
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      logoRef.current,
      { scale: 0, rotation: -180, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }
    )
      .fromTo(
        titleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.4"
      )
      .fromTo(
        subtitleRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        "-=0.3"
      )
      .fromTo(
        buttonRef.current,
        { y: 20, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" },
        "-=0.2"
      )
      .fromTo(
        hintRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        "-=0.2"
      );

    return () => {
      tl.kill();
    };
  }, []);

  // Logo 悬停动画
  const handleLogoHover = () => {
    if (!logoRef.current) return;
    gsap.to(logoRef.current, {
      scale: 1.1,
      rotation: 5,
      duration: 0.3,
      ease: "back.out(2)",
    });
  };

  const handleLogoLeave = () => {
    if (!logoRef.current) return;
    gsap.to(logoRef.current, {
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  // 按钮悬停动画
  const handleButtonHover = () => {
    if (!buttonRef.current) return;
    gsap.to(buttonRef.current, {
      scale: 1.05,
      boxShadow: "0 20px 40px rgba(255,183,197,0.4)",
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleButtonLeave = () => {
    if (!buttonRef.current) return;
    gsap.to(buttonRef.current, {
      scale: 1,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      duration: 0.3,
      ease: "power2.out",
    });
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-bg via-sakura-light/10 to-macaron-blue-light/10 flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* 粒子层 */}
      <div ref={particlesRef} className="absolute inset-0 overflow-hidden" />

      {/* 背景装饰 */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-sakura/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-macaron-blue/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-lavender/5 rounded-full blur-2xl" />

      <div className="w-full max-w-md text-center relative z-10">
        {/* Logo */}
        <div
          ref={logoRef}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-sakura-light to-sakura/30 mb-8 shadow-xl shadow-sakura/20 cursor-pointer"
          onMouseEnter={handleLogoHover}
          onMouseLeave={handleLogoLeave}
        >
          <Mic className="w-12 h-12 text-sakura" />
        </div>

        {/* 标题 */}
        <h1
          ref={titleRef}
          className="text-5xl font-bold text-text-primary mb-4 tracking-tight"
        >
          VoiceCanvas
        </h1>
        <p ref={subtitleRef} className="text-text-secondary mb-10 text-xl">
          用声音，创作你的世界
        </p>

        {/* 登录按钮 */}
        <button
          ref={buttonRef}
          onClick={() => router.push("/login")}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
          className="w-full py-4 px-6 rounded-xl font-semibold text-lg text-white bg-gradient-to-r from-sakura to-sakura/80 shadow-lg flex items-center justify-center gap-3 mx-auto max-w-xs"
        >
          <span>开始创作</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p ref={hintRef} className="mt-6 text-sm text-text-secondary">
          登录后即可保存你的作品
        </p>
      </div>
    </div>
  );
}
