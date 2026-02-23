# CashMint — Repo Split Migration Guide

CashMint has been removed from the MintCore repository and should live in its own standalone Git repository.

Run the following commands **from inside a local clone of MintCore** to bootstrap the new CashMint repo.

## Step 1 — Move `CashMint/` out of MintCore

```bash
# From the root of your local MintCore clone:
mv CashMint ../CashMint
```

## Step 2 — Initialise the new Git repository

```bash
cd ../CashMint
git init
git add .
git commit -m "Initial CashMint import"
```

## Step 3 — Connect to a new remote GitHub repository

Create a new empty repository named **CashMint** on GitHub, then:

```bash
git remote add origin https://github.com/<your-org-or-username>/CashMint.git
git branch -M main
git push -u origin main
```

Replace `<your-org-or-username>` with the appropriate GitHub organisation or username (e.g. `mintcoredev`).
