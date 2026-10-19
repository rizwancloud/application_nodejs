# Node.js Task Application

A Node.js application with a MySQL-compatible database. This guide explains how a beginner can deploy it on an Amazon Linux EC2 instance using a separate database such as Amazon RDS for MySQL.

## Prerequisites

- Amazon Linux EC2 instance with SSH or AWS Systems Manager access.
- MySQL-compatible database and its endpoint, database name, username, and password.
- Network rules allowing the EC2 instance to reach the database on TCP port `3306`.
- Nginx installed and configured only if you plan to use it as a reverse proxy.

> **Security:** Never commit real passwords, cloud credentials, or a populated `.env` file to GitHub. Keep secrets private.

## 1. Install Required Packages

Connect to your EC2 instance and run:

```bash
sudo dnf install -y git nodejs mariadb105
node --version
npm --version
git --version
mysql --version
```

If `mariadb105` is unavailable on your Amazon Linux image, install a compatible MySQL/MariaDB client package supported by that image.

## 2. Clone the Repository

```bash
cd /opt
sudo git clone https://github.com/rizwancloud/application_nodejs.git
sudo chown -R ec2-user:ec2-user /opt/application_nodejs
cd /opt/application_nodejs
```

If the directory already exists, inspect it before updating it; do not clone over an existing directory.

## 3. Create the Database and Table

Connect to your MySQL-compatible database. Replace the placeholders with your actual values; enter the password when prompted.

```bash
mysql -h '<DB_ENDPOINT>' -u '<DB_USERNAME>' -p
```

Run this SQL, changing `appdb` if your application uses a different database name:

```sql
CREATE DATABASE IF NOT EXISTS appdb;
USE appdb;

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Then exit the MySQL client:

```sql
EXIT;
```

Make sure the database schema matches what the application code expects.

## 4. Configure the Application

Edit the existing `.env` file:

```bash
cd /opt/application_nodejs
nano .env
```

Set the database host/endpoint, username, password, database name, and application port using the variable names expected by the repository. Save the file and restrict access:

```bash
chmod 600 .env
```

Do not commit real credentials to GitHub.

Install dependencies:

```bash
npm install
```

## 5. Configure the systemd Service

Review the service file before installing it:

```bash
cat app.service
```

Confirm that the working directory is `/opt/application_nodejs`, the start command matches `package.json`, and the service runs as the intended Linux user. Make sure it loads the required environment configuration.

Install the service:

```bash
sudo cp app.service /etc/systemd/system/app.service
sudo chmod 644 /etc/systemd/system/app.service
```

If `app.service` writes logs to `/var/log/app/app.log`, create the log file and set ownership to the user running the service. For an `ec2-user` service:

```bash
sudo mkdir -p /var/log/app
sudo touch /var/log/app/app.log
sudo chown -R ec2-user:ec2-user /var/log/app
sudo chmod 755 /var/log/app
sudo chmod 644 /var/log/app/app.log
```

If the service uses another user or logs only to systemd/journald, adjust these steps accordingly.

## 6. Start and Verify the Application

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now app
sudo systemctl status app --no-pager
```

View logs:

```bash
sudo journalctl -u app -n 100 --no-pager
```

Follow logs live:

```bash
sudo journalctl -u app -f
```

If the application is expected to listen on port `4000`, check the port:

```bash
sudo ss -lntp | grep ':4000'
```

If the app implements a `/health` endpoint, test it locally:

```bash
curl -i http://localhost:4000/health
```

The `/health` route must exist in the application for this check to succeed.

## 7. Optional: Nginx Reverse Proxy

Nginx must already be installed and configured to forward requests to the application. Validate its configuration before reloading it:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

| Problem | What to check |
|---|---|
| Dependencies fail to install | Check Node.js/NPM versions and the full error output. |
| Service fails to start | Run `sudo systemctl status app` and `sudo journalctl -u app -n 100 --no-pager`. |
| Database connection fails | Check endpoint, credentials, database name, database status, and security rules for TCP `3306`. |
| Port `4000` is not listening | Check service logs, the configured application port, and the startup command. |
| Load balancer target is unhealthy | Check target port, health-check path, application status, and security-group rules. |
| Nginx returns an error | Run `sudo nginx -t` and verify the upstream address and port. |
| Clone destination already exists | Inspect `/opt/application_nodejs` before updating; do not delete it blindly. |

## Security and Cleanup

- Keep the database private and allow access only from trusted application hosts.
- Use an IAM role for AWS permissions where appropriate.
- Never store passwords or cloud access keys in source control.
- When finished practising, stop the service with `sudo systemctl disable --now app` and remove any cloud resources you created if they are no longer needed.

## Repository

Source code: https://github.com/rizwancloud/application_nodejs
