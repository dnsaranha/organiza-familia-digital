CREATE TYPE transaction_import_type AS (
    id UUID,
    date TIMESTAMPTZ,
    description TEXT,
    category TEXT,
    type TEXT,
    amount REAL,
    group_id UUID
);

CREATE OR REPLACE FUNCTION import_transactions(transactions transaction_import_type[])
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    imported_count INT := 0;
    ignored_count INT := 0;
    tx transaction_import_type;
    new_tx_id UUID;
BEGIN
    FOREACH tx IN ARRAY transactions
    LOOP
        -- Check for duplicates based on ID or a combination of fields
        IF EXISTS (
            SELECT 1 FROM public.transactions
            WHERE id = tx.id OR
                  (
                    date_trunc('second', date) = date_trunc('second', tx.date) AND
                    amount = tx.amount AND
                    category = tx.category AND
                    description = tx.description
                  )
        ) THEN
            ignored_count := ignored_count + 1;
        ELSE
            -- Insert new transaction
            INSERT INTO public.transactions(id, date, description, category, type, amount, group_id, user_id)
            VALUES (
                COALESCE(tx.id, gen_random_uuid()),
                tx.date,
                tx.description,
                tx.category,
                tx.type,
                tx.amount,
                tx.group_id,
                auth.uid()
            ) RETURNING id INTO new_tx_id;

            IF new_tx_id IS NOT NULL THEN
                imported_count := imported_count + 1;
            ELSE
                ignored_count := ignored_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN json_build_object('imported', imported_count, 'ignored', ignored_count);
END;
$$;
