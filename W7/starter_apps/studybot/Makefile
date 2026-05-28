.PHONY: install run test frontend-dev frontend-build clean

install:
	python -m venv .venv
	.venv/Scripts/python.exe -m pip install --upgrade pip
	.venv/Scripts/python.exe -m pip install -r requirements.txt
	cd frontend; npm install
	@echo ""
	@echo "Done. Next steps in PowerShell:"
	@echo "1. .venv/Scripts/activate"
	@echo "2. Copy-Item .env.example .env"
	@echo "3. make frontend-build"
	@echo "4. make run"

run:
	.venv/Scripts/python.exe -m uvicorn src.app:app --reload --host 0.0.0.0 --port 8000

test:
	.venv/Scripts/python.exe -m pytest -v tests/

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

clean:
	powershell -Command "Remove-Item -Recurse -Force _data, __pycache__, .pytest_cache, src\__pycache__, src\adapters\__pycache__, tests\__pycache__, frontend\dist, frontend\.vite -ErrorAction SilentlyContinue"
