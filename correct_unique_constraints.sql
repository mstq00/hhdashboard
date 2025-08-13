-- PostgreSQL에서 올바른 unique constraint 추가 방법
-- 먼저 기존 중복 데이터 정리

-- 중복 데이터 삭제 (가장 최근 데이터만 유지)
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

-- 스마트스토어용 unique index (product_order_number 포함)
CREATE UNIQUE INDEX IF NOT EXISTS unique_smartstore_order 
ON orders (channel, order_number, product_order_number, product_name, product_option)
WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;

-- 다른 채널용 unique index (product_order_number 없음)
CREATE UNIQUE INDEX IF NOT EXISTS unique_other_channel_order 
ON orders (channel, order_number, product_name, product_option)
WHERE channel != 'smartstore' OR product_order_number IS NULL;

-- 성능 향상을 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_channel_order 
ON orders (channel, order_number);

CREATE INDEX IF NOT EXISTS idx_orders_product 
ON orders (product_name, product_option); 