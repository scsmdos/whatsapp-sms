# Deploying Bulk WhatsApp Software
This guide covers how to deploy the entire system:
1.  **Shared Hosting (Hostinger)**: For React Frontend & Laravel Backend.
2.  **Render (Free Tier)**: For Node.js WhatsApp Service (consumes high CPU/RAM for browser automation).

---

## Part 1: Prepare Services (Render)
We deploy the WhatsApp Service first to get its URL.

1.  **Push Code to GitHub**:
    *   Initialize a git repository in `whatsapp-service` folder or the root.
    *   Push to GitHub.
2.  **Create Service on Render**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
    *   **Runtime**: Select **Docker** (It will auto-detect the `Dockerfile` we created).
    *   **Root Directory**: Set this to **`whatsapp-service`**. This is critical because your repo has other folders.
    *   **Plan**: Free (or Starter if you need 24/7 uptime without sleep).
    *   Click **Create Web Service**.
3.  **Get URL**:
    *   Once deployed, copy the service URL (e.g., `https://whatsapp-service-xyz.onrender.com`).
    *   **Keep this URL safe.** You will need it.

---

## Part 2: Prepare Frontend (React)
User authentication and API calls depend on knowing your live domain.

1.  **Edit Frontend Environment**:
    *   Go to `frontend` folder.
    *   Create a file named `.env.production`.
    *   Add the following (Replace with your actual URLs):
    ```ini
    # URL of your Laravel Backend on Hostinger
    VITE_API_URL=https://your-domain.com/api
    
    # URL of your Render Service (from Part 1)
    VITE_WHATSAPP_SERVICE_URL=https://whatsapp-service-xyz.onrender.com
    ```
2.  **Build the Frontend**:
    *   Open terminal in `frontend` folder.
    *   Run: `npm run build`
    *   This creates a `dist` folder. **These files are what you upload to Hostinger.**

---

## Part 3: Deploy to Hostinger

### A. Database Setup
1.  Log in to Hostinger hPanel.
2.  Go to **Databases** -> **Management**.
3.  Create a New MySQL Database (e.g., `u123456789_whatsapp`).
4.  Create a User and Password. **Note these down.**

### B. Upload Backend (Laravel)
1.  Go to **File Manager** in hPanel.
2.  Navigate to `public_html`.
3.  Create a folder named `api` (or upload to root if you prefer, but `api` is cleaner if running React on same domain).
    *   *Recommended structure*:
        *   `public_html/` -> Contains React `dist` files.
        *   `public_html/api/` -> Contains Laravel `public` folder contents.
        *   `laravel_core/` (Outside public_html) -> Contains rest of Laravel.
4.  **Simplified Upload (Easy Method)**:
    *   Upload the entire `backend` folder contents to a folder named `backend` in your home directory (same level as `public_html`, not inside).
    *   Move the contents of `backend/public` to `public_html/api` (create the `api` folder).
    *   Edit `public_html/api/index.php`:
        *   Change `require __DIR__.'/../vendor/autoload.php';` to `require __DIR__.'/../../backend/vendor/autoload.php';`
        *   Change `api` requirement appropriately.
    *   **OR (Standard Method)**:
        *   If you are less experienced, just upload EVERYTHING from `backend` to `public_html/api_backend`.
        *   Then your API URL will be `https://your-domain.com/api_backend/public`.
        *   Update `VITE_API_URL` in frontend accordingly.

### C. Configure Backend
1.  In `backend` folder (on server), rename `.env.example` to `.env`.
2.  Edit `.env` with File Manager:
    *   `APP_URL=https://your-domain.com`
    *   `DB_DATABASE=u123456789_whatsapp`
    *   `DB_USERNAME=u123456789_user`
    *   `DB_PASSWORD=your_password`
    *   `NODE_SERVICE_URL=https://whatsapp-service-xyz.onrender.com` (from Part 1)
3.  **Run Migrations**:
    *   Since you can't easily run terminal on shared hosting, the easiest way is:
    *   Export your **Local Database** to SQL file (using HeidiSQL, phpMyAdmin, or `mysqldump`).
    *   Import that SQL file into Hostinger's phpMyAdmin.

### D. Upload Frontend
1.  Go to `public_html`.
2.  Upload the **Contents** of the `frontend/dist` folder (index.html, assets, etc.).
3.  **Important**: Create a `.htaccess` file in `public_html` to handle React Routing:
    ```apache
    <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteCond %{REQUEST_FILENAME} !-l
      RewriteRule . /index.html [L]
    </IfModule>
    ```

---

## Summary of URLs
*   **Website**: `https://your-domain.com` (Serves React)
*   **API**: `https://your-domain.com/api` (Serves Laravel)
*   **WhatsApp Engine**: `https://whatsapp-service-xyz.onrender.com` (Runs Puppeteer)

## Troubleshooting
*   **404 on Refresh**: Ensure `.htaccess` is present in `public_html`.
*   **API Connection Failed**: Check `VITE_API_URL` in frontend build. Use Developer Tools (F12) -> Network to see where requests go.
*   **WhatsApp QR Not Loading**: Check if `VITE_WHATSAPP_SERVICE_URL` is correct and Render service is "Live".
