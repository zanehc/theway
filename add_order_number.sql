-- Add stable daily order numbers such as 260509-1.
-- The date portion uses Korea time (Asia/Seoul).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text;

CREATE OR REPLACE FUNCTION public.build_daily_order_number(order_created_at timestamptz)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  order_day date;
  day_code text;
  next_sequence integer;
BEGIN
  order_day := (COALESCE(order_created_at, now()) AT TIME ZONE 'Asia/Seoul')::date;
  day_code := to_char(order_day, 'YYMMDD');

  PERFORM pg_advisory_xact_lock(hashtext('orders-order-number-' || day_code));

  SELECT COALESCE(MAX(split_part(order_number, '-', 2)::integer), 0) + 1
  INTO next_sequence
  FROM public.orders
  WHERE order_number ~ ('^' || day_code || '-[0-9]+$');

  RETURN day_code || '-' || next_sequence;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := public.build_daily_order_number(NEW.created_at);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number_before_insert ON public.orders;
CREATE TRIGGER set_order_number_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

DO $$
DECLARE
  order_row record;
  order_day date;
  day_code text;
  sequence_number integer;
BEGIN
  FOR order_row IN
    SELECT id, created_at
    FROM public.orders
    WHERE order_number IS NULL OR btrim(order_number) = ''
    ORDER BY (created_at AT TIME ZONE 'Asia/Seoul')::date, created_at, id
  LOOP
    order_day := (order_row.created_at AT TIME ZONE 'Asia/Seoul')::date;
    day_code := to_char(order_day, 'YYMMDD');

    SELECT COALESCE(MAX(split_part(order_number, '-', 2)::integer), 0) + 1
    INTO sequence_number
    FROM public.orders
    WHERE order_number ~ ('^' || day_code || '-[0-9]+$');

    UPDATE public.orders
    SET order_number = day_code || '-' || sequence_number
    WHERE id = order_row.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON public.orders (order_number);
