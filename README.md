**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

---

## Deploying to Azure App Service

### 1. Create an Azure Web App

- Runtime: **Node 20 LTS**, OS: **Linux**
- In **Configuration → Application settings**, add:
  - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
- Set the **Startup Command** to:
  ```
  pm2 serve /home/site/wwwroot --no-daemon --spa
  ```

### 2. Add GitHub repository secrets

Go to **Settings → Secrets and variables → Actions** in this GitHub repo and add:

| Secret name | Value |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Download from Azure Portal → your Web App → **Get Publish Profile** |
| `VITE_BASE44_APP_ID` | Your Base44 app ID |
| `VITE_BASE44_APP_BASE_URL` | Your Base44 backend URL (e.g. `https://yourapp.base44.app`) |

### 3. Update the workflow file

Open `.github/workflows/azure-deploy.yml` and replace `your-azure-webapp-name` with your actual Azure Web App name.

### 4. Deploy

Push to `main` (or trigger **Run workflow** manually from the **Actions** tab). The workflow will build the Vite app and deploy the `dist/` folder to Azure.
