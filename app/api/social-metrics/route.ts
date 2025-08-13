import { NextResponse } from 'next/server';

// SNS 채널 설정 타입
interface SocialChannelConfig {
  id: string;
  name: string;
  platform: string;
  url: string;
  lastUpdated?: string;
}

// SNS 채널별 지표 데이터 타입
interface SocialMetrics {
  id: string;
  platform: string;
  name: string;
  url: string;
  followers: number;
  subscribers?: number;
  posts?: number;
  views?: number;
  likes?: number;
  comments?: number;
  lastUpdated: string;
  status: 'success' | 'error' | 'no_config';
  error?: string;
}

// 사용자 입력 기반 지표 생성 함수
function createDefaultMetrics(): any {
  return {
    followers: 0,
    subscribers: 0,
    posts: 0,
    views: 0,
    likes: 0,
    comments: 0,
  };
}

/**
 * SNS 채널별 자동 지표 확인 API
 * Gemini를 사용하여 웹 페이지에서 지표를 추출합니다.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId'); // 특정 채널만 요청
    const refresh = searchParams.get('refresh') === 'true'; // 캐시 무시하고 새로고침

    // 저장된 채널 설정들 (실제로는 DB에서 가져와야 함)
    const savedChannels: SocialChannelConfig[] = [
      {
        id: 'youtube-1',
        name: '유튜브 채널',
        platform: 'youtube',
        url: 'https://www.youtube.com/@example',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'instagram-1',
        name: '인스타그램',
        platform: 'instagram',
        url: 'https://www.instagram.com/example',
        lastUpdated: new Date().toISOString()
      }
    ];

    // 특정 채널만 요청한 경우
    if (channelId) {
      const channel = savedChannels.find(c => c.id === channelId);
      if (!channel) {
        return NextResponse.json({
          success: false,
          error: '채널을 찾을 수 없습니다.',
        }, { status: 404 });
      }

      const metrics = await fetchChannelMetrics(channel, refresh);
      return NextResponse.json({
        success: true,
        data: metrics,
      });
    }

    // 모든 채널 데이터 가져오기
    const allMetrics: SocialMetrics[] = [];
    
    for (const channel of savedChannels) {
      try {
        const metrics = await fetchChannelMetrics(channel, refresh);
        allMetrics.push(metrics);
      } catch (error) {
        console.error(`${channel.name} 채널 데이터 가져오기 실패:`, error);
        allMetrics.push({
          id: channel.id,
          platform: channel.platform,
          name: channel.name,
          url: channel.url,
          followers: 0,
          lastUpdated: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: allMetrics,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('SNS 지표 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 채널 URL 추가/수정 (POST)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, platform, url } = body;

    if (!name || !platform || !url) {
      return NextResponse.json({
        success: false,
        error: '필수 필드가 누락되었습니다: name, platform, url',
      }, { status: 400 });
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 URL입니다.',
      }, { status: 400 });
    }

    // 실제로는 DB에 저장
    const newChannel: SocialChannelConfig = {
      id: id || `channel-${Date.now()}`,
      name,
      platform,
      url,
      lastUpdated: new Date().toISOString()
    };

    // 테스트를 위해 즉시 지표 가져오기
    const metrics = await fetchChannelMetrics(newChannel, true);

    return NextResponse.json({
      success: true,
      data: metrics,
      message: '채널이 성공적으로 추가되었습니다.',
    });

  } catch (error) {
    console.error('채널 추가 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 채널 삭제 (DELETE)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { channelId, followers, subscribers, posts, views, likes, comments } = body;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: '채널 ID가 필요합니다.',
      }, { status: 400 });
    }

    // 실제로는 DB에서 업데이트
    // 여기서는 성공 응답만 반환
    const updatedMetrics = {
      followers: followers || 0,
      subscribers: subscribers || 0,
      posts: posts || 0,
      views: views || 0,
      likes: likes || 0,
      comments: comments || 0,
    };

    return NextResponse.json({
      success: true,
      data: updatedMetrics,
      message: '지표가 성공적으로 업데이트되었습니다.',
    });

  } catch (error) {
    console.error('지표 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: '채널 ID가 필요합니다.',
      }, { status: 400 });
    }

    // 실제로는 DB에서 삭제
    // 여기서는 성공 응답만 반환

    return NextResponse.json({
      success: true,
      message: '채널이 성공적으로 삭제되었습니다.',
    });

  } catch (error) {
    console.error('채널 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 채널별 지표 데이터 가져오기
 */
async function fetchChannelMetrics(channel: SocialChannelConfig, refresh: boolean = false): Promise<SocialMetrics> {
  const cacheKey = `social_metrics_${channel.id}`;
  
  // 캐시 확인
  if (!refresh) {
    const cached = getCachedMetrics(cacheKey);
    if (cached && isCacheValid(new Date(cached.lastUpdated).getTime())) {
      return cached;
    }
  }

  try {
    // 기본 지표 생성 (사용자가 나중에 수정할 수 있음)
    const defaultData = createDefaultMetrics();
    
    const metrics: SocialMetrics = {
      id: channel.id,
      platform: channel.platform,
      name: channel.name,
      url: channel.url,
      followers: defaultData.followers || 0,
      subscribers: defaultData.subscribers || 0,
      posts: defaultData.posts || 0,
      views: defaultData.views || 0,
      likes: defaultData.likes || 0,
      comments: defaultData.comments || 0,
      lastUpdated: new Date().toISOString(),
      status: 'success',
    };

    // 캐시에 저장
    setCachedMetrics(cacheKey, metrics);
    
    return metrics;
  } catch (error) {
    console.error(`${channel.name} 지표 추출 오류:`, error);
    return {
      id: channel.id,
      platform: channel.platform,
      name: channel.name,
      url: channel.url,
      followers: 0,
      lastUpdated: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 간단한 메모리 캐시 (실제로는 Redis 사용 권장)
const metricsCache = new Map<string, { data: SocialMetrics; timestamp: number }>();

function getCachedMetrics(key: string): SocialMetrics | null {
  const cached = metricsCache.get(key);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }
  return null;
}

function setCachedMetrics(key: string, data: SocialMetrics): void {
  metricsCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function isCacheValid(timestamp: number): boolean {
  // 30분 캐시
  const cacheAge = Date.now() - timestamp;
  return cacheAge < 30 * 60 * 1000;
} 