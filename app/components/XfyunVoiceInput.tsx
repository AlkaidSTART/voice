"use client";

import { useState, useCallback, useRef } from "react";
import { buildWsUrl } from "../lib/xfyun-signature";

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void;
  transcript: string;
}

/** 听写词结果 */
interface XfyunCw {
  w: string; // 词内容
}

/** 听写句子结果 */
interface XfyunWs {
  bg: number; // 开始时间
  ed: number; // 结束时间
  cw?: XfyunCw[]; // 词列表
  onebest?: string; // 最优结果（旧格式）
}

/** base64解码后的文本结果 */
interface XfyunDecodedResult {
  ws?: XfyunWs[]; // 句子列表
  ls?: number; // 是否最后一片结果
}

interface XfyunResult {
  action?: string;
  code?: string | number;
  message?: string;
  desc?: string;
  
  /** 协议头部 */
  header?: {
    /** 返回码 0表示会话调用成功，其它表示会话调用异常 */
    code: number;
    /** 本次会话id */
    sid: string;
    /** 数据状态 0:开始, 1:继续, 2:结束 */
    status: number;
    /** 描述信息 */
    message?: string;
  };
  
  /** 数据段，用于携带响应的数据 */
  payload?: {
    result?: {
      /** 文本压缩格式 */
      compress?: string;
      /** 文本编码 */
      encoding?: string;
      /** 文本格式 */
      format?: string;
      /** 数据序号 0-999999 */
      seq?: number;
      /** 0:开始, 1:继续, 2:结束 */
      status?: number;
      /** 听写数据文本 base64编码 */
      text?: string;
    };
  };
  
  /** 兼容旧的响应格式 */
  data?: {
    result?: {
      ws?: XfyunWs[];
    };
    status?: number;
    code?: string | number;
    message?: string;
  };
  
  sid?: string;
}

export default function XfyunVoiceInput({ onTranscriptChange, transcript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [partialResult, setPartialResult] = useState("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isStopRef = useRef(false);

  const APP_ID = process.env.NEXT_PUBLIC_XFYUN_APP_ID || "";
  const API_KEY = process.env.NEXT_PUBLIC_XFYUN_API_KEY || "";
  const API_SECRET = process.env.NEXT_PUBLIC_XFYUN_API_SECRET || "";

  const hasConfig = APP_ID && API_KEY && API_SECRET;

  const handleStop = useCallback(() => {
    setIsListening(false);
    isStopRef.current = true;
    
    if (wsRef.current) {
      try {
        const endPacket = {
          header: {
            app_id: APP_ID,
            res_id: "hot_words", // 资源标识
            status: 2, // 2:最后一帧
          },
          payload: {
            audio: {
              encoding: "raw",
              sample_rate: 16000,
              channels: 1,
              bit_depth: 16,
              seq: 591, // 数据序号
              status: 2, // 2:结束
              audio: "", // 结束帧音频数据为空
            },
          },
        };
        wsRef.current.send(JSON.stringify(endPacket));
        
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
        }, 1000);
      } catch (err) {
        console.error("发送结束帧失败:", err);
        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch (e) {
            console.error("关闭连接失败:", e);
          }
          wsRef.current = null;
        }
      }
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.error("关闭音频上下文失败:", e);
      }
      audioContextRef.current = null;
    }
  }, [APP_ID]);

  const handleStart = useCallback(async () => {
    if (!hasConfig) {
      setRuntimeError("请配置讯飞语音识别参数");
      return;
    }
    
    setRuntimeError(null);
    setPartialResult("");
    isStopRef.current = false;

    try {
      console.log("正在请求麦克风权限...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("麦克风权限获取成功");
      
      const url = await buildWsUrl({ appId: APP_ID, apiKey: API_KEY, apiSecret: API_SECRET });
      console.log("WebSocket URL:", url);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      mediaStreamSource.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      let seq = 0;
      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (ws.readyState === WebSocket.OPEN && !isStopRef.current) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          const outputBuffer = new Int16Array(inputBuffer.length);
          
          for (let i = 0; i < inputBuffer.length; i++) {
            outputBuffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }
          
          // 将音频数据转换为 base64 编码
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(outputBuffer.buffer)));
          
          // 构建音频数据包（中间帧）
          const audioPacket = {
            header: {
              app_id: APP_ID,
              res_id: "hot_words", // 资源标识
              status: 1, // 1:中间帧
            },
            payload: {
              audio: {
                encoding: "raw",
                sample_rate: 16000,
                channels: 1,
                bit_depth: 16,
                seq: seq++, // 数据序号（从2开始）
                status: 1, // 1:继续
                audio: base64Audio, // base64 编码的音频数据
              },
            },
          };
          
          ws.send(JSON.stringify(audioPacket));
        }
      };

      ws.onopen = () => {
        console.log("WebSocket 连接成功");
        const startPacket = {
          header: {
            app_id: APP_ID,
            res_id: "hot_words", // 资源标识
            status: 0, // 0:首帧
          },
          parameter: {
            iat: {
              domain: "slm", // 语音听写领域
              language: "zh_cn", // 语种
              accent: "mandarin", // 口音
              eos: 6000, // 静音检测结束阈值（毫秒）
              dwa: "wpgs", // 动态修正
              result: {
                encoding: "utf8", // 结果编码
                compress: "raw", // 结果压缩
                format: "json", // 结果格式
              },
            },
          },
          payload: {
            audio: {
              encoding: "raw", // 音频编码格式
              sample_rate: 16000, // 音频采样率
              channels: 1, // 音频声道
              bit_depth: 16, // 音频位深
              seq: 1, // 数据序号
              status: 0, // 0:开始
              audio: "", // 首帧音频数据为空
            },
          },
        };
        ws.send(JSON.stringify(startPacket));
        setPartialResult("");
        setIsListening(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        console.log("收到讯飞消息:", event.data);
        try {
          const result: XfyunResult = JSON.parse(event.data);
          
          // 检查是否是错误响应
          const errorCode = result.code || result.header?.code;
          const errorDesc = result.desc || result.header?.message;
          
          if (errorCode && errorCode !== 0) {
            console.error(`讯飞语音识别错误 ${errorCode}: ${errorDesc}`);
            setRuntimeError(`语音识别错误 (${errorCode}): ${errorDesc || "未知错误"}`);
            handleStop();
            return;
          }
          
          // 解析语音听写响应格式
          if (result.payload?.result?.text) {
            try {
              // 解码 base64 编码的文本（UTF-8）
              const base64Text = result.payload.result.text;
              const binaryString = atob(base64Text);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const decodedText = new TextDecoder('utf-8').decode(bytes);
              console.log("解码后的文本:", decodedText);
              
              // 解析为 JSON
              const decodedResult: XfyunDecodedResult = JSON.parse(decodedText);
              
              // 提取听写结果
              if (decodedResult.ws && decodedResult.ws.length > 0) {
                let frameText = "";
                decodedResult.ws.forEach((item: XfyunWs) => {
                  if (item.cw && item.cw.length > 0) {
                    item.cw.forEach((cw: XfyunCw) => {
                      if (cw.w) {
                        frameText += cw.w;
                      }
                    });
                  }
                });
                
                // 动态修正模式下，每帧返回的是最新完整结果，直接使用
                console.log("识别结果:", frameText);
                
                // 实时更新显示
                setPartialResult(frameText);
                onTranscriptChange(frameText);
              }
            } catch (decodeError) {
              console.error("解码讯飞响应失败:", decodeError);
            }
          }
          
          // 检查是否是最后一帧（header.status === 2 表示结束）
          const headerStatus = result.header?.status;
          const resultStatus = result.payload?.result?.status;
          if (headerStatus === 2 || resultStatus === 2) {
            console.log("收到最后一帧，停止识别");
            handleStop();
          }
          
          // 兼容旧的 result 格式
          if (result.action === "result" && result.data?.result?.ws) {
            const wsData = result.data.result.ws;
            if (wsData && wsData.length > 0) {
              const text = wsData.map((item: XfyunWs) => item.onebest || "").join("");
              setPartialResult(text);
              onTranscriptChange(text);
            }
          }
        } catch (e) {
          console.error("解析讯飞响应失败:", e);
        }
      };

      ws.onerror = (error: Event) => {
        console.error("WebSocket 错误:", error);
        setRuntimeError("语音识别连接错误，请检查网络连接");
        handleStop();
      };

      ws.onclose = (event) => {
        console.log("WebSocket 连接关闭:", event.code, event.reason);
        setIsListening(false);
      };

    } catch (err) {
      console.error("启动语音识别失败:", err);
      const errorMsg = err instanceof Error ? err.message : "未知错误";
      if (errorMsg.includes("Permission denied")) {
        setRuntimeError("麦克风访问被拒绝，请在浏览器设置中允许麦克风权限");
      } else {
        setRuntimeError(`无法启动语音识别: ${errorMsg}`);
      }
    }
  }, [hasConfig, onTranscriptChange, handleStop, APP_ID]);

  const startListening = useCallback(() => {
    handleStart();
  }, [handleStart]);

  const stopListening = useCallback(() => {
    handleStop();
  }, [handleStop]);

  const clearTranscript = useCallback(() => {
    onTranscriptChange("");
    setManualInput("");
    setPartialResult("");
  }, [onTranscriptChange]);

  const handleManualSubmit = useCallback(() => {
    if (manualInput.trim()) {
      onTranscriptChange(manualInput.trim());
    }
  }, [manualInput, onTranscriptChange]);

  // 渲染部分
  return (
    <div className="voice-input-container">
      {runtimeError && (
        <div className="error-message">
          {runtimeError}
        </div>
      )}
      
      <div className="transcript-display">
        {partialResult || transcript || "等待语音输入..."}
      </div>
      
      <div className="manual-input-container">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleManualSubmit();
            }
          }}
          placeholder="手动输入绘图描述..."
          className="manual-input"
        />
        <button onClick={handleManualSubmit} className="submit-button">
          使用文本
        </button>
      </div>
      
      <div className="controls">
        {!isListening ? (
          <button onClick={startListening} className="start-button">
            🎤 开始录音
          </button>
        ) : (
          <button onClick={stopListening} className="stop-button">
            ⏹️ 停止录音
          </button>
        )}
        
        <button onClick={clearTranscript} className="clear-button">
          🗑️ 清空
        </button>
      </div>
    </div>
  );
}