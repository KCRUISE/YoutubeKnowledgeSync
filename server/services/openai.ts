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
      const prompt = `
다음 YouTube 영상을 전문적이고 포괄적으로 분석하고 요약해주세요. lilys.ai 수준의 깊이 있는 분석을 제공해주세요:

제목: ${videoTitle}
설명: ${videoDescription}
${transcript ? `전사 텍스트: ${transcript}` : ''}

다음 형식으로 한국어로 응답해주세요:

1. **핵심 내용 요약**: 영상의 전체 내용을 5-8문장으로 상세하게 요약
2. **주요 포인트**: 핵심 내용을 7-10개의 구체적인 포인트로 정리
3. **섹션별 상세 내용**: 영상을 논리적 구조로 나누어 각 섹션을 상세히 설명
4. **태그**: 관련 키워드 8-12개 (기술, 분야, 개념 등)
5. **핵심 인사이트**: 영상에서 얻을 수 있는 중요한 통찰과 학습 포인트 5-7개
6. **핵심 주제**: 영상의 핵심 메시지를 한 문장으로 명확히 표현

각 섹션은 구체적이고 실용적인 내용으로 작성하며, 전문가 수준의 분석을 제공해주세요.
영상의 맥락, 배경지식, 실무 적용 방안 등을 포함하여 종합적으로 분석해주세요.

JSON 형식으로 응답해주세요:
{
  "title": "${videoTitle}",
  "content": "핵심 내용 요약 (5-8문장의 상세한 요약)",
  "keyPoints": ["구체적인 포인트1", "구체적인 포인트2", "구체적인 포인트3", "구체적인 포인트4", "구체적인 포인트5", "구체적인 포인트6", "구체적인 포인트7"],
  "sections": [
    {
      "title": "섹션 제목",
      "timestamp": "시간대 (추정)",
      "content": "섹션별 상세 내용 (3-5문장)",
      "keyWords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"]
    }
  ],
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5", "태그6", "태그7", "태그8"],
  "insights": ["실용적 인사이트1", "전문가 관점 인사이트2", "학습 포인트3", "적용 방안4", "핵심 통찰5"],
  "coreTheme": "영상의 핵심 메시지와 주제"
}
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 YouTube 영상 분석 전문가입니다. lilys.ai 수준의 깊이 있고 구조화된 분석을 제공합니다. 영상의 내용을 포괄적으로 분석하고, 실무에 적용할 수 있는 인사이트와 함께 전문가 수준의 요약을 작성합니다. 각 섹션은 구체적이고 실용적인 내용으로 작성하며, 단순한 요약이 아닌 깊이 있는 분석을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      });

      const summaryText = response.choices[0].message.content;
      
      try {
        const summary = JSON.parse(summaryText || '{}');
        return summary;
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        // JSON 파싱 실패 시 기본 구조로 반환
        return {
          title: videoTitle,
          content: summaryText || '요약 생성 중 오류가 발생했습니다.',
          keyPoints: [],
          sections: [],
          tags: [],
          insights: [],
          coreTheme: '영상 분석'
        };
      }
    } catch (error) {
      console.error('영상 요약 생성 중 오류:', error);
      throw error;
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