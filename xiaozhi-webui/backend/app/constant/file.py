import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
