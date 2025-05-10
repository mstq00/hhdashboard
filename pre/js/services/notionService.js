export class NotionService {
    constructor(databaseId) {
        if (!databaseId) {
            throw new Error('Database ID가 필요합니다');
        }
        this.databaseId = databaseId;
        
        // 현재 환경이 로컬인지 더 정확하게 확인
        const isLocal = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
                       
        console.log('현재 호스트:', window.location.hostname);
        console.log('로컬 환경?:', isLocal);
        
        this.baseUrl = isLocal
            ? 'http://localhost:5001/hejdoohome-dashboard/us-central1/api'
            : 'https://us-central1-hejdoohome-dashboard.cloudfunctions.net/api';
            
        console.log('사용할 API URL:', this.baseUrl);
    }

    async fetchDatabase() {
        try {
            console.log(`${this.databaseId} 데이터베이스 조회 시작`);
            console.log('요청 URL:', `${this.baseUrl}/notion/query`);
            
            const response = await fetch(`${this.baseUrl}/notion/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ databaseId: this.databaseId })
            });

            if (!response.ok) {
                throw new Error(`서버 요청 실패: ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Notion API 호출 중 오류:', error);
            throw error;
        }
    }
} 