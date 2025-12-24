-- 주문상태 업데이트를 위한 간단한 인덱스 생성
-- 기존 unique constraint는 유지하고, 주문상태 업데이트를 위한 인덱스만 추가

-- Step 1: 주문상태 업데이트를 위한 인덱스 생성
-- 스마트스토어용 인덱스 (주문상태 업데이트 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_smartstore_update 
ON orders (channel, order_number, product_order_number, product_name, product_option)
WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;

-- 다른 채널용 인덱스 (주문상태 업데이트 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_other_update 
ON orders (channel, order_number, product_name, product_option)
WHERE channel != 'smartstore' OR product_order_number IS NULL;

-- Step 2: 주문상태 변경 감지를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_status_check 
ON orders (channel, order_number, product_name, product_option, product_order_number, status);

-- Step 3: 인덱스 생성 확인
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE '%update%'
ORDER BY indexname;

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Status update indexes created successfully';
    RAISE NOTICE 'Smartstore update index: idx_orders_smartstore_update';
    RAISE NOTICE 'Other channels update index: idx_orders_other_update';
    RAISE NOTICE 'Status check index: idx_orders_status_check';
END $$;
