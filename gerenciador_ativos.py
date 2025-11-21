import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client
import json
import os

# Configurações / Credenciais
# Tenta obter do ambiente (para GitHub Actions), senão usa fallback (para teste local simples)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://deipytqxqkmyadabtjnd.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlaXB5dHF4cWtteWFkYWJ0am5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzY0NzcsImV4cCI6MjA3MTMxMjQ3N30.p4j6kY61Giu3YIE0huyPjxh59JV6lYnOTsenbcyuAUM")

def salvar_no_supabase(dados_ativos: list):
    """
    Salva uma lista de dicionários na tabela 'financial_assets' do Supabase.

    Args:
        dados_ativos: Lista de dicionários com os dados dos ativos.
    """
    if not dados_ativos:
        print("Lista vazia. Nenhum dado para salvar no Supabase.")
        return

    try:
        print("Conectando ao Supabase...")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        print(f"Enviando {len(dados_ativos)} registros via RPC 'bulk_upsert_assets'...")
        # Chamar a função de banco de dados (RPC) para fazer o upsert
        try:
            response = supabase.rpc("bulk_upsert_assets", {"assets_data": dados_ativos}).execute()
            # Se não levantou exceção, assumimos sucesso
            print("Dados salvos no Supabase com sucesso!")
        except Exception as rpc_error:
            print(f"A chamada RPC retornou erro: {rpc_error}")

    except Exception as e:
        print(f"Erro ao salvar dados no Supabase: {e}")


def obter_dados_ativos(lista_tickers: list) -> list:
    """
    Busca dados de preço, dividendos e histórico de uma lista de ativos.

    Args:
        lista_tickers: Uma lista de tickers (ex: ["PETR4.SA", "MXRF11.SA"]).

    Returns:
        Uma lista de dicionários com os dados dos ativos.
    """
    dados_ativos = []

    for ticker in lista_tickers:
        try:
            print(f"Buscando dados para o ticker: {ticker}...")
            ativo = yf.Ticker(ticker)
            info = ativo.info

            # Verificar se conseguimos dados básicos
            # Algumas vezes 'regularMarketPrice' não vem, tentamos 'previousClose' ou 'currentPrice'
            preco_atual = info.get('regularMarketPrice') or info.get('currentPrice') or info.get('previousClose')

            if preco_atual is None:
                print(f"-> Aviso: Não foi possível encontrar preço atual para o ticker '{ticker}'. Pulando.")
                continue

            hoje = datetime.now()
            data_inicio_12m = hoje - timedelta(days=365)

            # 1. Dividendos
            dividends_history = []
            dividendos_12m = 0.0
            try:
                dividendos = ativo.dividends
                if not dividendos.empty:
                    # Filtra últimos 12 meses para soma
                    div_12m = dividendos[dividendos.index.tz_localize(None) > data_inicio_12m]
                    dividendos_12m = float(div_12m.sum())

                    # Histórico completo (ou últimos 2 anos para não ficar gigante)
                    data_inicio_hist = hoje - timedelta(days=730)
                    div_hist = dividendos[dividendos.index.tz_localize(None) > data_inicio_hist]

                    for date, amount in div_hist.items():
                        dividends_history.append({
                            "date": date.strftime("%Y-%m-%d"),
                            "amount": float(amount)
                        })
            except Exception as e:
                print(f"Erro ao buscar dividendos de {ticker}: {e}")

            # 2. Histórico de Preços (Mensal, últimos 12-24 meses)
            price_history = []
            try:
                hist = ativo.history(period="2y", interval="1mo")
                for date, row in hist.iterrows():
                    if pd.isna(row['Close']): continue
                    price_history.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "close": float(row['Close'])
                    })
            except Exception as e:
                print(f"Erro ao buscar histórico de preços de {ticker}: {e}")

            nome = info.get("longName") or info.get("shortName") or ticker
            setor = info.get("sector", "N/A")

            dados_ativos.append({
                "ticker": ticker,
                "name": nome,
                "sector": setor,
                "current_price": round(float(preco_atual), 2),
                "dividends_12m": round(dividendos_12m, 2),
                "price_history": price_history,
                "dividend_history": dividends_history
            })
            print(f"-> Sucesso: Dados de '{ticker}' obtidos.")

        except Exception as e:
            print(f"-> Erro ao processar o ticker '{ticker}': {e}. Pulando.")

    return dados_ativos

def obter_tickers_do_supabase() -> list:
    """
    Busca a lista de tickers únicos do Supabase.
    """
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Buscando tickers únicos no Supabase...")

        # Tentar usar a RPC get_unique_tickers (pode não existir se a migration não foi rodada)
        try:
            response = supabase.rpc("get_unique_tickers").execute()
            if response.data:
                tickers = [item['ticker'] for item in response.data]
                valid_tickers = [t for t in tickers if isinstance(t, str) and len(t) >= 4]
                print(f"Tickers encontrados via RPC: {len(valid_tickers)}")
                return valid_tickers
        except Exception as rpc_error:
            print(f"RPC 'get_unique_tickers' não disponível ou erro: {rpc_error}")
            print("Tentando buscar diretamente da tabela 'financial_assets'...")

            # Fallback: Tentar ler financial_assets (tabela pública)
            try:
                response = supabase.table("financial_assets").select("ticker").execute()
                if response.data:
                    tickers = list(set([item['ticker'] for item in response.data]))
                    print(f"Tickers encontrados em 'financial_assets': {len(tickers)}")
                    return tickers
            except Exception as table_error:
                print(f"Erro ao ler tabela 'financial_assets': {table_error}")

        return []

    except Exception as e:
        print(f"Erro ao conectar ao Supabase: {e}")
        return []

if __name__ == "__main__":
    print("--- Iniciando Gerenciador de Ativos (Python) ---")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERRO: Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY não encontradas (e fallback falhou).")
        exit(1)

    # 1. Obter tickers do banco de dados
    meus_ativos = obter_tickers_do_supabase()

    # Fallback se não encontrar nada (para teste inicial ou se o DB estiver vazio)
    if not meus_ativos:
        print("Nenhum ticker encontrado. Usando lista padrão de exemplo...")
        meus_ativos = ["PETR4.SA", "VALE3.SA", "MXRF11.SA", "ITSA4.SA", "WEGE3.SA"]

    print(f"Tickers a processar: {meus_ativos}")

    # 2. Buscar dados no Yahoo Finance
    print(f"\nProcessando {len(meus_ativos)} ativos...")
    dados_finais = obter_dados_ativos(meus_ativos)
    print("--- Busca finalizada ---\n")

    # 3. Salvar no Supabase
    if dados_finais:
        print("--- Salvando dados no Supabase ---")
        salvar_no_supabase(dados_finais)
    else:
        print("Nenhum dado de ativo foi obtido. Nada a salvar.")
