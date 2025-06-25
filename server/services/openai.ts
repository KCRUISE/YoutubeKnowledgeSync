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
}

export class OpenAIService {
  async summarizeVideo(videoTitle: string, videoDescription: string, transcript?: string): Promise<VideoSummary> {
    try {
      const content = transcript || videoDescription || videoTitle;
      
      const prompt = `
다음 YouTube 비디오의 내용을 한국어로 요약해주세요. Obsidian 노트에 적합한 형태로 작성해주세요.

비디오 제목: ${videoTitle}
비디오 설명: ${videoDescription}
${transcript ? `스크립트: ${transcript}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "title": "요약된 제목 (원제목을 기반으로 핵심 내용을 포함)",
  "content": "상세한 요약 내용 (마크다운 형식으로 작성, 핵심 포인트를 단락별로 구성)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "tags": ["태그1", "태그2", "태그3"]
}

요약 시 다음 사항을 고려해주세요:
- 핵심 내용과 주요 메시지를 명확히 전달
- 실용적인 정보나 팁이 있다면 강조
- 기술적 내용의 경우 초보자도 이해할 수 있도록 설명
- Obsidian에서 검색하기 좋은 태그 생성
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert content summarizer specializing in Korean language YouTube content analysis. Create comprehensive, well-structured summaries suitable for knowledge management systems."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        title: result.title || videoTitle,
        content: result.content || "요약을 생성할 수 없습니다.",
        keyPoints: result.keyPoints || [],
        tags: result.tags || [],
      };
    } catch (error) {
      console.error("OpenAI 요약 생성 실패:", error);
      throw new Error("AI 요약 생성에 실패했습니다. API 키와 요청 한도를 확인해주세요.");
    }
  }

  async generateObsidianMarkdown(summary: VideoSummary, videoUrl: string, channelName: string, publishedDate: Date): Promise<string> {
    const formattedDate = publishedDate.toISOString().split('T')[0];
    const tags = summary.tags.map(tag => `#${tag.replace(/\s+/g, '_')}`).join(' ');
    
    return `# ${summary.title}

## 메타데이터
- **채널**: ${channelName}
- **발행일**: ${formattedDate}
- **링크**: [YouTube에서 보기](${videoUrl})
- **태그**: ${tags}

## 핵심 포인트
${summary.keyPoints.map(point => `- ${point}`).join('\n')}

## 상세 요약
${summary.content}

---
*이 요약은 AI에 의해 자동 생성되었습니다.*
`;
  }
}
