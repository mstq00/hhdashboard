-- 목표 관리 시스템 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 목표 사이클 테이블
CREATE TABLE IF NOT EXISTS goal_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_period_set BOOLEAN DEFAULT false,
  limit_goal_setting BOOLEAN DEFAULT false,
  use_approval BOOLEAN DEFAULT false,
  is_readonly BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 목표 테이블
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cycle_id UUID REFERENCES goal_cycles(id) ON DELETE SET NULL,
  parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  organization VARCHAR(100) NOT NULL,
  assignee VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  metric_name VARCHAR(300),
  start_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  current_value DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- pending, on_track, difficult, completed, stopped
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 체크인 이력 테이블
CREATE TABLE IF NOT EXISTS goal_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  value DECIMAL(15,2),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_goals_cycle_id ON goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_assignee ON goals(assignee);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_checkins_goal_id ON goal_checkins(goal_id);

-- 기본 사이클 데이터 삽입
INSERT INTO goal_cycles (name, is_period_set, limit_goal_setting, use_approval, is_readonly) 
VALUES ('기본 사이클', false, false, false, false)
ON CONFLICT DO NOTHING;

-- 2025년 하반기 사이클 데이터 삽입
INSERT INTO goal_cycles (name, start_date, end_date, is_period_set, limit_goal_setting, use_approval, is_readonly) 
VALUES ('25년 하반기', '2025-07-01', '2025-12-31', true, false, false, false)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE goal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_checkins ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (모든 사용자가 읽기 가능, 인증된 사용자만 쓰기 가능)
CREATE POLICY "Allow all users to read goal_cycles" ON goal_cycles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert goal_cycles" ON goal_cycles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update goal_cycles" ON goal_cycles FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete goal_cycles" ON goal_cycles FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read goals" ON goals FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert goals" ON goals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update goals" ON goals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete goals" ON goals FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read goal_checkins" ON goal_checkins FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert goal_checkins" ON goal_checkins FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update goal_checkins" ON goal_checkins FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete goal_checkins" ON goal_checkins FOR DELETE USING (auth.role() = 'authenticated');

-- 권한 설정
GRANT ALL ON goal_cycles TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goal_checkins TO authenticated;

SELECT 'Goals schema created successfully!' as status; 