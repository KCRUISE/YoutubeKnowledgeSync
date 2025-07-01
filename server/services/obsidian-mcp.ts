import fetch from 'node-fetch';

export interface ObsidianMCPConfig {
  apiKey: string;
  host?: string;
  port?: string;
}

export class ObsidianMCPService {
  private config: ObsidianMCPConfig;
  private baseUrl: string;

  constructor(config: ObsidianMCPConfig) {
    this.config = {
      host: '127.0.0.1',
      port: '27124',
      ...config,
    };
    this.baseUrl = `http://${this.config.host}:${this.config.port}`;
  }

  async connect(): Promise<void> {
    try {
      // Obsidian REST API 연결 테스트
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Obsidian REST API 연결 실패: ${response.status} ${response.statusText}`);
      }

      console.log('Obsidian REST API 연결 성공');
    } catch (error) {
      console.error('Obsidian REST API 연결 실패:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // HTTP 연결이므로 특별한 정리 작업 불필요
    console.log('Obsidian REST API 연결 종료');
  }

  async appendContent(filePath: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(filePath)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'text/markdown',
        },
        body: content,
      });

      if (response.ok) {
        console.log('Obsidian에 파일 생성 완료:', filePath);
        return true;
      } else {
        console.error('Obsidian 파일 생성 실패:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Obsidian 파일 생성 실패:', error);
      return false;
    }
  }

  async putContent(filePath: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'text/markdown',
        },
        body: content,
      });

      if (response.ok) {
        console.log('Obsidian에 파일 업데이트 완료:', filePath);
        return true;
      } else {
        console.error('Obsidian 파일 업데이트 실패:', response.status, response.statusText);
        // PUT이 실패하면 POST로 폴백
        return await this.appendContent(filePath, content);
      }
    } catch (error) {
      console.error('Obsidian 파일 업데이트 실패:', error);
      return await this.appendContent(filePath, content);
    }
  }

  async searchFiles(query: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/simple/?query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as any;
        return Array.isArray(data) ? data : [];
      } else {
        console.error('Obsidian 파일 검색 실패:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Obsidian 파일 검색 실패:', error);
      return [];
    }
  }

  async listFiles(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/vault/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as any;
        return Array.isArray(data.files) ? data.files : [];
      } else {
        console.error('Obsidian 파일 목록 조회 실패:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Obsidian 파일 목록 조회 실패:', error);
      return [];
    }
  }

  isConnected(): boolean {
    return true; // HTTP 연결이므로 항상 연결 상태로 간주
  }
}