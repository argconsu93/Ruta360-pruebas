import os
import glob
import re
import datetime
import pandas as pd

MAPA_PREFIX_DIVISION = {
    "1": "SV CENTRO",
    "2": "SV ORIENTE",
    "3": "SV OCCIDENTE",
    "4": "GT CENTRO",
    "5": "GT SUR",
    "6": "GT NORTE",
    "7": "HN CENTRO",
    "8": "HN NORTE"
}

# Homologación de nombres de división comunes
MAPEO_NOMBRES_DIVISION = {
    "HN_CENTRO": "HN CENTRO", "HONDURAS CENTRO": "HN CENTRO", "HN-CENTRO": "HN CENTRO",
    "HN_NORTE": "HN NORTE", "HONDURAS NORTE": "HN NORTE", "HN-NORTE": "HN NORTE",
    "GT_CENTRO": "GT CENTRO", "GUATEMALA CENTRO": "GT CENTRO",
    "GT_NORTE": "GT NORTE", "GUATEMALA NORTE": "GT NORTE",
    "GT_SUR": "GT SUR", "GUATEMALA SUR": "GT SUR",
    "SV_CENTRO": "SV CENTRO", "EL SALVADOR CENTRO": "SV CENTRO",
    "SV_ORIENTE": "SV ORIENTE", "EL SALVADOR ORIENTE": "SV ORIENTE",
    "SV_OCCIDENTE": "SV OCCIDENTE", "EL SALVADOR OCCIDENTE": "SV OCCIDENTE"
}

def normalizar_texto(val):
    if pd.isna(val): return ""
    txt = str(val).strip().upper()
    replacements = (("Á", "A"), ("É", "E"), ("Í", "I"), ("Ó", "O"), ("Ú", "U"))
    for a, b in replacements:
        txt = txt.replace(a, b)
    return txt

def es_verdadero(val):
    if pd.isna(val): 
        return False
    
    if isinstance(val, (int, float)):
        return val == 1 or val == 1.0

    txt = normalizar_texto(val)
    if txt in ["1.0", "1"]:
        return True
    if txt in ["0.0", "0"]:
        return False

    return txt in ["VERDADERO", "TRUE", "SI", "S"]

def corregir_coordenada(val):
    try:
        # Reemplazar comas por puntos por si vienen en formato decimal europeo/latino
        txt_val = str(val).replace(",", ".").strip()
        num = float(txt_val)
        if num == 0: return 0.0
        num_abs = abs(num)
        if 1.0 <= num_abs < 10.0:
            num = num * 10.0
        return round(num, 7)
    except:
        return 0.0

def calcular_frecuencia_texto(val):
    txt = normalizar_texto(val).replace(",", " ")
    txt = re.sub(r'\s+', ' ', txt)
    if txt in ["1", "2", "3", "4"]:
        return "MENSUAL"
    elif txt in ["1 3", "1 3 5", "2 4"]:
        return "QUINCENAL"
    else:
        return "SEMANAL"

def obtener_info_semana():
    numero_semana = datetime.datetime.now().isocalendar().week
    es_par = (numero_semana % 2 == 0)
    return es_par, numero_semana

def aplicar_filtro_frecuencia(frecuencia_raw, es_par):
    freq = str(frecuencia_raw or "").strip()
    
    # CORRECCIÓN 1: Si no tiene frecuencia asignada, NO descartar al cliente, asumir SEMANAL (True)
    if not freq or freq.upper() in ["NAN", "NONE", "", "SIN FRECUENCIA"]:
        return True

    if freq.isdigit():
        numero = int(freq)
        return (numero in [2, 4]) if es_par else (numero in [1, 3, 5])

    numeros = []
    for parte in re.split(r'[,\s]+', freq):
        if parte.isdigit():
            numeros.append(int(parte))

    # Si la frecuencia no traía números reconocibles, incluirlo por defecto
    if not numeros:
        return True

    if set([1, 2, 3, 4, 5]).issubset(set(numeros)):
        return True

    if es_par:
        return any(n in [2, 4] for n in numeros)
    else:
        return any(n in [1, 3, 5] for n in numeros)

def cargar_mapeo_rutas():
    dict_rutas = {}
    posibles_rutas = [
        "data/rutas_distribuidoras.csv",
        "data/Listado de rutas y distribuidoras.csv",
        "rutas_distribuidoras.csv",
        "Listado de rutas y distribuidoras.csv"
    ]
    
    archivo_maestro = None
    for r in posibles_rutas:
        if os.path.exists(r):
            archivo_maestro = r
            break

    if archivo_maestro:
        try:
            df_m = pd.read_csv(archivo_maestro, sep=None, engine='python')
            cols_map = {normalizar_texto(c): c for c in df_m.columns}
            
            col_ruta = next((cols_map[c] for c in cols_map if 'RUTA' in c), None)
            col_dist = next((cols_map[c] for c in cols_map if 'BOCADELI' in c or 'DIST' in c), None)
            col_grupo = next((cols_map[c] for c in cols_map if 'GRUPO' in c), None)
            col_div = next((cols_map[c] for c in cols_map if 'DIVISION' in c or 'DIVIS' in c), None)
            col_pais = next((cols_map[c] for c in cols_map if 'PAIS' in c), None)
            col_canal = next((cols_map[c] for c in cols_map if 'CANAL' in c), None)
            
            for _, row in df_m.iterrows():
                if col_ruta and pd.notna(row[col_ruta]):
                    r_key = str(row[col_ruta]).strip().upper()
                    
                    dist_val = str(row[col_dist]).strip() if col_dist and pd.notna(row[col_dist]) else "Bocadeli Desconocida"
                    grupo_val = str(row[col_grupo]).strip() if col_grupo and pd.notna(row[col_grupo]) else "SIN_GRUPO"
                    div_val = str(row[col_div]).strip() if col_div and pd.notna(row[col_div]) else ""
                    pais_val = str(row[col_pais]).strip() if col_pais and pd.notna(row[col_pais]) else "SIN_PAIS"
                    canal_val = str(row[col_canal]).strip() if col_canal and pd.notna(row[col_canal]) else "SIN_CANAL"
                    
                    # Normalizar división del maestro
                    div_val = MAPEO_NOMBRES_DIVISION.get(normalizar_texto(div_val), div_val)

                    dict_rutas[r_key] = {
                        "DISTRIBUIDORA": dist_val,
                        "GRUPO": grupo_val,
                        "DIVISION": div_val,
                        "PAIS": pais_val,
                        "CANAL": canal_val
                    }
            print(f"📖 Mapeo maestro cargado desde '{archivo_maestro}' ({len(dict_rutas)} rutas).")
        except Exception as e:
            print(f"⚠️ Advertencia al cargar maestro: {e}")
    else:
        print("⚠️ No se encontró el archivo maestro de rutas.")

    return dict_rutas

def obtener_info_ruta(ruta, mapeo_rutas):
    ruta_upper = str(ruta).strip().upper()
    info = mapeo_rutas.get(ruta_upper, {})
    
    distribuidora = info.get("DISTRIBUIDORA", "Bocadeli Desconocida")
    grupo = info.get("GRUPO", "SIN_GRUPO")
    division = info.get("DIVISION", "")
    pais = info.get("PAIS", "SIN_PAIS")
    canal = info.get("CANAL", "SIN_CANAL")
    
    # CORRECCIÓN 2: Mapeo de división por prefijos si no está en el maestro
    if not division or division.upper() in ["SIN_DIVISION", ""]:
        primer_digito = ruta_upper[0] if len(ruta_upper) > 0 else ""
        division = MAPA_PREFIX_DIVISION.get(primer_digito, "SIN_DIVISION")
    
    # Normalización final de división
    division = MAPEO_NOMBRES_DIVISION.get(normalizar_texto(division), division)
    
    # Inferir País si venía vacía
    if pais == "SIN_PAIS":
        if division.startswith("SV"): pais = "EL SALVADOR"
        elif division.startswith("GT"): pais = "GUATEMALA"
        elif division.startswith("HN"): pais = "HONDURAS"

    return {
        "DIVISION": division,
        "GRUPO": grupo,
        "DISTRIBUIDORA": distribuidora,
        "PAIS": pais,
        "CANAL": canal
    }

def procesar_archivos():
    archivos_matriz = glob.glob("data/*.xlsx") + glob.glob("data/*.xls") + glob.glob("data/*.csv") + glob.glob("*.xlsx") + glob.glob("*.csv")
    
    archivos_matriz = [a for a in archivos_matriz if not a.endswith('clientes.csv') and not a.endswith('rutas_distribuidoras.csv')]

    if not archivos_matriz:
        print("❌ No se encontraron archivos de matriz (.xlsx / .csv) para procesar.")
        return

    es_par, num_semana = obtener_info_semana()
    tipo_semana = "PAR" if es_par else "IMPAR"
    print(f"📅 Procesando para Semana {num_semana} ({tipo_semana})")

    mapeo_rutas = cargar_mapeo_rutas()
    registros_consolidados = []

    for archivo in archivos_matriz:
        print(f"📄 Procesando matriz: {archivo}")
        try:
            if archivo.endswith('.csv'):
                df = pd.read_csv(archivo, sep=None, engine='python')
                hojas = [("CSV", df)]
            else:
                xls = pd.ExcelFile(archivo)
                hojas = [(sheet, pd.read_excel(xls, sheet_name=sheet)) for sheet in xls.sheet_names]

            for sheet_name, df in hojas:
                cols_orig = {normalizar_texto(c): c for c in df.columns}
                
                # CORRECCIÓN 3: Búsqueda flexible de columnas indispensables
                find_col = lambda keywords: next((cols_orig[c] for c in cols_orig if any(k in c for k in keywords)), None)

                col_ruta = find_col(['RUTA'])
                col_id = find_col(['IDROUTEMAP', 'CODIGO', 'ID_CLIENTE', 'CLIENTE', 'ID'])
                col_nombre = find_col(['NOMBRE', 'NOM_CLIENTE', 'RAZON_SOCIAL'])
                
                # Validar que existan las columnas mínimas obligatorias
                if not col_ruta or not col_id or not col_nombre:
                    continue

                col_dir = find_col(['DIRECCION', 'DIR'])
                col_tel = find_col(['TELEFONO', 'TEL'])
                col_contacto = find_col(['CONTACTO'])
                col_estado = find_col(['ESTADO', 'ACTIVO'])
                col_lat = find_col(['LATITUD', 'LAT'])
                col_lon = find_col(['LONGITUD', 'LON', 'LNG'])
                col_frec = find_col(['FRECUENCIA', 'FREQ'])
                
                col_lu = cols_orig.get('LU')
                col_ma = cols_orig.get('MA')
                col_mi = cols_orig.get('MI')
                col_ju = cols_orig.get('JU')
                col_vi = cols_orig.get('VI')
                col_sa = cols_orig.get('SA')
                col_do = cols_orig.get('DO')

                for _, row in df.iterrows():
                    # Estado activo
                    if col_estado and not es_verdadero(row[col_estado]):
                        continue
                    
                    nombre_neg = normalizar_texto(row[col_nombre])
                    if any(p in nombre_neg for p in ["BOCADELI", "PRUEBA", "TEMPORAL"]):
                        continue

                    frec_raw = str(row[col_frec]) if col_frec and pd.notna(row[col_frec]) else ""
                    if not aplicar_filtro_frecuencia(frec_raw, es_par):
                        continue

                    # Días de visita
                    dias_map = [
                        ("Lunes", col_lu), ("Martes", col_ma), ("Miercoles", col_mi),
                        ("Jueves", col_ju), ("Viernes", col_vi), ("Sabado", col_sa), ("Domingo", col_do)
                    ]
                    dias_visita = []
                    for nombre_dia, col_dia in dias_map:
                        if col_dia and es_verdadero(row[col_dia]):
                            dias_visita.append(nombre_dia)

                    dias_str = ", ".join(dias_visita) if dias_visita else "Sin día asignado"

                    ruta_val = str(row[col_ruta]).strip()
                    info_ruta = obtener_info_ruta(ruta_val, mapeo_rutas)

                    lat_corregida = corregir_coordenada(row[col_lat]) if col_lat else 0.0
                    lon_corregida = corregir_coordenada(row[col_lon]) if col_lon else 0.0
                    frec_texto = calcular_frecuencia_texto(frec_raw)

                    registros_consolidados.append({
                        "RUTA": ruta_val,
                        "CODIGO": row[col_id],
                        "NOMBRE": row[col_nombre],
                        "DIRECCION": row[col_dir] if col_dir else "",
                        "CONTACTO": row[col_contacto] if col_contacto else "",
                        "TELEFONO": row[col_tel] if col_tel else "",
                        "ESTADO": "ACTIVO",
                        "FRECUENCIA": frec_texto,
                        "LATITUD": lat_corregida,
                        "LONGITUD": lon_corregida,
                        "DIA_DE_VISITA": dias_str,
                        "DIVISION": info_ruta["DIVISION"],
                        "GRUPO": info_ruta["GRUPO"],
                        "DISTRIBUIDORA": info_ruta["DISTRIBUIDORA"],
                        "PAIS": info_ruta["PAIS"],
                        "CANAL": info_ruta["CANAL"]
                    })

        except Exception as e:
            print(f"❌ Error procesando {archivo}: {e}")

    if registros_consolidados:
        df_final = pd.DataFrame(registros_consolidados)
        df_final.drop_duplicates(subset=["CODIGO", "RUTA"], inplace=True)
        
        # Resumen impreso para validar conteo por división en GitHub Actions
        print("\n--- RESUMEN FINAL DE CLIENTES POR DIVISIÓN ---")
        print(df_final['DIVISION'].value_counts(dropna=False))
        print("---------------------------------------------\n")

        df_final.to_csv("clientes.csv", index=False, encoding='utf-8-sig')
        print(f"✅ ¡Éxito! Se consolidaron {len(df_final)} clientes en 'clientes.csv' para la Semana {num_semana} ({tipo_semana}).")
    else:
        print("⚠️ No se generó ningún registro válido.")

if __name__ == "__main__":
    procesar_archivos()
