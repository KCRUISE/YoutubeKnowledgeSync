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
다음 YouTube 비디오의 내용을 lilys.ai 스타일의 고품질 요약으로 변환해주세요. 전문적이고 체계적인 분석을 제공하세요.

비디오 제목: ${videoTitle}
비디오 설명: ${videoDescription}
${transcript ? `스크립트: ${transcript}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "title": "핵심 주제를 담은 명확한 제목",
  "coreTheme": "이 콘텐츠의 핵심 테마를 한 문장으로 요약 (예: '인공지능의 미래와 창작 경제에 미치는 영향을 논의하며, 안전성과 윤리적 고려사항의 중요성을 강조')",
  "content": "전체적인 요약 내용 (마크다운 형식, 구조화된 문단으로 작성)",
  "sections": [
    {
      "title": "섹션 제목",
      "timestamp": "예상 시간대 (예: 0:00-5:30)",
      "content": "해당 섹션의 상세 내용",
      "keyWords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"]
    }
  ],
  "keyPoints": ["• 구체적이고 실행 가능한 핵심 포인트들", "• 중요한 인사이트나 팁", "• 기억해야 할 주요 개념들"],
  "insights": ["깊이 있는 분석이나 통찰", "비판적 사고나 다각적 관점", "실무적 적용 방안"],
  "tags": ["#주제분야", "#구체적키워드", "#활용영역", "#대상독자"]
}

요약 시 다음 사항을 준수하세요:
- **볼드체**로 핵심 개념과 중요한 용어 강조
- 섹션별로 논리적 흐름을 유지하며 구성
- 실무진이 활용할 수 있는 구체적 인사이트 제공
- 전문성과 접근성의 균형을 맞춘 설명
- 태그는 실제 검색과 분류에 유용하도록 구성
- 각 섹션은 3-5개의 핵심 키워드로 정리
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
    
    let markdown = `---
title: "${summary.title}"
channel: "${channelName}"
date: "${formattedDate}"
created: "${currentDate}"
tags: [${summary.tags.map(tag => `"${tag}"`).join(', ')}]
type: "video-summary"
url: "${videoUrl}"
---

# ${summary.title}

## 📺 영상 정보

| 항목 | 내용 |
|------|------|
| **채널** | ${channelName} |
| **게시일** | ${formattedDate} |
| **링크** | [영상 보기](${videoUrl}) |
| **요약 생성일** | ${currentDate} |

## 🎯 핵심 테마

> ${summary.coreTheme}

## 💡 핵심 포인트

${summary.keyPoints.map(point => `- ${point}`).join('\n')}

## 📋 주요 내용

${summary.content}

## 💡 주요 인사이트

${summary.insights.map(insight => `- ${insight}`).join('\n')}
`;

    // 섹션별 상세 내용 추가
    if (summary.sections && summary.sections.length > 0) {
      markdown += `\n## 📑 섹션별 분석\n\n`;
      
      summary.sections.forEach((section, index) => {
        markdown += `### ${index + 1}. ${section.title}`;
        if (section.timestamp) {
          markdown += ` ${section.timestamp}`;
        }
        markdown += `\n\n`;
        
        // 키워드 표시
        if (section.keyWords && section.keyWords.length > 0) {
          const keywordTags = section.keyWords.map(word => `\`${word}\``).join(' ');
          markdown += `**핵심 키워드**: ${keywordTags}\n\n`;
        }
        
        markdown += `${section.content}\n\n`;
      });
    }

    markdown += `

## 🏷️ 태그

${summary.tags.map(tag => `#${tag.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9가-힣_]/g, '')}`).join(' ')}

---

## 📌 메모

*이곳에 개인적인 생각이나 추가 메모를 작성하세요.*

---

## 🔗 연관 항목

- [[${channelName}]] 채널의 다른 콘텐츠
- [[YouTube 요약 모음]]

---

**📝 자동 생성된 요약** | **🤖 AI 요약 서비스** | **📅 ${currentDate}**
`;

    return markdown;
  }
}
