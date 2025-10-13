# Moving Workspace Changes to GitHub or Your Local Machine

This guide summarizes two common ways to move the code that lives in this Codespace-style workspace to another environment: pushing to GitHub and downloading to your computer.

> **Why can’t the assistant edit the copy on your personal machine?**
> The container you are interacting with is isolated from your PC, Google Drive, or any other storage. Even though the assistant has write access inside this workspace, it cannot reach outside of it. To use the updated files elsewhere you must explicitly export them using one of the methods below (or by pushing to GitHub). Until you do, the edits remain inside `/workspace/solar-panels` only.

## 1. Push directly to GitHub

1. Create an empty repository in your GitHub account (or decide which existing repo you want to use). Copy its **HTTPS** URL — it will look like `https://github.com/<user>/<repo>.git`.
   *If you are following along with this workspace, the remote has already been pointed at [`https://github.com/stevewinfieldtx/solar-panels`](https://github.com/stevewinfieldtx/solar-panels); you can push there directly or swap in your own URL as needed.*
2. Inside the workspace terminal, run:
   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   ```
   Replace the URL with your own. If a remote named `origin` already exists, replace the `add` command with:
   ```bash
2. Inside the workspace terminal, confirm the remote URL:
   ```bash
   git remote -v
   ```
   If you do not see the repository you want, add or update the remote:
   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   # ...or, if origin already exists
   git remote set-url origin https://github.com/<user>/<repo>.git
   ```
3. Stage and commit your work if you have not already:
   ```bash
   git add .
   git commit -m "Describe your changes"
   ```
4. Push the branch up to GitHub:
4. Push the branch up to GitHub (this also establishes the tracking relationship so future `git pull` commands know which remote branch to use):
   ```bash
   git push -u origin work
   ```
   Replace `work` with whatever branch name you are using. Git will prompt for your GitHub credentials or personal access token the first time you push from this environment.

Once the push finishes, your code is on GitHub. You can continue collaborating there or open a pull request as usual.

   If you already pushed without the `-u` flag or you cloned the workspace without an upstream branch, you can establish the link later with:
   ```bash
   git branch --set-upstream-to=origin/<branch> <branch>
   ```
   Replace `<branch>` with the name of your local branch (for example, `main`). After setting the upstream, `git pull` and `git push` will default to the correct remote branch.

Once the push finishes, your code is on GitHub. You can continue collaborating there or open a pull request as usual.

### Instant download link (after pushing)

GitHub automatically exposes a ZIP archive for every branch. As soon as your latest changes are pushed, you (or anyone you share it with) can click this direct download link:

- [`https://codeload.github.com/stevewinfieldtx/solar-panels/zip/refs/heads/main`](https://codeload.github.com/stevewinfieldtx/solar-panels/zip/refs/heads/main)

If you are working on a different branch, change the trailing `main` segment to match the branch name (for example `work` or `feature/roi-fixes`). The browser will immediately start downloading the ZIP file containing the entire repository.

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
