# 🚀 TechNova AI Platform — Production Deployment Guide

This guide describes how to deploy the platform on a production server (AWS EC2, DigitalOcean Droplet, VPS, etc.) using Docker Compose.

---

## 📋 Prerequisites on the Server

Ensure the server has the following installed:
1. **Docker**: [Install Docker](https://docs.docker.com/engine/install/)
2. **Docker Compose**: [Install Compose](https://docs.docker.com/compose/install/)
3. **Git**: To clone the repository.

---

## 🛠️ Deployment Steps

### 1. Clone the Repository
SSH into your server and clone the project:
```bash
git clone https://github.com/athinarayanan08/Technova-AI_Intelligence.git
cd Technova-AI_Intelligence
```

### 2. Configure Environment Variables
Create a production `.env` file in the root directory:
```bash
nano .env
```
Copy and fill in the values below. **Make sure to change the placeholder secrets for production security:**

```env
# Database Credentials
DB_USER=aiorg_admin
DB_PASSWORD=a_very_strong_password_here
DB_NAME=ai_org_db_prod

# Redis Credential
REDIS_PASSWORD=redis_secure_password_here

# MinIO Storage Credentials
MINIO_ACCESS_KEY=minio_admin_user
MINIO_SECRET_KEY=minio_secure_secret_here
MINIO_BUCKET_NAME=ai-org-production-bucket

# JWT Security
JWT_SECRET_KEY=generate_a_random_hex_string_using_openssl
# Run: openssl rand -hex 32 to generate a key

# LLM Integrations
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Domain configurations
ALLOWED_ORIGINS=http://yourdomain.com,https://yourdomain.com
```

### 3. Spin up the Production Containers
Build and start the services in detached (background) mode:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### 4. Verify Services
Check the container status to ensure everything is running:
```bash
docker-compose -f docker-compose.prod.yml ps
```
To view logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

The application is now accessible at:
- **Frontend App**: `http://your-server-ip`
- **Backend API**: `http://your-server-ip/api`
- **Swagger Docs**: `http://your-server-ip/docs`
- **MinIO Console**: `http://your-server-ip:9001` (Sign in using `MINIO_ACCESS_KEY` & `MINIO_SECRET_KEY`)

---

## 🔒 Post-Deployment Security Recommendations

### 1. Enable SSL/TLS (HTTPS)
For production, it is highly recommended to run the app behind a reverse proxy like **Nginx** or **Traefik** on the host server to handle SSL certificates via **Let's Encrypt**:

A simple host Nginx configuration for port 443 with SSL:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost; # Proxies to frontend container on port 80
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Settings
Ensure only ports `80` (HTTP), `443` (HTTPS), and `22` (SSH) are open to the public. You can close or restrict access to port `9001` (MinIO console) to specific IP addresses.
On Ubuntu, use `ufw`:
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
