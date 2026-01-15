Project Initialization, Script Implementation, and Executable Creation
Initialize a Python project, implement a variable argument script, and compile it into a standalone executable.

Proposed Changes
Scripts
[MODIFY] 
main.py
: (Already implemented) Added logic to handle sys.argv.
Dependencies
[MODIFY] 
pyproject.toml
: Add pyinstaller dependency.
Verification Plan
Automated Tests
Script Verification:
uv run main.py arg1 arg2
Executable Verification:
Build: uv run pyinstaller --onefile main.py
Run: dist\main.exe arg1 arg2
Verify output matches script output.
