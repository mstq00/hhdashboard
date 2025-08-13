-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- 사용자 ID 추가
    order_number VARCHAR(255) NOT NULL,
    product_order_number VARCHAR(255), -- 상품주문번호 추가
    order_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(100),
    quantity INTEGER,
    product_name TEXT,
    product_option TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(100),
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    product_id VARCHAR(255),
    option_id VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(100),
    recipient_address TEXT,
    recipient_zipcode VARCHAR(20),
    shipping_cost DECIMAL(10,2),
    assembly_cost DECIMAL(10,2),
    settlement_amount DECIMAL(10,2),
    tracking_number VARCHAR(255),
    courier_company VARCHAR(100),
    claim_status VARCHAR(100),
    delivery_message TEXT,
    purchase_confirmation_date DATE,
    shipment_date DATE,
    payment_completion_date DATE,
    buyer_id VARCHAR(255),
    payment_method VARCHAR(100),
    customs_clearance_code VARCHAR(100),
    channel VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_product_order_number ON orders(product_order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_product_name ON orders(product_name);

-- Create mapping_configs table for storing column mappings
CREATE TABLE IF NOT EXISTS mapping_configs (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    mapping JSONB NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel, user_id)
);

-- Create password_configs table for storing file passwords
CREATE TABLE IF NOT EXISTS password_configs (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    password TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel, user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_configs ENABLE ROW LEVEL SECURITY;
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

-- Create RLS policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own orders" ON orders
    FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own mapping configs" ON mapping_configs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own mapping configs" ON mapping_configs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own mapping configs" ON mapping_configs
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own mapping configs" ON mapping_configs
    FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own password configs" ON password_configs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own password configs" ON password_configs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own password configs" ON password_configs
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own password configs" ON password_configs
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
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mapping_configs_updated_at BEFORE UPDATE ON mapping_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_password_configs_updated_at BEFORE UPDATE ON password_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_cycles_updated_at BEFORE UPDATE ON goal_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle duplicate orders
CREATE OR REPLACE FUNCTION handle_duplicate_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if an order with the same order_number and channel already exists
    IF EXISTS (
        SELECT 1 FROM orders 
        WHERE order_number = NEW.order_number 
        AND channel = NEW.channel
        AND id != NEW.id
    ) THEN
        -- If duplicate exists, update the existing record instead of inserting
        UPDATE orders SET
            user_id = NEW.user_id,
            product_order_number = NEW.product_order_number,
            order_date = NEW.order_date,
            status = NEW.status,
            quantity = NEW.quantity,
            product_name = NEW.product_name,
            product_option = NEW.product_option,
            customer_name = NEW.customer_name,
            customer_phone = NEW.customer_phone,
            unit_price = NEW.unit_price,
            total_price = NEW.total_price,
            product_id = NEW.product_id,
            option_id = NEW.option_id,
            recipient_name = NEW.recipient_name,
            recipient_phone = NEW.recipient_phone,
            recipient_address = NEW.recipient_address,
            recipient_zipcode = NEW.recipient_zipcode,
            shipping_cost = NEW.shipping_cost,
            assembly_cost = NEW.assembly_cost,
            settlement_amount = NEW.settlement_amount,
            tracking_number = NEW.tracking_number,
            courier_company = NEW.courier_company,
            claim_status = NEW.claim_status,
            delivery_message = NEW.delivery_message,
            purchase_confirmation_date = NEW.purchase_confirmation_date,
            shipment_date = NEW.shipment_date,
            payment_completion_date = NEW.payment_completion_date,
            buyer_id = NEW.buyer_id,
            payment_method = NEW.payment_method,
            customs_clearance_code = NEW.customs_clearance_code,
            updated_at = NOW()
        WHERE order_number = NEW.order_number AND channel = NEW.channel;
        
        -- Return NULL to prevent the insert
        RETURN NULL;
    END IF;
    
    -- If no duplicate, proceed with the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate order handling
CREATE TRIGGER trigger_handle_duplicate_orders
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_duplicate_orders();

-- Insert sample data for goal cycles
INSERT INTO goal_cycles (id, name, start_date, end_date, keywords, is_default, user_id) VALUES
('550e8400-e29b-41d4-a716-446655440001', '25년 하반기', '2025-07-01', '2025-12-31', ARRAY['효율', '혁신', '확장'], true, 'sample-user'),
('550e8400-e29b-41d4-a716-446655440002', '기본 사이클', '2025-01-01', '2025-12-31', ARRAY['성장', '안정'], false, 'sample-user'),
('550e8400-e29b-41d4-a716-446655440003', 'Q1 목표', '2025-01-01', '2025-03-31', ARRAY['출시', '마케팅'], false, 'sample-user')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON mapping_configs TO authenticated;
GRANT ALL ON password_configs TO authenticated;
GRANT ALL ON goal_cycles TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goal_checkins TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE mapping_configs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE password_configs_id_seq TO authenticated; 