ALTER TABLE tickets
ADD COLUMN is_customer_support BOOL DEFAULT FALSE;;

ALTER TABLE tickets
ADD COLUMN customer_support_type TEXT DEFAULT NULL;;
