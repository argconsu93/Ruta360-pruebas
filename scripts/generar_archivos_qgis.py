import os
import pandas as pd


def procesar_y_exportar_clientes(opcion_exportacion=None):
  print("==================================================")
  print("🚀 EXPORTADOR DE CLIENTES QGIS / RUTAS (Desde clientes.csv)")
  print("==================================================\n")

  # 1. Determinar el directorio raíz del repositorio
  dir_actual = os.path.dirname(os.path.abspath(__file__))
  dir_raiz = (
      os.path.abspath(os.path.join(dir_actual, ".."))
      if os.path.basename(dir_actual) == "scripts"
      else os.getcwd()
  )

  # 2. Archivo clientes.csv directamente en la raíz
  archivo_clientes = os.path.join(dir_raiz, "clientes.csv")

  if not os.path.exists(archivo_clientes):
    print(
        f"❌ Error: No se encontró el archivo 'clientes.csv' en la raíz"
        f" ({dir_raiz})."
    )
    return

  print(f"📂 Cargando archivo de clientes desde la raíz: {archivo_clientes}...")
  try:
    df_total = pd.read_csv(
        archivo_clientes, dtype=str, engine="python", sep=None
    )
  except Exception:
    df_total = pd.read_csv(archivo_clientes, dtype=str)

  # Normalizar nombres de columnas (mayúsculas y sin espacios extras)
  df_total.columns = df_total.columns.str.strip().str.upper()

  print(f"📊 Total clientes cargados: {len(df_total)} registros.")

  # Identificar la columna de RUTA
  col_ruta_cliente = next(
      (c for c in df_total.columns if "RUTA" in c), "RUTA"
  )
  if col_ruta_cliente not in df_total.columns:
    df_total[col_ruta_cliente] = "SIN_RUTA"

  # Garantizar que existan las columnas DIVISION y GRUPO
  if "DIVISION" not in df_total.columns:
    df_total["DIVISION"] = "SIN_DIVISION"
  if "GRUPO" not in df_total.columns:
    df_total["GRUPO"] = "SIN_GRUPO"

  # Limpiar valores nulos o vacíos
  df_total["DIVISION"] = (
      df_total["DIVISION"]
      .astype(str)
      .str.strip()
      .replace(["", "nan", "NaN"], "SIN_DIVISION")
      .fillna("SIN_DIVISION")
  )
  df_total["GRUPO"] = (
      df_total["GRUPO"]
      .astype(str)
      .str.strip()
      .replace(["", "nan", "NaN"], "SIN_GRUPO")
      .fillna("SIN_GRUPO")
  )

  # 3. Exportación según la opción seleccionada
  if not opcion_exportacion:
    opcion_exportacion = "3"

  carpeta_salida = os.path.join(dir_raiz, "archivos_exportados")
  os.makedirs(carpeta_salida, exist_ok=True)

  # A) Por División (QGIS)
  if opcion_exportacion in ["1", "3", "4"]:
    folder_div = os.path.join(carpeta_salida, "Por_Division")
    os.makedirs(folder_div, exist_ok=True)
    for division, group_df in df_total.groupby("DIVISION"):
      nombre_div = (
          str(division).strip().replace(" ", "_").upper() or "SIN_DIVISION"
      )
      file_path = os.path.join(
          folder_div, f"Clientes_Division_{nombre_div}.csv"
      )
      group_df.to_csv(file_path, index=False, encoding="utf-8-sig")
    print("  ✓ Exportación 'Por División' completada.")

  # B) Por Grupo
  if opcion_exportacion in ["2", "3", "4"]:
    folder_grp = os.path.join(carpeta_salida, "Por_Grupo")
    os.makedirs(folder_grp, exist_ok=True)
    for (division, grupo), group_df in df_total.groupby(["DIVISION", "GRUPO"]):
      nombre_div = (
          str(division).strip().replace(" ", "_").upper() or "SIN_DIVISION"
      )
      nombre_grp = str(grupo).strip().replace(" ", "_").upper() or "SIN_GRUPO"
      subfolder = os.path.join(folder_grp, nombre_div)
      os.makedirs(subfolder, exist_ok=True)
      file_path = os.path.join(
          subfolder, f"Clientes_{nombre_div}_{nombre_grp}.csv"
      )
      group_df.to_csv(file_path, index=False, encoding="utf-8-sig")
    print("  ✓ Exportación 'Por Grupo' completada.")

  # C) Por Ruta (Itinerarios)
  if opcion_exportacion == "4":
    folder_rutas = os.path.join(carpeta_salida, "Por_Ruta")
    os.makedirs(folder_rutas, exist_ok=True)
    for (division, ruta), group_df in df_total.groupby(
        ["DIVISION", col_ruta_cliente]
    ):
      nombre_div = (
          str(division).strip().replace(" ", "_").upper() or "SIN_DIVISION"
      )
      nombre_ruta = str(ruta).strip().replace(" ", "_").upper() or "SIN_RUTA"
      subfolder = os.path.join(folder_rutas, nombre_div)
      os.makedirs(subfolder, exist_ok=True)
      file_path = os.path.join(subfolder, f"Itinerario_Ruta_{nombre_ruta}.csv")
      group_df.to_csv(file_path, index=False, encoding="utf-8-sig")
    print("  ✓ Exportación 'Por Ruta' completada.")

  print(f"\n✅ Proceso completado con éxito. Archivos en '{carpeta_salida}/'")


if __name__ == "__main__":
  import sys

  opcion = sys.argv[1] if len(sys.argv) > 1 else "3"
  procesar_y_exportar_clientes(opcion)
