import sys
import os
from twocaptcha import TwoCaptcha

# Configura la clave API de 2Captcha
api_key = os.getenv('APIKEY_2CAPTCHA', '381cad2fec56070d12efeefa8d3bcfe2')
solver = TwoCaptcha(api_key)

try:
    # Intenta resolver el captcha
    result = solver.normal(sys.argv[1])
    # Devuelve el resultado como salida estándar
    print(result)
except Exception as e:
    # Devuelve el error como salida estándar
    print(f'error: {str(e)}')
