cd Backend
python -m venv venv # make a virtual environment
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\venv\Scripts\activate # (Windows)
pip install -r api/requirements.txt
uvicorn api.api_server:app --reload
uvicorn api.api_server:app --reload --host 0.0.0.0 --port 8000 #if running on expo go
