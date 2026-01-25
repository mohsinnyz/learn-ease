
# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Download necessary NLTK and SpaCy data
RUN python -m spacy download en_core_web_sm
RUN python -m nltk.downloader wordnet

# Copy the current directory contents into the container at /app
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
