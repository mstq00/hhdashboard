-- 중복 설정 테이블 생성
CREATE TABLE IF NOT EXISTS duplicate_configs (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    order_number_column VARCHAR(50) NOT NULL,
    exact_duplicate_columns TEXT[] NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel)
);

-- orders 테이블에 상품주문번호 컬럼 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_order_number VARCHAR(255);

-- 상품주문번호 컬럼에 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_product_order_number ON orders(product_order_number);

-- 기존 데이터에 대한 상품주문번호 기본값 설정 (필요한 경우)
-- UPDATE orders SET product_order_number = order_number WHERE product_order_number IS NULL;

-- 중복 설정 테이블에 기본 데이터 삽입
INSERT INTO duplicate_configs (channel, order_number_column, exact_duplicate_columns, description) 
VALUES 
    ('smartstore', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
    ('ohouse', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
    ('ohouse2', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
    ('YTshopping', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
    ('coupang', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명')
ON CONFLICT (channel) DO UPDATE SET
    order_number_column = EXCLUDED.order_number_column,
    exact_duplicate_columns = EXCLUDED.exact_duplicate_columns,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 중복 설정 테이블에 RLS 정책 추가 (필요한 경우)
-- ALTER TABLE duplicate_configs ENABLE ROW LEVEL SECURITY;

-- 중복 설정 테이블에 대한 CRUD 권한 설정
GRANT ALL ON duplicate_configs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE duplicate_configs_id_seq TO authenticated;

-- 테이블 구조 확인을 위한 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW duplicate_configs_summary AS
SELECT 
    channel,
    order_number_column,
    exact_duplicate_columns,
    description,
    created_at,
    updated_at
FROM duplicate_configs
ORDER BY channel; 