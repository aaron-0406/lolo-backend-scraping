import sys
import os
from twocaptcha import TwoCaptcha
from dotenv import load_dotenv

load_dotenv()

captcha_api_key = os.getenv('RECAPTCHA_TOKEN')

# Configura la clave API de 2Captcha
solver = TwoCaptcha(captcha_api_key)

try:
    # Intenta resolver el captcha
    result = solver.normal(sys.argv[1])
    # Devuelve el resultado como salida estándar
    print(result)
except Exception as e:
    # Devuelve el error como salida estándar
    print(f'error: {str(e)}')
