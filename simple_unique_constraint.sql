-- 간단한 unique constraint 생성 (UPSERT용)
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- 1. 기존 중복 데이터 정리 (가장 최근 데이터만 유지)
DELETE FROM orders 
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          channel,
          order_number,
          COALESCE(product_order_number, ''),
          COALESCE(product_name, ''),
          COALESCE(product_option, '')
        ORDER BY created_at DESC
      ) as rn
    FROM orders
  ) ranked
  WHERE rn > 1
);

-- 2. 모든 채널에 대해 동일한 unique constraint 추가
-- product_order_number가 NULL이 아닌 경우에만 포함
ALTER TABLE orders 
ADD CONSTRAINT unique_order_product 
UNIQUE (channel, order_number, product_order_number, product_name, product_option);

-- 3. 성능 향상을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_channel_order 
ON orders (channel, order_number);

CREATE INDEX IF NOT EXISTS idx_orders_product 
ON orders (product_name, product_option);

-- 4. 제약조건이 제대로 추가되었는지 확인
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND constraint_type = 'UNIQUE'
ORDER BY constraint_name; 