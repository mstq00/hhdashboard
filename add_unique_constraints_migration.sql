-- Add unique constraints for duplicate prevention
-- This migration adds unique constraints to prevent duplicate orders

-- First, let's check if there are any existing duplicate records and clean them up
-- We'll keep the most recent record for each unique combination

-- For Smartstore: channel, order_number, product_order_number, product_name, product_option
-- For other channels: channel, order_number, product_name, product_option

-- Step 1: Create a temporary table to identify duplicates
CREATE TEMP TABLE duplicate_orders AS
SELECT 
    id,
    channel,
    order_number,
    product_order_number,
    product_name,
    product_option,
    created_at,
    ROW_NUMBER() OVER (
        PARTITION BY 
            channel,
            order_number,
            COALESCE(product_order_number, ''),
            COALESCE(product_name, ''),
            COALESCE(product_option, '')
        ORDER BY created_at DESC
    ) as rn
FROM orders;

-- Step 2: Delete duplicate records (keep only the most recent one)
DELETE FROM orders 
WHERE id IN (
    SELECT id 
    FROM duplicate_orders 
    WHERE rn > 1
);

-- Step 3: Add unique constraints
-- For Smartstore orders (with product_order_number)
ALTER TABLE orders 
ADD CONSTRAINT unique_smartstore_order 
UNIQUE (channel, order_number, product_order_number, product_name, product_option)
WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;

-- For other channels (without product_order_number)
ALTER TABLE orders 
ADD CONSTRAINT unique_other_channel_order 
UNIQUE (channel, order_number, product_name, product_option)
WHERE channel != 'smartstore' OR product_order_number IS NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_unique_smartstore 
ON orders (channel, order_number, product_order_number, product_name, product_option)
WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_unique_other 
ON orders (channel, order_number, product_name, product_option)
WHERE channel != 'smartstore' OR product_order_number IS NULL;

-- Step 5: Clean up temporary table
DROP TABLE duplicate_orders;

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Unique constraints added successfully for duplicate prevention';
    RAISE NOTICE 'Smartstore constraint: unique_smartstore_order';
    RAISE NOTICE 'Other channels constraint: unique_other_channel_order';
END $$; 