import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { drawInstructionSchema } from "../../lib/draw-schema";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const apiBase = process.env.OPENAI_API_BASE || "https://api.deepseek.com/v1";
    const apiKey = process.env.OPENAI_API_KEY;
    const modelName = process.env.OPENAI_API_MODEL || "deepseek-chat";

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
      temperature: 0.3,
      prompt: `你是一个专业的Canvas绘图指令生成器。根据用户的自然语言描述，生成精确的Canvas绘图指令。

Canvas尺寸：800x600像素
坐标系：左上角为原点(0,0)，x轴向右延伸，y轴向下延伸

用户描述："${prompt}"

请生成JSON格式的绘图指令，结构如下：
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

绘图规则：
1. 坐标必须在合理范围内：x: 0-800, y: 0-600
2. 颜色使用标准格式：#RRGGBB 或颜色名称（如 red, blue, green）
3. 根据描述合理设置图形大小和位置
4. 如果用户指定了位置（如"左边"、"中间"、"右上角"），请对应到具体坐标：
   - 左边：x约50-200
   - 中间：x约300-500
   - 右边：x约600-750
   - 上方：y约50-200
   - 中间：y约250-350
   - 下方：y约400-550
5. 如果用户指定了大小（如"大"、"小"），请对应到具体尺寸：
   - 大：width/height约150-200
   - 中：width/height约80-120
   - 小：width/height约30-50
6. 只返回JSON对象，不要包含任何解释文字或Markdown标记
7. 确保JSON格式正确，可以被直接解析`,
    });

    const normalizedText = result.text.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let parsedJson;
    try {
      parsedJson = JSON.parse(normalizedText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw text:", result.text);
      return Response.json(
        { error: "Failed to parse drawing instructions" },
        { status: 500 }
      );
    }

    const validated = drawInstructionSchema.parse(parsedJson);

    return Response.json(validated);
  } catch (error) {
    console.error("Error in draw API:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
