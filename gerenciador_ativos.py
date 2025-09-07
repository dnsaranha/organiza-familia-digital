import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client

def salvar_no_supabase(df: pd.DataFrame):
    """
    Salva um DataFrame na tabela 'financial_assets' do Supabase.

    Args:
        df: DataFrame a ser salvo.
    """
    if df.empty:
        print("DataFrame vazio. Nenhum dado para salvar no Supabase.")
        return

    # Credenciais do Supabase (encontradas em src/integrations/supabase/client.ts)
    supabase_url = "https://deipytqxqkmyadabtjnd.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlaXB5dHF4cWtteWFkYWJ0am5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzY0NzcsImV4cCI6MjA3MTMxMjQ3N30.p4j6kY61Giu3YIE0huyPjxh59JV6lYnOTsenbcyuAUM"

    try:
        print("Conectando ao Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)

        # Renomear colunas para corresponder à tabela do banco de dados
        df_renamed = df.rename(columns={
            "nome": "name",
            "setor": "sector",
            "preco_atual": "current_price",
            "dividendos_12m": "dividends_12m"
        })

        # Converter DataFrame para lista de dicionários
        dados_para_upsert = df_renamed.to_dict(orient="records")

        print(f"Enviando {len(dados_para_upsert)} registros via RPC 'bulk_upsert_assets'...")
        # Chamar a função de banco de dados (RPC) para fazer o upsert
        response = supabase.rpc("bulk_upsert_assets", {"assets_data": dados_para_upsert}).execute()

        # A chamada RPC não retorna dados em caso de sucesso, então verificamos se há erro
        if response.data is None and response.error is None:
             print("Dados salvos no Supabase com sucesso!")
        else:
             print(f"A chamada RPC retornou um resultado inesperado: {response}")
        # Opcional: imprimir resposta para depuração
        # print("Resposta do Supabase:", response)

    except Exception as e:
        print(f"Erro ao salvar dados no Supabase: {e}")


def obter_dados_ativos(lista_tickers: list) -> pd.DataFrame:
    """
    Busca dados de preço, dividendos e informações de uma lista de ativos.

    Args:
        lista_tickers: Uma lista de tickers (ex: ["PETR4.SA", "MXRF11.SA"]).

    Returns:
        Um DataFrame do pandas com os dados dos ativos encontrados.
    """
    dados_ativos = []

    for ticker in lista_tickers:
        try:
            print(f"Buscando dados para o ticker: {ticker}...")
            ativo = yf.Ticker(ticker)
            info = ativo.info

            if not info or info.get('regularMarketPrice') is None:
                print(f"-> Aviso: Não foi possível encontrar dados para o ticker '{ticker}'. Pulando.")
                continue

            preco_atual = info.get('regularMarketPrice', 0)
            hoje = datetime.now()
            data_inicio_12m = hoje - timedelta(days=365)

            dividendos = ativo.dividends
            if not dividendos.empty:
                dividendos_12m = dividendos[dividendos.index.tz_localize(None) > data_inicio_12m].sum()
            else:
                dividendos_12m = 0

            nome = info.get("longName", ticker)
            setor = info.get("sector", "N/A")

            dados_ativos.append({
                "ticker": ticker,
                "nome": nome,
                "setor": setor,
                "preco_atual": round(preco_atual, 2),
                "dividendos_12m": round(dividendos_12m, 2),
            })
            print(f"-> Sucesso: Dados de '{ticker}' obtidos.")

        except Exception as e:
            print(f"-> Erro ao processar o ticker '{ticker}': {e}. Pulando.")

    if not dados_ativos:
        return pd.DataFrame()

    return pd.DataFrame(dados_ativos)

if __name__ == "__main__":
    meus_ativos = ["PETR4.SA", "VALE3.SA", "MXRF11.SA", "ITSA4.SA", "WEGE3.SA", "ATIVO_INVALIDO"]

    print("--- Iniciando busca de dados dos ativos ---")
    df_ativos = obter_dados_ativos(meus_ativos)
    print("--- Busca finalizada ---\n")

    if not df_ativos.empty:
        print("--- Resultado em formato de Tabela (DataFrame) ---")
        print(df_ativos)
        print("\n" + "="*50 + "\n")

        print("--- Salvando dados no Supabase ---")
        salvar_no_supabase(df_ativos)

    else:
        print("Nenhum dado de ativo foi obtido. Verifique os tickers informados.")
