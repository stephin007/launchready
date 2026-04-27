import { logger } from "../lib/logger";

interface RawTask {
  id: string;
  title: string;
  description: string;
  dependsOn: string[];
  status: string;
}

interface RawUserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  tasks: RawTask[];
}

export interface RawPrdContent {
  title: string;
  summary: string;
  goals: string[];
  successMetrics: string[];
  userStories: RawUserStory[];
}

export async function callOpenRouter(params: {
  problem: string;
  audience: string;
  success: string;
  productName?: string | null;
}): Promise<RawPrdContent> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const systemPrompt = `You are a senior product manager and engineering lead. Your job is to take a non-technical founder's raw idea and convert it into a structured, engineering-ready Product Requirements Document (PRD). Write in plain English — avoid corporate jargon. Always respond in valid JSON only. No markdown, no explanations, no backticks, just the raw JSON object.`;

  const userPrompt = `A founder wants to build a feature:

Problem it solves: ${params.problem}
Who it's for: ${params.audience}
What success looks like: ${params.success}
Product name (optional): ${params.productName || "Not specified"}

Generate a complete PRD as a JSON object with EXACTLY this structure:
{
  "title": "concise feature name",
  "summary": "2-3 sentence product summary in plain English",
  "goals": ["3-4 measurable goals"],
  "successMetrics": ["3-4 specific KPIs with numbers where possible"],
  "userStories": [
    {
      "id": "US-1",
      "title": "short story title",
      "asA": "user type",
      "iWant": "the action they want to do",
      "soThat": "the benefit they get",
      "acceptanceCriteria": [
        "This is done when: [specific condition]",
        "This is done when: [specific condition]",
        "This is done when: [specific condition]"
      ],
      "tasks": [
        {
          "id": "T-1",
          "title": "specific engineering task title",
          "description": "what needs to be built",
          "dependsOn": [],
          "status": "todo"
        }
      ]
    }
  ]
}

Generate 3-5 user stories. Each story should have 3-5 tasks. Make tasks specific and actionable for an engineering team.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://launchready.app",
      "X-Title": "LaunchReady",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, "OpenRouter API error");
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenRouter");
  }

  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned) as RawPrdContent;
  } catch {
    logger.error({ content }, "Failed to parse OpenRouter response as JSON");
    throw new Error("Invalid JSON response from OpenRouter");
  }
}
