-- UPSERT를 위한 unique index 생성
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

-- 2. 스마트스토어용 조건부 unique index 생성
CREATE UNIQUE INDEX IF NOT EXISTS unique_smartstore_order_product 
ON orders (channel, order_number, product_order_number, product_name, product_option) 
WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;

-- 3. 다른 채널들용 조건부 unique index 생성
CREATE UNIQUE INDEX IF NOT EXISTS unique_other_channels_order_product 
ON orders (channel, order_number, product_name, product_option) 
WHERE channel != 'smartstore' OR product_order_number IS NULL;

-- 4. 성능 향상을 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_channel_order 
ON orders (channel, order_number);

CREATE INDEX IF NOT EXISTS idx_orders_product 
ON orders (product_name, product_option);

-- 5. 생성된 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE 'unique_%'
ORDER BY indexname; 