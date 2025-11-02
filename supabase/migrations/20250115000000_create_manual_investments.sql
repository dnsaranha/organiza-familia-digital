CREATE TABLE IF NOT EXISTS manual_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id UUID,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  subtype VARCHAR(50),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  quantity DECIMAL(18, 6) NOT NULL,
  price DECIMAL(18, 2) NOT NULL,
  total_value DECIMAL(18, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_investments_user_id ON manual_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_investments_group_id ON manual_investments(group_id);
CREATE INDEX IF NOT EXISTS idx_manual_investments_ticker ON manual_investments(ticker);
CREATE INDEX IF NOT EXISTS idx_manual_investments_date ON manual_investments(transaction_date);

ALTER TABLE manual_investments ADD CONSTRAINT fk_manual_investments_group 
  FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;

alter publication supabase_realtime add table manual_investments;