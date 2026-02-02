FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY src/ ./src/

# Make main.py executable
RUN chmod +x src/main.py

# Default command: run audit once
CMD ["python", "src/main.py", "--once"]
