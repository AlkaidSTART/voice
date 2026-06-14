"use client";

import { useState, useCallback } from "react";
import XfyunVoiceInput from "./components/XfyunVoiceInput";
import CanvasDraw from "./components/CanvasDraw";
import type { DrawInstruction } from "./lib/draw-schema";

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [instruction, setInstruction] = useState<DrawInstruction | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscriptChange = useCallback((newTranscript: string) => {
    setTranscript(newTranscript);
    setError(null);
  }, []);

  const generateImage = useCallback(async () => {
    if (!transcript.trim()) {
      setError("请先输入绘图描述");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: transcript }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "生成图像失败");
      }

      const data = (await response.json()) as DrawInstruction;
      setInstruction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成图像时发生错误");
    } finally {
      setIsGenerating(false);
    }
  }, [transcript]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            语音绘图助手
          </h1>
          <p className="text-gray-600">
            说出你想绘制的内容，AI 将为你生成图像
          </p>
        </header>

        <div className="space-y-6">
          <XfyunVoiceInput
            onTranscriptChange={handleTranscriptChange}
            transcript={transcript}
          />

          <div className="w-full max-w-2xl mx-auto">
            <button
              onClick={generateImage}
              disabled={isGenerating || !transcript.trim()}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                isGenerating || !transcript.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  正在生成...
                </span>
              ) : (
                "生成图像"
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <CanvasDraw instruction={instruction} />
        </div>
      </div>
    </div>
  );
}
