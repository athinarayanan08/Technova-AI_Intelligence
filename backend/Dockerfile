FROM python:3.11-slim

# Set system-level configurations
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

# Install build dependencies for libraries (such as database adapters or cryptography packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend source files
COPY . /app/

# Expose dynamic port for FastAPI
EXPOSE 8000

# Start FastAPI server binding to dynamic Render PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
