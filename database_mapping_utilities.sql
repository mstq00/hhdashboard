-- 매핑 관리를 위한 추가 유틸리티 스크립트
-- 이 파일은 database_schema.sql 실행 후에 실행할 수 있습니다.

-- 1. 채널별 매핑 초기화 함수
CREATE OR REPLACE FUNCTION reset_channel_mapping(p_channel VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    -- 해당 채널의 사용자 정의 매핑만 삭제
    DELETE FROM channel_mappings 
    WHERE channel = p_channel AND is_default = false;
    
    RAISE NOTICE '채널 %의 사용자 정의 매핑이 초기화되었습니다.', p_channel;
END;
$$ language 'plpgsql';

-- 2. 매핑 복사 함수 (한 채널의 매핑을 다른 채널로 복사)
CREATE OR REPLACE FUNCTION copy_channel_mapping(
    source_channel VARCHAR(50), 
    target_channel VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    -- 대상 채널의 기존 사용자 정의 매핑 삭제
    DELETE FROM channel_mappings 
    WHERE channel = target_channel AND is_default = false;
    
    -- 소스 채널의 매핑을 대상 채널로 복사
    INSERT INTO channel_mappings (channel, excel_column, database_column, is_default)
    SELECT target_channel, excel_column, database_column, false
    FROM channel_mappings
    WHERE channel = source_channel AND is_default = false;
    
    RAISE NOTICE '채널 %의 매핑이 채널 %로 복사되었습니다.', source_channel, target_channel;
END;
$$ language 'plpgsql';

-- 3. 매핑 검증 함수
CREATE OR REPLACE FUNCTION validate_channel_mapping(p_channel VARCHAR(50))
RETURNS TABLE(
    excel_column VARCHAR(100), 
    database_column VARCHAR(100), 
    is_valid BOOLEAN, 
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.excel_column,
        cm.database_column,
        CASE 
            WHEN cm.database_column IN (
                'order_number', 'order_date', 'status', 'quantity', 
                'product_name', 'product_option', 'customer_name', 
                'customer_phone', 'unit_price', 'total_price'
            ) THEN true
            ELSE false
        END as is_valid,
        CASE 
            WHEN cm.database_column NOT IN (
                'order_number', 'order_date', 'status', 'quantity', 
                'product_name', 'product_option', 'customer_name', 
                'customer_phone', 'unit_price', 'total_price'
            ) THEN '지원되지 않는 데이터베이스 컬럼: ' || cm.database_column
            ELSE NULL
        END as error_message
    FROM channel_mappings cm
    WHERE cm.channel = p_channel;
END;
$$ language 'plpgsql';

-- 4. 매핑 백업/복원 함수들
CREATE OR REPLACE FUNCTION backup_channel_mapping(p_channel VARCHAR(50))
RETURNS JSON AS $$
DECLARE
    mapping_data JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'excel_column', excel_column,
            'database_column', database_column,
            'is_default', is_default
        )
    ) INTO mapping_data
    FROM channel_mappings
    WHERE channel = p_channel;
    
    RETURN mapping_data;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION restore_channel_mapping(
    p_channel VARCHAR(50), 
    p_mapping_data JSON
)
RETURNS VOID AS $$
DECLARE
    mapping_item JSON;
BEGIN
    -- 기존 사용자 정의 매핑 삭제
    DELETE FROM channel_mappings 
    WHERE channel = p_channel AND is_default = false;
    
    -- JSON 데이터에서 매핑 복원
    FOR mapping_item IN SELECT * FROM json_array_elements(p_mapping_data)
    LOOP
        INSERT INTO channel_mappings (channel, excel_column, database_column, is_default)
        VALUES (
            p_channel,
            (mapping_item->>'excel_column')::VARCHAR(100),
            (mapping_item->>'database_column')::VARCHAR(100),
            (mapping_item->>'is_default')::BOOLEAN
        );
    END LOOP;
    
    RAISE NOTICE '채널 %의 매핑이 복원되었습니다.', p_channel;
END;
$$ language 'plpgsql';

-- 5. 매핑 통계 뷰 (상세)
CREATE OR REPLACE VIEW mapping_detailed_statistics AS
SELECT 
    channel,
    COUNT(*) as total_mappings,
    COUNT(CASE WHEN is_default THEN 1 END) as default_mappings,
    COUNT(CASE WHEN NOT is_default THEN 1 END) as custom_mappings,
    COUNT(CASE WHEN database_column IN ('order_number', 'order_date', 'status', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone') THEN 1 END) as required_mappings,
    COUNT(CASE WHEN database_column NOT IN ('order_number', 'order_date', 'status', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone') THEN 1 END) as optional_mappings,
    MAX(updated_at) as last_updated
FROM channel_mappings
GROUP BY channel
ORDER BY channel;

-- 6. 사용 예시 쿼리들

-- 채널별 매핑 조회
-- SELECT * FROM get_channel_mapping('smartstore');

-- 매핑 통계 조회
-- SELECT * FROM get_mapping_statistics();

-- 매핑 검증
-- SELECT * FROM validate_channel_mapping('smartstore');

-- 매핑 백업
-- SELECT backup_channel_mapping('smartstore');

-- 매핑 초기화
-- SELECT reset_channel_mapping('smartstore');

-- 매핑 복사
-- SELECT copy_channel_mapping('smartstore', 'ohouse'); 