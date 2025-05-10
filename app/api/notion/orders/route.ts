import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = '1541d84cc1ac80bc8696fe96b2cc86b8';

// 발주 데이터 가져오기
export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [
        {
          property: '발주일',
          direction: 'descending',
        },
      ],
    });

    const data = response.results.map((page: any) => {
      const properties = page.properties;
      return {
        id: page.id,
        발주코드: properties['발주코드']?.title?.[0]?.plain_text || '',
        발주명: properties['발주명']?.rich_text?.[0]?.plain_text || '',
        발주차수: properties['발주차수']?.rich_text?.[0]?.plain_text || '',
        발주일: properties['발주일']?.date?.start || '',
        발주수량: properties['발주수량']?.number || 0,
        단가: properties['단가']?.number || 0,
        발주액: properties['발주액']?.number || 0,
        선금송금액: properties['선금송금액']?.number || 0,
        선금환율: properties['선금환율']?.number || 0,
        잔금송금액: properties['잔금송금액']?.number || 0,
        잔금환율: properties['잔금환율']?.number || 0,
        입항후비용: properties['입항후비용']?.number || 0,
        원화발주액: properties['원화발주액']?.number || 0,
        상태: properties['상태']?.status?.name || '대기',
        입항예정일: properties['입항예정일']?.date?.start || '',
        최종입고일: properties['최종입고일']?.date?.start || '',
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Notion API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// 발주 상태 업데이트
export async function PATCH(request: Request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({
        success: false,
        error: '주문 ID와 상태는 필수입니다.',
      }, { status: 400 });
    }

    await notion.pages.update({
      page_id: orderId,
      properties: {
        '상태': {
          status: {
            name: status,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '상태가 업데이트되었습니다.',
    });
  } catch (error: any) {
    console.error('Notion API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
} 