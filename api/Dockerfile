FROM python:3.12-slim-bookworm

WORKDIR /app

COPY . .

RUN apt update

RUN pip install --upgrade pip

RUN pip install poetry

RUN poetry install

CMD ["poetry", "run", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "9000"]