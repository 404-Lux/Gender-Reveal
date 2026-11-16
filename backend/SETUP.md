# Google Sheets + Google Apps Script Deployment Guide

This guide walks through setting up the Google Sheets database and connecting the Google Apps Script Web App (`backend/Code.gs`) to your Next.js deployment on Vercel without exposing any credentials or the baby's gender before reveal time.

---

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.new) and create a new spreadsheet named **`Paper & Light — Gender Reveal DB`**.
2. In the top menu, click **File → Settings** and set **Time zone** to **`(GMT+08:00) Philippine Standard Time - Manila`**.
3. You do not need to create the tabs manually — `Code.gs` automatically initializes the 5 required tabs (`settings`, `guesses`, `wishes`, `names`, `advice`) and their headers on first run.

---

## Step 2: Add the Google Apps Script (`Code.gs`)

1. Inside your Google Sheet, click **Extensions → Apps Script**.
2. Delete any starter code in `Code.gs` and paste the entire contents of [`backend/Code.gs`](./Code.gs).
3. Click the **Project Settings** gear icon on the left sidebar:
   - Check **"Show 'appsscript.json' manifest file in editor"** and verify `"timeZone": "Asia/Manila"`.
   - Scroll down to **Script Properties** and click **Add script property**:
     - `APPS_SCRIPT_SECRET`: Set a strong random secret string (e.g., `pl_9f8e7d6c5b4a3f2e1d_2026`).
     - `PARENTS_SLUG`: Set a long random URL-safe slug of **at least 24 characters** for the parents' dashboard (e.g., `basio-p9K4mX7vQ2nR8wL5zT3cH6jB`).
4. Click **Save script properties**.

### Rotating `PARENTS_SLUG` (If Ever Needed)
1. Generate a new 24+ character URL-safe random string.
2. Update `PARENTS_SLUG` in **Apps Script → Project Settings → Script Properties**.
3. Update `PARENTS_SLUG` in **Vercel → Settings → Environment Variables** and **Redeploy**.
4. Immediately share the new `/parents/<new-slug>` link with the parents—the old URL returns `404` right away.

---

## Step 3: Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment** (top right).
2. Click the gear icon next to **Select type** and choose **Web app**.
3. Configure the deployment:
   - **Description**: `Paper & Light Production v1`
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (Next.js server routes authenticate via `APPS_SCRIPT_SECRET`)
4. Click **Deploy**, authorize the script permissions when prompted, and copy the **Web app URL** (`https://script.google.com/macros/s/.../exec`).

---

## Step 4: Connect to Vercel

1. In your Vercel project dashboard, go to **Settings → Environment Variables** and add:
   - `APPS_SCRIPT_URL` = `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`
   - `APPS_SCRIPT_SECRET` = *(same value set in Script Properties)*
   - `PARENTS_SLUG` = *(same 24+ char slug set in Script Properties)*
   - `NEXT_PUBLIC_MOCK` = `false`
   - `NEXT_PUBLIC_BABY_SURNAME` = `Basio`
   - `NEXT_PUBLIC_COUPLE_NAMES` = `Jazzmine & Ruhmshynne Basio`
2. **Protect Staging/Preview Deployments**: In Vercel → **Settings → Deployment Protection**, set **Vercel Authentication** to **Only Preview Deployments** (or **Standard Protection**) so your staging preview links are not publicly guessable, and delete any old preview deployments that had `NEXT_PUBLIC_MOCK=true`.
3. Redeploy your Vercel project.
4. Share `/parents/[PARENTS_SLUG]` privately with the couple (or their doctor/trusted keeper of the envelope) to set the PHT reveal time and lock in the gender.

---

## Updating Apps Script Without Breaking the Live URL

Whenever you edit `Code.gs`, **do NOT create a New Deployment** (which generates a brand new URL and breaks Vercel until you update env vars):

1. Open Apps Script -> **Deploy** -> **Manage deployments**.
2. Click the **pencil (Edit)** icon on the active Web App deployment.
3. Under **Version**, choose **New version**.
4. Click **Deploy**. The existing `APPS_SCRIPT_URL` stays identical.

---

## Automatic Hourly Google Sheet Backups

1. In the Apps Script editor, open **Triggers** (clock icon on the left sidebar).
2. Click **+ Add Trigger**:
   - **Choose which function to run**: `backupSnapshot`
   - **Select event source**: **Time-driven**
   - **Select type of time based trigger**: **Hour timer** -> **Every hour**
3. Save and authorize Drive access. Hourly snapshots are saved in Google Drive under `Paper & Light Backups` (latest 24 kept automatically).

---

## Vercel Preview / Staging Deployment Protection

To ensure staging/preview URLs are never publicly guessable or indexed:

1. In **Vercel Dashboard -> Project Settings -> Deployment Protection**, enable **Vercel Authentication** (Standard Protection) for **Preview Deployments** while keeping **Production** public for guests.
2. Delete any stale Preview deployments that were created before `NEXT_PUBLIC_MOCK=false` was enforced.
