import sys
import os
from twocaptcha import TwoCaptcha
from dotenv import load_dotenv

load_dotenv()

captcha_api_key = os.getenv('RECAPTCHA_TOKEN')

solver = TwoCaptcha(captcha_api_key)

try:
    result = solver.normal(sys.argv[1])
    print(result)
except Exception as e:
    print(f'error: {str(e)}')
