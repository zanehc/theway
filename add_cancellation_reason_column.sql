-- Add cancellation_reason column to orders table
ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;

-- Add comment to the column
COMMENT ON COLUMN orders.cancellation_reason IS '주문 취소 사유';