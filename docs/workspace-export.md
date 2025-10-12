# Moving Workspace Changes to GitHub or Your Local Machine

This guide summarizes two common ways to move the code that lives in this Codespace-style workspace to another environment: pushing to GitHub and downloading to your computer.

## 1. Push directly to GitHub

1. Create an empty repository in your GitHub account (or decide which existing repo you want to use). Copy its **HTTPS** URL — it will look like `https://github.com/<user>/<repo>.git`.
   *If you are following along with this workspace, the remote has already been pointed at [`https://github.com/stevewinfieldtx/solar-panels`](https://github.com/stevewinfieldtx/solar-panels); you can push there directly or swap in your own URL as needed.*
2. Inside the workspace terminal, run:
   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   ```
   Replace the URL with your own. If a remote named `origin` already exists, replace the `add` command with:
   ```bash
   git remote set-url origin https://github.com/<user>/<repo>.git
   ```
3. Stage and commit your work if you have not already:
   ```bash
   git add .
   git commit -m "Describe your changes"
   ```
4. Push the branch up to GitHub:
   ```bash
   git push -u origin work
   ```
   Replace `work` with whatever branch name you are using. Git will prompt for your GitHub credentials or personal access token the first time you push from this environment.

Once the push finishes, your code is on GitHub. You can continue collaborating there or open a pull request as usual.

## 2. Download files to your local computer

If you prefer to copy the files to your local machine without pushing to GitHub, you have a few options:

- **Download a ZIP:** In the workspace file browser (left sidebar), right-click the folder and choose *Download*. This will give you a ZIP archive you can unzip locally.
- **`scp`/`rsync` from the terminal:** If your local machine has SSH access to this environment, you can run commands such as:
  ```bash
  scp -r username@host:/workspace/solar-panels/ ./solar-panels
  ```
  The exact host/credentials depend on how your workspace is provisioned; consult your platform docs.
- **`git bundle`:** Create a single-file bundle you can copy down:
  ```bash
  git bundle create solar-panels.bundle HEAD work
  ```
  Download `solar-panels.bundle`, then on your local machine run:
  ```bash
  git clone solar-panels.bundle
  ```

After you copy the files, you can open them locally in your preferred editor or initialize a new Git repository.

---

Whichever method you choose, the repository lives at `/workspace/solar-panels` inside this environment. All terminal commands assume you start inside that directory.
