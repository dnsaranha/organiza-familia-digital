# Documentação dos Endpoints de Integração Financeira

## Open Banking Brasil

### 1. Criar Consentimento
**Endpoint:** `POST /functions/v1/open-banking-consent`

**Payload:**
```json
{
  "permissions": [
    "ACCOUNTS_READ",
    "ACCOUNTS_BALANCES_READ",
    "RESOURCES_READ"
  ],
  "institutionId": "banco-do-brasil",
  "redirectUri": "https://seuapp.com/callback"
}
```

**Resposta:**
```json
{
  "consentId": "urn:bancoex:C1DD33123",
  "consentUrl": "https://auth.banco.com.br/authorize?..."
}
```

### 2. Buscar Contas
**Endpoint:** `POST /functions/v1/open-banking-accounts`

**Payload:**
```json
{
  "consentId": "urn:bancoex:C1DD33123"
}
```

**Resposta:**
```json
{
  "accounts": [
    {
      "accountId": "291e5a29-49ed-401f-a583-193caa7aceee",
      "brandName": "Banco Exemplo",
      "companyCnpj": "50685362000135",
      "type": "CONTA_DEPOSITO_A_VISTA",
      "number": "1234567890",
      "availableAmount": 1500.25,
      "blockedAmount": 0
    }
  ]
}
```

### 3. Buscar Transações
**Endpoint:** `POST /functions/v1/open-banking-transactions`

**Payload:**
```json
{
  "consentId": "urn:bancoex:C1DD33123",
  "accountId": "291e5a29-49ed-401f-a583-193caa7aceee",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31"
}
```

## B3 e Cotações

### 1. Buscar Cotações
**Endpoint:** `POST /functions/v1/b3-quotes`

**Payload:**
```json
{
  "symbols": ["PETR4", "VALE3", "KNRI11"]
}
```

**Resposta:**
```json
{
  "quotes": [
    {
      "symbol": "PETR4",
      "shortName": "PETROBRAS PN",
      "regularMarketPrice": 32.15,
      "regularMarketChange": 0.85,
      "regularMarketChangePercent": 2.71,
      "currency": "BRL",
      "marketCap": 418000000000,
      "volume": 25000000
    }
  ]
}
```

### 2. Buscar Carteira
**Endpoint:** `POST /functions/v1/b3-portfolio`

**Payload:**
```json
{
  "brokerId": "clear-corretora",
  "accessToken": "bearer_token_here"
}
```

**Resposta:**
```json
{
  "portfolio": {
    "accountId": "clear-account-001",
    "positions": [
      {
        "symbol": "PETR4",
        "quantity": 100,
        "averagePrice": 30.50,
        "currentPrice": 32.15,
        "marketValue": 3215.00,
        "gainLoss": 165.00,
        "gainLossPercent": 5.41,
        "assetType": "STOCK"
      }
    ],
    "totalValue": 50000.00,
    "totalCost": 45000.00,
    "totalGainLoss": 5000.00,
    "totalGainLossPercent": 11.11
  }
}
```

### 3. Buscar Dividendos
**Endpoint:** `POST /functions/v1/b3-dividends`

**Payload:**
```json
{
  "brokerId": "clear-corretora",
  "accessToken": "bearer_token_here",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31"
}
```

## Códigos de Erro

### Open Banking
- `CONSENT_EXPIRED` (400): Consentimento expirado
- `INVALID_TOKEN` (401): Token inválido
- `INSUFFICIENT_PERMISSIONS` (403): Permissões insuficientes
- `ACCOUNT_NOT_FOUND` (404): Conta não encontrada
- `RATE_LIMIT_EXCEEDED` (429): Limite de requisições excedido

### B3/Cotações
- `INVALID_SYMBOL` (400): Símbolo inválido
- `MARKET_CLOSED` (200): Mercado fechado (última cotação)
- `QUOTE_SERVICE_DOWN` (503): Serviço indisponível
- `RATE_LIMIT_EXCEEDED` (429): Limite de requisições excedido

### Corretoras
- `BROKER_UNAVAILABLE` (503): Corretora indisponível
- `INVALID_CREDENTIALS` (401): Credenciais inválidas
- `PORTFOLIO_NOT_FOUND` (404): Carteira não encontrada

## Rate Limits

### Yahoo Finance
- 2000 requisições/hora
- 48 requisições/minuto
- Recomendado: Cache de 5 minutos

### Open Banking
- Varia por instituição
- Geralmente: 1000 requisições/hora
- Recomendado: Cache de 15 minutos

### APIs de Corretoras
- Varia por corretora
- Clear: 100 requisições/minuto
- XP: 60 requisições/minuto
- Rico: 120 requisições/minuto

## Exemplos de Uso

### Frontend (React)

```typescript
import { useB3Data } from '@/hooks/useB3Data';
import { useOpenBanking } from '@/hooks/useOpenBanking';

function MyComponent() {
  const { getAssetQuotes, portfolio } = useB3Data();
  const { accounts, loadTransactions } = useOpenBanking();

  // Buscar cotações
  const quotes = await getAssetQuotes(['PETR4', 'VALE3']);

  // Buscar transações bancárias
  if (accounts.length > 0) {
    await loadTransactions(accounts[0].accountId);
  }
}
```

### Edge Functions

```typescript
// Exemplo de chamada para API externa
const response = await fetch('https://api.externa.com/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

## Testes

### Ambiente Sandbox

Para testes, use as URLs de sandbox:

```bash
# Open Banking Sandbox
OPEN_BANKING_BASE_URL=https://matls-auth.sandbox.directory.openbankingbrasil.org.br

# Dados de teste
TEST_CPF=11111111111
TEST_BANK_ACCOUNT=12345-6
```

### Dados de Teste

O sistema inclui dados simulados para desenvolvimento:
- Carteira com 4 ativos diferentes
- Transações bancárias dos últimos 90 dias
- Dividendos recebidos no mês atual
- Cotações em tempo real via Yahoo Finance

## Monitoramento

### Métricas Importantes

1. **Disponibilidade das APIs**
   - Uptime > 99.5%
   - Tempo de resposta < 5s

2. **Qualidade dos Dados**
   - Cotações atualizadas < 5min
   - Transações sincronizadas < 1h

3. **Segurança**
   - Zero vazamentos de dados
   - Logs de auditoria completos

### Dashboards

Configure dashboards para monitorar:
- Status das conexões
- Volume de requisições
- Erros por tipo
- Performance das APIs

## Próximos Passos

1. **Implementar certificados mTLS** para Open Banking
2. **Adicionar mais corretoras** (Inter, Nubank, etc.)
3. **Implementar análise de risco** baseada em dados reais
4. **Adicionar alertas inteligentes** baseados em padrões
5. **Implementar machine learning** para recomendações

## Suporte

Para questões sobre a integração:
- 📧 Email: dev@organiza.com
- 📚 Docs: https://docs.organiza.com
- 🐛 Issues: https://github.com/organiza/issues