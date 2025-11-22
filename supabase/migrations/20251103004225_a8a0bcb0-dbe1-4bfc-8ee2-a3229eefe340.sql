-- Add category column to investment_transactions table
ALTER TABLE public.investment_transactions 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'ACAO';