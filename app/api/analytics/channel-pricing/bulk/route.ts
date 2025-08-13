import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

type BulkPricingPayload = {
  productIds: string[]
  channels: string[]
  sellingPrice: number
  supplyPrice: number
  fee: number
  isAlwaysApply?: boolean
  startDate?: string | null
  endDate?: string | null
  closeOverlaps?: boolean
  validateOnly?: boolean
}

function parseDateOnly(dateStr: string) {
  const d = new Date(dateStr)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatDateOnly(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayBefore(dateStr: string) {
  const d = parseDateOnly(dateStr)
  d.setDate(d.getDate() - 1)
  return formatDateOnly(d)
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = (await request.json()) as BulkPricingPayload

    const {
      productIds,
      channels,
      sellingPrice,
      supplyPrice,
      fee,
      isAlwaysApply = false,
      startDate = null,
      endDate = null,
      closeOverlaps = true,
      validateOnly = false
    } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds가 필요합니다.' }, { status: 400 })
    }
    if (!Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json({ error: 'channels가 필요합니다.' }, { status: 400 })
    }
    if (typeof sellingPrice !== 'number' || typeof supplyPrice !== 'number' || typeof fee !== 'number') {
      return NextResponse.json({ error: 'sellingPrice, supplyPrice, fee는 숫자여야 합니다.' }, { status: 400 })
    }

    if (!isAlwaysApply && !startDate && !endDate) {
      return NextResponse.json({ error: '기간 지정 또는 상시 적용 중 하나는 필요합니다.' }, { status: 400 })
    }

    // 기본 입력 검증
    if (fee < 0 || fee > 100) {
      return NextResponse.json({ error: '수수료는 0~100 사이여야 합니다.' }, { status: 400 })
    }
    if (sellingPrice < 0 || supplyPrice < 0) {
      return NextResponse.json({ error: '판매가/공급가는 0 이상이어야 합니다.' }, { status: 400 })
    }

    if (!isAlwaysApply && startDate && endDate) {
      const s = parseDateOnly(startDate).getTime()
      const e = parseDateOnly(endDate).getTime()
      if (s > e) {
        return NextResponse.json({ error: '시작일이 종료일보다 늦을 수 없습니다.' }, { status: 400 })
      }
    }

    // 겹침 자동 보정을 위한 준비
    const normalizedStart = startDate ? formatDateOnly(parseDateOnly(startDate)) : null
    const normalizedEnd = endDate ? formatDateOnly(parseDateOnly(endDate)) : null

    let created = 0
    let adjusted = 0
    const errors: any[] = []
    const conflicts: Array<{ productId: string, channel: string, reason: string }> = []

    // 미리보기용 결과 상세
    const preview: Array<{ productId: string, channel: string, action: 'insert' | 'update' | 'adjust', detail?: string }> = []

    for (const productId of productIds) {
      for (const channel of channels) {
        try {
          const channelNorm = channel.toLowerCase()

          // 상시 적용인 경우: 기존 default 레코드 존재 시 업데이트로 처리
          if (isAlwaysApply) {
            const { data: existingDefault, error: defErr } = await supabase
              .from('channel_pricing')
              .select('id')
              .eq('product_id', productId)
              .eq('channel', channelNorm)
              .is('start_date', null)
              .is('end_date', null)

            if (defErr) throw defErr

            if (validateOnly) {
              preview.push({ productId, channel: channelNorm, action: existingDefault && existingDefault.length > 0 ? 'update' : 'insert', detail: 'default' })
              created += existingDefault && existingDefault.length > 0 ? 0 : 1
              continue
            }

            if (existingDefault && existingDefault.length > 0) {
              const { error: updDefErr } = await supabase
                .from('channel_pricing')
                .update({ selling_price: sellingPrice, supply_price: supplyPrice, fee })
                .eq('id', existingDefault[0].id)
              if (updDefErr) throw updDefErr
            } else {
              const { error: insDefErr } = await supabase
                .from('channel_pricing')
                .insert({ product_id: productId, channel: channelNorm, selling_price: sellingPrice, supply_price: supplyPrice, fee, start_date: null, end_date: null })
              if (insDefErr) throw insDefErr
              created += 1
            }
            continue
          }

          // 겹침 자동 보정: 새 기간이 시작일만 가지고 있거나(오픈엔드 시작), 완전기간인 경우 이전 오픈엔드/겹침을 정리
          if (closeOverlaps && normalizedStart) {
            // 1) 오픈엔드 레코드의 종료일을 새 시작일의 전날로 보정
            const { data: openEnded, error: oeErr } = await supabase
              .from('channel_pricing')
              .select('id, start_date, end_date')
              .eq('product_id', productId)
              .eq('channel', channel)
              .is('end_date', null)

            if (oeErr) {
              throw oeErr
            }

            if (openEnded && openEnded.length > 0) {
              const newEndForOpenEnded = dayBefore(normalizedStart)
              const ids = openEnded.map(r => r.id)
              if (ids.length > 0) {
                if (validateOnly) {
                  adjusted += ids.length
                  ids.forEach(() => preview.push({ productId, channel: channelNorm, action: 'adjust', detail: 'close open-ended' }))
                } else {
                  const { error: updErr } = await supabase
                    .from('channel_pricing')
                    .update({ end_date: newEndForOpenEnded })
                    .in('id', ids)
                  if (updErr) throw updErr
                  adjusted += ids.length
                }
              }
            }

            // 2) 겹치는 기존 기간이 있으면 종료일을 보정 (시작일 이전으로)
            const { data: overlaps, error: ovErr } = await supabase
              .from('channel_pricing')
              .select('id, start_date, end_date')
              .eq('product_id', productId)
              .eq('channel', channel)
              .not('start_date', 'is', null)

            if (ovErr) {
              throw ovErr
            }

            if (overlaps && overlaps.length > 0) {
              const needAdjustIds = overlaps
                .filter(r => {
                  const rStart = r.start_date ? parseDateOnly(r.start_date) : null
                  const rEnd = r.end_date ? parseDateOnly(r.end_date) : null
                  const newStart = parseDateOnly(normalizedStart)
                  const newEnd = normalizedEnd ? parseDateOnly(normalizedEnd) : null

                  // 겹침 조건: rStart <= newEnd && (rEnd == null || rEnd >= newStart)
                  // newEnd가 없으면 무한대로 간주
                  const overlapsNow = (() => {
                    if (!rStart) return false
                    if (newEnd) {
                      return rStart <= newEnd && (!rEnd || rEnd >= newStart)
                    }
                    return !rEnd || rEnd >= newStart
                  })()

                  // 기존 기간이 완전히 새 기간 내부로 들어오거나, 새 기간이 기존 기간 내부로 들어오는 복잡 겹침은 경고
                  if (overlapsNow) {
                    // 새 기간이 기존 기간 내부에 완전히 포함 → split 필요
                    if (rStart && rEnd && newStart > rStart && newEnd && newEnd < rEnd) {
                      conflicts.push({ productId, channel: channelNorm, reason: '새 기간이 기존 기간을 분할함(수동 분할 필요)' })
                      return false
                    }
                    return rStart <= newStart
                  }
                  return false
                })
                .map(r => r.id)

              if (needAdjustIds.length > 0) {
                if (validateOnly) {
                  adjusted += needAdjustIds.length
                  needAdjustIds.forEach(() => preview.push({ productId, channel: channelNorm, action: 'adjust', detail: 'truncate overlap' }))
                } else {
                  const { error: adjErr } = await supabase
                    .from('channel_pricing')
                    .update({ end_date: dayBefore(normalizedStart) })
                    .in('id', needAdjustIds)
                  if (adjErr) throw adjErr
                  adjusted += needAdjustIds.length
                }
              }
            }
          }

          // 새 레코드 생성
          const insertPayload = {
            product_id: productId,
            channel: channelNorm,
            selling_price: sellingPrice,
            supply_price: supplyPrice,
            fee,
            start_date: normalizedStart,
            end_date: normalizedEnd
          }

          if (validateOnly) {
            preview.push({ productId, channel: channelNorm, action: 'insert' })
            created += 1
          } else {
            const { error: insErr } = await supabase
              .from('channel_pricing')
              .insert(insertPayload)
            if (insErr) {
              throw insErr
            }
            created += 1
          }
        } catch (e: any) {
          errors.push({ productId, channel, message: e?.message || 'unknown error' })
        }
      }
    }

    const res = NextResponse.json({ success: true, created, adjusted, errors, conflicts, preview })
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res
  } catch (error: any) {
    const res = NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 })
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res
  }
}


