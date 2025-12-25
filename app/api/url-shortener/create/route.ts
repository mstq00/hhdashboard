import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// 랜덤 코드 생성 함수
function generateRandomCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// URL 유효성 검사
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 커스텀 코드 유효성 검사 (영문, 숫자, 하이픈, 언더스코어만)
function isValidCustomCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{3,50}$/.test(code);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { originalUrl, customCode, title, description, expiresIn } = body;

    // 필수 필드 검증
    if (!originalUrl) {
      return NextResponse.json({ error: '원본 URL은 필수입니다.' }, { status: 400 });
    }

    // URL 유효성 검증
    if (!isValidUrl(originalUrl)) {
      return NextResponse.json({ error: '유효하지 않은 URL입니다.' }, { status: 400 });
    }

    // 짧은 코드 결정 (커스텀 또는 랜덤)
    let shortCode = customCode?.trim();

    if (shortCode) {
      // 커스텀 코드 유효성 검사
      if (!isValidCustomCode(shortCode)) {
        return NextResponse.json({
          error: '코드는 3-50자의 영문, 숫자, 하이픈, 언더스코어만 사용 가능합니다.'
        }, { status: 400 });
      }

      // 중복 확인
      const { data: existing } = await supabase
        .from('shortened_urls')
        .select('short_code')
        .eq('short_code', shortCode)
        .single();

      if (existing) {
        return NextResponse.json({
          error: '이미 사용 중인 코드입니다. 다른 코드를 선택해주세요.'
        }, { status: 409 });
      }
    } else {
      // 랜덤 코드 생성 (중복 체크)
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        shortCode = generateRandomCode(6);

        const { data: existing } = await supabase
          .from('shortened_urls')
          .select('short_code')
          .eq('short_code', shortCode)
          .single();

        if (!existing) break;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return NextResponse.json({
          error: '코드 생성에 실패했습니다. 다시 시도해주세요.'
        }, { status: 500 });
      }
    }

    // 만료 일시 계산
    let expiresAt: string | null = null;
    if (expiresIn && expiresIn > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiresIn);
      expiresAt = expiryDate.toISOString();
    }

    // DB에 저장
    const { data, error } = await supabase
      .from('shortened_urls')
      .insert({
        short_code: shortCode,
        original_url: originalUrl,
        title: title || null,
        description: description || null,
        user_id: user.id, // 사용자 ID 추가
        expires_at: expiresAt,
        is_active: true,
        click_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('DB 삽입 오류:', error);
      return NextResponse.json({ error: 'URL 생성에 실패했습니다.' }, { status: 500 });
    }

    // 짧은 URL 생성 - 기본 도메인 hej2.xyz, hej2.xyz/{code} 형식
    const baseUrl = process.env.NEXT_PUBLIC_SHORT_BASE_URL || 'hej2.xyz';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
    const shortUrl = `${protocol}://${baseUrl}/${shortCode}`;

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        short_url: shortUrl
      }
    });

  } catch (error) {
    console.error('URL 생성 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

