import yfinance as yf
import pandas as pd
import sqlite3
from datetime import datetime, timedelta

def salvar_em_sqlite(df: pd.DataFrame, nome_banco: str = "ativos.db", nome_tabela: str = "dados_ativos"):
    """
    Salva um DataFrame em uma tabela de um banco de dados SQLite.

    Args:
        df: DataFrame a ser salvo.
        nome_banco: Nome do arquivo do banco de dados SQLite.
        nome_tabela: Nome da tabela onde os dados serão salvos.
    """
    if df.empty:
        print("DataFrame vazio. Nenhum dado para salvar no banco de dados.")
        return

    try:
        conexao = sqlite3.connect(nome_banco)
        df.to_sql(nome_tabela, conexao, if_exists="replace", index=False)
        print(f"Dados salvos com sucesso na tabela '{nome_tabela}' do banco '{nome_banco}'.")
        conexao.close()
    except Exception as e:
        print(f"Erro ao salvar dados no SQLite: {e}")

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

            # O método info pode ser lento e às vezes falha para tickers inválidos
            info = ativo.info

            # Validação para ticker inválido
            if not info or info.get('regularMarketPrice') is None:
                print(f"-> Aviso: Não foi possível encontrar dados para o ticker '{ticker}'. Pulando.")
                continue

            # 1. Obter preço atual
            preco_atual = info.get('regularMarketPrice', 0)

            # 2. Obter dividendos dos últimos 12 meses
            hoje = datetime.now()
            data_inicio_12m = hoje - timedelta(days=365)

            dividendos = ativo.dividends
            if not dividendos.empty:
                # Remove a informação de fuso horário do índice para permitir a comparação
                dividendos_12m = dividendos[dividendos.index.tz_localize(None) > data_inicio_12m].sum()
            else:
                dividendos_12m = 0

            # 3. Obter informações extras
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
    # --- Exemplo de Uso ---

    # 1. Lista de ativos da sua corretora (incluindo um ticker inválido para teste)
    meus_ativos = ["PETR4.SA", "VALE3.SA", "MXRF11.SA", "HCTR11.SA", "ATIVO_INVALIDO"]

    print("--- Iniciando busca de dados dos ativos ---")
    df_ativos = obter_dados_ativos(meus_ativos)
    print("--- Busca finalizada ---\n")

    if not df_ativos.empty:
        # Saída 1: Exibir o DataFrame no console
        print("--- Resultado em formato de Tabela (DataFrame) ---")
        print(df_ativos)
        print("\n" + "="*50 + "\n")

        # Saída 2: Exibir como JSON, conforme o exemplo do prompt
        print("--- Resultado em formato JSON ---")
        json_output = df_ativos.to_json(orient="records", indent=2, force_ascii=False)
        print(json_output)
        print("\n" + "="*50 + "\n")

        # Saída 3: Salvar no banco de dados SQLite
        print("--- Salvando dados no Banco de Dados ---")
        salvar_em_sqlite(df_ativos, nome_banco="meus_investimentos.db")

    else:
        print("Nenhum dado de ativo foi obtido. Verifique os tickers informados.")
