-- Fix remaining database function security issues

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group(_join_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_group_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select id into v_group_id from public.family_groups where join_code = _join_code;

  if v_group_id is null then
    raise exception 'invalid join code';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, v_user_id)
  on conflict do nothing;

  return v_group_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.remove_group_member(p_group_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is the owner of the group
  IF NOT EXISTS (
    SELECT 1
    FROM family_groups
    WHERE id = p_group_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the group owner can remove members.';
  END IF;

  -- Prevent the owner from being removed
  IF (SELECT owner_id FROM family_groups WHERE id = p_group_id) = p_user_id THEN
    RAISE EXCEPTION 'The group owner cannot be removed.';
  END IF;

  DELETE FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_member_role(p_group_id uuid, p_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is the owner of the group
  IF NOT EXISTS (
    SELECT 1
    FROM family_groups
    WHERE id = p_group_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the group owner can update member roles.';
  END IF;

  -- Prevent changing the owner's role
  IF (SELECT owner_id FROM family_groups WHERE id = p_group_id) = p_user_id THEN
    RAISE EXCEPTION 'The group owner''s role cannot be changed.';
  END IF;

  -- Ensure the new role is valid
  IF p_new_role NOT IN ('editor', 'member') THEN
    RAISE EXCEPTION 'Invalid role specified. Must be ''editor'' or ''member''.';
  END IF;

  UPDATE group_members
  SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_transactions(transactions transaction_import_type[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_scheduled_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;