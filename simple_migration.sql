-- 간단한 마이그레이션 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. orders 테이블에 상품주문번호 컬럼 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_order_number VARCHAR(255);

-- 2. 중복 설정 테이블 생성
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

-- 3. 기본 데이터 삽입
INSERT INTO duplicate_configs (channel, order_number_column, exact_duplicate_columns, description) VALUES
('smartstore', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
('ohouse', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
('ohouse2', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
('YTshopping', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명'),
('coupang', '주문번호', ARRAY['주문번호', '상품주문번호', '상품명', '옵션명'], '주문번호 기준 그룹화, 완전 중복: 주문번호+상품주문번호+상품명+옵션명')
ON CONFLICT (channel) DO NOTHING;

-- 4. 권한 설정
GRANT ALL ON duplicate_configs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE duplicate_configs_id_seq TO authenticated;

SELECT 'Migration completed!' as status; 