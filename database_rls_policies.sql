-- Supabase RLS (Row Level Security) 정책 설정
-- 이 파일은 database_schema.sql 실행 후에 실행해야 합니다.

-- 1. orders 테이블 RLS 정책
-- 모든 사용자가 주문 데이터를 읽을 수 있음
CREATE POLICY "Allow read access to orders" ON orders
    FOR SELECT USING (true);

-- 인증된 사용자만 주문 데이터를 삽입할 수 있음
CREATE POLICY "Allow insert access to orders for authenticated users" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자만 주문 데이터를 업데이트할 수 있음
CREATE POLICY "Allow update access to orders for authenticated users" ON orders
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 인증된 사용자만 주문 데이터를 삭제할 수 있음
CREATE POLICY "Allow delete access to orders for authenticated users" ON orders
    FOR DELETE USING (auth.role() = 'authenticated');

-- 2. channel_default_passwords 테이블 RLS 정책
-- 인증된 사용자만 기본 비밀번호를 읽을 수 있음
CREATE POLICY "Allow read access to channel_default_passwords for authenticated users" ON channel_default_passwords
    FOR SELECT USING (auth.role() = 'authenticated');

-- 인증된 사용자만 기본 비밀번호를 관리할 수 있음
CREATE POLICY "Allow all access to channel_default_passwords for authenticated users" ON channel_default_passwords
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. user_channel_passwords 테이블 RLS 정책
-- 사용자는 자신의 비밀번호만 읽을 수 있음
CREATE POLICY "Allow users to read their own channel passwords" ON user_channel_passwords
    FOR SELECT USING (auth.uid()::text = user_id);

-- 사용자는 자신의 비밀번호만 관리할 수 있음
CREATE POLICY "Allow users to manage their own channel passwords" ON user_channel_passwords
    FOR ALL USING (auth.uid()::text = user_id);

-- 4. file_uploads 테이블 RLS 정책
-- 사용자는 자신의 업로드 히스토리만 읽을 수 있음
CREATE POLICY "Allow users to read their own upload history" ON file_uploads
    FOR SELECT USING (auth.uid()::text = user_id);

-- 인증된 사용자만 업로드 히스토리를 생성할 수 있음
CREATE POLICY "Allow authenticated users to create upload history" ON file_uploads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 사용자는 자신의 업로드 히스토리만 업데이트할 수 있음
CREATE POLICY "Allow users to update their own upload history" ON file_uploads
    FOR UPDATE USING (auth.uid()::text = user_id);

-- 5. channel_mappings 테이블 RLS 정책
-- 모든 사용자가 채널 매핑을 읽을 수 있음
CREATE POLICY "Allow read access to channel_mappings" ON channel_mappings
    FOR SELECT USING (true);

-- 인증된 사용자만 채널 매핑을 관리할 수 있음
CREATE POLICY "Allow all access to channel_mappings for authenticated users" ON channel_mappings
    FOR ALL USING (auth.role() = 'authenticated');

-- 추가 보안 정책 (선택사항)
-- 특정 역할이나 권한이 있는 사용자만 관리할 수 있도록 제한하려면 아래 정책을 사용

-- 관리자만 모든 데이터를 관리할 수 있도록 제한하는 정책 (예시)
-- CREATE POLICY "Allow admin access to all data" ON orders
--     FOR ALL USING (
--         EXISTS (
--             SELECT 1 FROM auth.users 
--             WHERE auth.users.id = auth.uid() 
--             AND auth.users.raw_user_meta_data->>'role' = 'admin'
--         )
--     );

-- 특정 채널의 데이터만 접근할 수 있도록 제한하는 정책 (예시)
-- CREATE POLICY "Allow access to specific channel data" ON orders
--     FOR ALL USING (
--         channel = 'smartstore' AND 
--         EXISTS (
--             SELECT 1 FROM auth.users 
--             WHERE auth.users.id = auth.uid() 
--             AND auth.users.raw_user_meta_data->>'allowed_channels' LIKE '%smartstore%'
--         )
--     ); 