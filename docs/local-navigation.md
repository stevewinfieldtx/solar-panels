# Accessing the Project Structure from Your Local Machine

When you download or clone the repository to your own computer you can browse the folders using the native shell tools for your operating system. The table below shows a few common commands.

| Task | Windows PowerShell | macOS/Linux |
| --- | --- | --- |
| Change into the project folder | `Set-Location .\solar-panels` | `cd solar-panels` |
| List files and folders | `Get-ChildItem` | `ls` |
| Show a tree two levels deep | `Get-ChildItem -Recurse -Depth 2` | `find . -maxdepth 2 -type d` |
| Inspect contents of `public` | `Get-ChildItem public` | `ls public` |

If you prefer a graphical view, open the folder in your file explorer (File Explorer on Windows, Finder on macOS) after cloning or downloading the project.

For commands that produce a lot of output, consider redirecting them to a file so you can review them later, e.g. `Get-ChildItem -Recurse > structure.txt`.
