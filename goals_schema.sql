-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create goal_cycles table
CREATE TABLE IF NOT EXISTS goal_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  keywords TEXT[], -- Array of keywords
  is_default BOOLEAN DEFAULT false,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cycle_id UUID REFERENCES goal_cycles(id) ON DELETE SET NULL,
  parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  organization VARCHAR(100) NOT NULL, -- 개인, 키워드, 공통
  assignee VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  metric_name VARCHAR(300),
  start_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  current_value DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- pending, on_track, difficult, completed, stopped
  keyword VARCHAR(100), -- 키워드 목표인 경우의 키워드
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_checkins table for metric entries
CREATE TABLE IF NOT EXISTS goal_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  note TEXT,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goal_cycles_user_id ON goal_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_cycles_is_default ON goal_cycles(is_default);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_cycle_id ON goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_organization ON goals(organization);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_checkins_goal_id ON goal_checkins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_checkins_user_id ON goal_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_checkins_date ON goal_checkins(checkin_date);

-- Enable Row Level Security (RLS)
ALTER TABLE goal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_checkins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goal management
CREATE POLICY "Users can view their own goal cycles" ON goal_cycles
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own goal cycles" ON goal_cycles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own goal cycles" ON goal_cycles
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own goal cycles" ON goal_cycles
    FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own goal checkins" ON goal_checkins
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own goal checkins" ON goal_checkins
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own goal checkins" ON goal_checkins
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own goal checkins" ON goal_checkins
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_goal_cycles_updated_at BEFORE UPDATE ON goal_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for goal cycles (테스트용)
INSERT INTO goal_cycles (id, name, start_date, end_date, keywords, is_default, user_id) VALUES
('550e8400-e29b-41d4-a716-446655440001', '25년 하반기', '2025-07-01', '2025-12-31', ARRAY['효율', '혁신', '확장'], true, 'sample-user'),
('550e8400-e29b-41d4-a716-446655440002', '기본 사이클', '2025-01-01', '2025-12-31', ARRAY['성장', '안정'], false, 'sample-user'),
('550e8400-e29b-41d4-a716-446655440003', 'Q1 목표', '2025-01-01', '2025-03-31', ARRAY['출시', '마케팅'], false, 'sample-user')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON goal_cycles TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goal_checkins TO authenticated; 