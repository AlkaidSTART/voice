"use client";

import { useRef, useEffect, useCallback } from "react";
import type { DrawInstruction } from "../lib/draw-schema";

interface CanvasDrawProps {
  instruction: DrawInstruction | null;
}

export default function CanvasDraw({ instruction }: CanvasDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawShape = useCallback((
    ctx: CanvasRenderingContext2D,
    shape: DrawInstruction["shapes"][0]
  ) => {
    ctx.save();

    // 设置样式
    if (shape.fillColor) {
      ctx.fillStyle = shape.fillColor;
    }
    if (shape.strokeColor) {
      ctx.strokeStyle = shape.strokeColor;
    }
    if (shape.strokeWidth) {
      ctx.lineWidth = shape.strokeWidth;
    }

    switch (shape.type) {
      case "rectangle":
        if (shape.width && shape.height) {
          if (shape.fillColor) {
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
          }
          if (shape.strokeColor) {
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
          }
        }
        break;

      case "circle":
        if (shape.radius) {
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
          if (shape.fillColor) {
            ctx.fill();
          }
          if (shape.strokeColor) {
            ctx.stroke();
          }
        }
        break;

      case "line":
        if (shape.x2 !== undefined && shape.y2 !== undefined) {
          ctx.beginPath();
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.x2, shape.y2);
          ctx.stroke();
        }
        break;

      case "triangle":
        if (shape.width && shape.height) {
          ctx.beginPath();
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.x + shape.width, shape.y);
          ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height);
          ctx.closePath();
          if (shape.fillColor) {
            ctx.fill();
          }
          if (shape.strokeColor) {
            ctx.stroke();
          }
        }
        break;

      case "text":
        if (shape.text) {
          ctx.font = "16px sans-serif";
          if (shape.fillColor) {
            ctx.fillText(shape.text, shape.x, shape.y);
          } else {
            ctx.fillStyle = "#000000";
            ctx.fillText(shape.text, shape.x, shape.y);
          }
        }
        break;
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 设置背景色
    if (instruction?.backgroundColor) {
      ctx.fillStyle = instruction.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 绘制形状
    if (instruction?.shapes) {
      instruction.shapes.forEach((shape) => {
        drawShape(ctx, shape);
      });
    }
  }, [instruction, drawShape]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">绘图结果</h2>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-auto bg-white"
        />
      </div>
      {!instruction && (
        <p className="mt-4 text-gray-500 text-center">
          点击&quot;生成图像&quot;按钮开始绘制
        </p>
      )}
    </div>
  );
}
