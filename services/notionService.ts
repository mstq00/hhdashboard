export class NotionService {
  private databaseId: string;

  constructor(databaseId: string) {
    this.databaseId = databaseId;
  }

  async fetchDatabase() {
    try {
      const response = await fetch(`/api/notion/orders`);
      
      if (!response.ok) {
        throw new Error(`데이터 로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '데이터를 가져오는 중 오류가 발생했습니다.');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Notion 데이터베이스 조회 오류:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await fetch('/api/notion/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`상태 업데이트 실패: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '상태 업데이트 중 오류가 발생했습니다.');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Notion 주문 상태 업데이트 오류:', error);
      throw error;
    }
  }
} 