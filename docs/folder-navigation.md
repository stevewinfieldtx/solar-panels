# Browsing the Workspace Folder Structure

The project files live inside `/workspace/solar-panels` when working in this environment. You can explore the directories from the integrated terminal using standard shell commands:

1. Change into the project directory:
   ```bash
   cd /workspace/solar-panels
   ```
2. List the files and folders in the current directory:
   ```bash
   ls
   ```
3. To inspect a subfolder (for example, the `public` directory), append its name to `ls`:
   ```bash
   ls public
   ```
4. For a compact tree-style view one or two levels deep, run:
   ```bash
   find . -maxdepth 2 -type d
   ```

On Windows PowerShell after cloning or downloading the repository, you can use:

```powershell
Set-Location C:\Users\<you>\Documents\solar-panels
Get-ChildItem
Get-ChildItem public
```

These commands let you browse the folder layout whether you are inside the workspace container or on your local machine.
