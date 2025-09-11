cd Backend
python -m venv venv # make a virtual environment
.\venv\Scripts\activate # (Windows)
pip install -r requirements.txt
uvicorn api.api_server:app --reload
