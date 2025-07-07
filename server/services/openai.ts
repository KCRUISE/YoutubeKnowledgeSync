import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface VideoSummary {
  title: string;
  content: string;
  keyPoints: string[];
  tags: string[];
  sections: SummarySection[];
  insights: string[];
  coreTheme: string;
}

export interface SummarySection {
  title: string;
  timestamp?: string;
  content: string;
  keyWords: string[];
}

export class OpenAIService {
  async summarizeVideo(videoTitle: string, videoDescription: string, transcript?: string): Promise<VideoSummary> {
    try {
      const content = transcript || videoDescription || videoTitle;
      
      const prompt = `
다음 YouTube 비디오의 내용을 lilys.ai 스타일로 정확하게 요약해주세요. lilys.ai는 간결하고 핵심적인 내용만 담아 매우 효율적으로 요약합니다.

비디오 제목: ${videoTitle}
비디오 설명: ${videoDescription}
${transcript ? `스크립트: ${transcript}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "title": "${videoTitle}",
  "coreTheme": "핵심 주제를 한 문장으로 간결하게 요약",
  "content": "AI 시장은 현재 ==생산성, 자동화, 수익 극대화==에 집중되어 있으며, 이는 전문가들이 '거의 미친 수준'이라고 평가할 정도입니다.\n\n**AI의 교육 분야 영향**\n- 생성형 AI는 **양날의 검**과 같아서 올바르게 사용하면 훌륭한 교육 도구가 됩니다\n- 하지만 남용할 경우 학습 능력과 창의성을 저해할 위험이 있습니다\n- AI가 인간 강사보다 더 효과적으로 개념을 설명할 수 있지만, 과도한 의존은 문제입니다\n\n**시장 동향과 우려사항**\n현재 AI 시장의 생산성과 수익 중심 접근 방식이 인간의 학습 능력과 창의성을 침식시킬 위험성이 제기되고 있습니다.",
  "sections": [
    {
      "title": "AI 시장의 현재 상황",
      "timestamp": "0:00-5:30",
      "content": "AI 시장이 생산성, 자동화, 수익에 극도로 집중되어 있는 현상을 분석",
      "keyWords": ["생산성", "자동화", "수익"]
    },
    {
      "title": "AI와 교육의 관계",
      "timestamp": "5:30-15:00",
      "content": "생성형 AI가 교육에 미치는 양면적 영향과 올바른 활용 방안",
      "keyWords": ["교육", "학습", "창의성"]
    }
  ],
  "keyPoints": [
    "AI 시장이 생산성과 수익에만 집중되어 있는 현상",
    "생성형 AI의 교육적 활용 가능성과 위험성",
    "AI 의존도가 높아질 때 인간의 학습 능력 저하 우려",
    "적절한 AI 활용을 통한 교육 효과 극대화 방안"
  ],
  "insights": [
    "AI 기술의 발전 방향이 인간 중심이 아닌 수익 중심으로 흘러가고 있음",
    "교육 분야에서 AI 활용 시 균형잡힌 접근이 필요함",
    "AI 도구의 올바른 사용법에 대한 교육이 시급함"
  ],
  "tags": ["AI시장", "생산성", "자동화", "교육", "학습", "창의성"]
}

요약 시 다음 사항을 준수하세요:
- lilys.ai처럼 매우 간결하고 핵심만 담아 작성
- ==형광펜 효과==와 **볼드체**로 핵심 키워드 강조
- 불필요한 설명 제거하고 핵심 메시지만 전달
- 각 섹션은 2-3문장으로 간결하게 정리
- 실무적이고 구체적인 인사이트 제공
- 읽기 쉽고 이해하기 쉬운 구조로 작성
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert content analyst specializing in creating high-quality, structured summaries similar to lilys.ai. Focus on creating professional, actionable insights with clear organization and meaningful categorization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // 더 일관성 있는 구조를 위해 낮춤
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        title: result.title || videoTitle,
        coreTheme: result.coreTheme || "이 콘텐츠의 핵심 주제를 분석합니다.",
        content: result.content || "요약을 생성할 수 없습니다.",
        sections: result.sections || [],
        keyPoints: result.keyPoints || [],
        insights: result.insights || [],
        tags: result.tags || [],
      };
    } catch (error) {
      console.error("OpenAI 요약 생성 실패:", error);
      throw new Error("AI 요약 생성에 실패했습니다. API 키와 요청 한도를 확인해주세요.");
    }
  }

  async generateObsidianMarkdown(summary: VideoSummary, videoUrl: string, channelName: string, publishedDate: Date): Promise<string> {
    const formattedDate = publishedDate.toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];
    const tags = summary.tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');

    const sectionsMarkdown = summary.sections.map(section => {
      const keywords = section.keyWords.map(kw => `\`${kw}\``).join(', ');
      return `### ${section.title}${section.timestamp ? ` (${section.timestamp})` : ''}

${section.content}

**핵심 키워드**: ${keywords}
`;
    }).join('\n');

    const keyPointsMarkdown = summary.keyPoints.map(point => `- ${point}`).join('\n');
    const insightsMarkdown = summary.insights.map(insight => `- ${insight}`).join('\n');

    return `---
title: "${summary.title}"
date: ${currentDate}
published: ${formattedDate}
channel: "${channelName}"
url: "${videoUrl}"
tags: [${summary.tags.map(tag => `"${tag}"`).join(', ')}]
---

# ${summary.title}

## 📋 요약

${summary.content}

## 🎯 핵심 포인트

${keyPointsMarkdown}

## 📚 섹션별 내용

${sectionsMarkdown}

## 💡 핵심 인사이트

${insightsMarkdown}

## 🎭 핵심 주제

${summary.coreTheme}

---

**출처**: [${channelName}](${videoUrl})  
**발행일**: ${formattedDate}  
**분석일**: ${currentDate}  
**태그**: ${tags}
`;
  }
}