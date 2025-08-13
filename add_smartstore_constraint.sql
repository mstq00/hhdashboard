-- 스마트스토어용 unique constraint 추가
-- PostgreSQL에서는 조건부 unique constraint를 위해 UNIQUE INDEX를 사용해야 합니다

-- 스마트스토어용 조건부 unique index 생성
CREATE UNIQUE INDEX IF NOT EXISTS unique_smartstore_order_product 
ON orders (channel, order_number, product_order_number, product_name, product_option) 
WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;

-- 다른 채널들용 조건부 unique index 생성
CREATE UNIQUE INDEX IF NOT EXISTS unique_other_channels_order_product 
ON orders (channel, order_number, product_name, product_option) 
WHERE channel != 'smartstore' OR product_order_number IS NULL;

-- 제약조건이 제대로 추가되었는지 확인
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND constraint_type = 'UNIQUE'
ORDER BY constraint_name; 