-- channel_pricing 기간 겹침 검증용 뷰/쿼리 (읽기용 도우미)
-- 사용법: Supabase SQL editor에서 실행하여 겹치는 레코드 유무를 점검

-- product_id, channel이 동일한 레코드들 중 기간이 겹치는 경우 탐지
SELECT a.id AS id_a, b.id AS id_b, a.product_id, a.channel,
       a.start_date AS a_start, a.end_date AS a_end,
       b.start_date AS b_start, b.end_date AS b_end
FROM channel_pricing a
JOIN channel_pricing b
  ON a.product_id = b.product_id
 AND a.channel = b.channel
 AND a.id < b.id
WHERE (
  -- 완전기간 간 겹침
  (a.start_date IS NOT NULL AND a.end_date IS NOT NULL AND b.start_date IS NOT NULL AND b.end_date IS NOT NULL AND a.start_date <= b.end_date AND b.start_date <= a.end_date)
  OR
  -- a 오픈엔드 시작 vs b 완전기간/오픈엔드
  (a.start_date IS NOT NULL AND a.end_date IS NULL AND (
      (b.start_date IS NULL AND b.end_date IS NOT NULL AND a.start_date <= b.end_date) OR
      (b.start_date IS NOT NULL AND a.start_date <= COALESCE(b.end_date, '9999-12-31'))
  ))
  OR
  -- a 완전기간 vs b 오픈엔드 시작
  (b.start_date IS NOT NULL AND b.end_date IS NULL AND (
      (a.start_date IS NULL AND a.end_date IS NOT NULL AND b.start_date <= a.end_date) OR
      (a.start_date IS NOT NULL AND b.start_date <= COALESCE(a.end_date, '9999-12-31'))
  ))
  OR
  -- 양쪽 다 오픈엔드 시작 (항상 겹침)
  (a.start_date IS NOT NULL AND a.end_date IS NULL AND b.start_date IS NOT NULL AND b.end_date IS NULL)
);

-- 현재 constraint 확인
SELECT 
    constraint_name,
    constraint_type,
    table_name,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, ccu.column_name;

-- 더 자세한 정보
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    string_agg(ccu.column_name, ', ' ORDER BY ccu.column_name) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.constraint_type, tc.table_name
ORDER BY tc.constraint_name; 