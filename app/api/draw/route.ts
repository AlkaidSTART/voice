import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { drawInstructionSchema } from "../../lib/draw-schema";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
    const apiKey = process.env.OPENAI_API_KEY;
    const modelName = process.env.OPENAI_API_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY");
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const openai = createOpenAI({
      baseURL: apiBase,
      apiKey,
    });

    const model = openai.chat(modelName);

    const result = await generateText({
      model,
      temperature: 0.2,
      prompt: `根据以下描述生成 Canvas 绘图指令。Canvas 尺寸为 800x600 像素。

用户描述: "${prompt}"

请只返回一个 JSON 对象，不要返回 Markdown，不要使用代码块，不要添加任何解释文字。
JSON 结构必须满足：
{
  "shapes": [
    {
      "type": "rectangle|circle|line|triangle|text",
      "x": number,
      "y": number,
      "width": number?,
      "height": number?,
      "radius": number?,
      "x2": number?,
      "y2": number?,
      "text": string?,
      "fillColor": string?,
      "strokeColor": string?,
      "strokeWidth": number?
    }
  ],
  "backgroundColor": string?
}

请确保：
- 坐标在 0-800 (x) 和 0-600 (y) 范围内
- 使用合理的颜色值
- 根据描述创建清晰的图形
- 如果某个字段不需要，就不要输出该字段
- 至少返回一个 shape`,
    });

    const normalizedText = result.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    const parsedJson = JSON.parse(normalizedText);
    const validated = drawInstructionSchema.parse(parsedJson);

    return Response.json(validated);
  } catch (error) {
    console.error("Error in draw API:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
