-- Remover a view existente que pode estar insegura
DROP VIEW IF EXISTS stripe_user_orders;

-- Recriar a view com security_invoker = true para respeitar RLS
-- Isso garante que a view use as credenciais do usuário que a consulta
CREATE VIEW stripe_user_orders
WITH (security_invoker = true)
AS
SELECT 
  o.checkout_session_id,
  o.customer_id,
  o.payment_intent_id,
  o.id as order_id,  -- Mapear id para order_id para manter compatibilidade
  o.payment_status,
  o.currency,
  o.amount_subtotal,
  o.amount_total,
  o.status as order_status,
  o.created_at as order_date
FROM stripe_orders o
WHERE o.deleted_at IS NULL
  AND o.customer_id IN (
    SELECT customer_id 
    FROM stripe_customers 
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
  );

COMMENT ON VIEW stripe_user_orders IS 
'View segura que mostra apenas os pedidos do usuário autenticado. 
Usa security_invoker=true para respeitar as políticas RLS e filtrar por auth.uid().';