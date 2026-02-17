@echo off
echo pocketbot launcher
echo.

REM Check if venv exists
if not exist ".venv" (
    echo No virtual environment found.
    set /p create_venv="Would you like to create a virtual environment? (y/n): "
    if /i "%create_venv%"=="y" (
        echo Creating virtual environment...
        python -m venv .venv
        echo Virtual environment created.
    )
)

REM Check if venv exists now
if exist ".venv" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
    
    REM Check if pocketbot is installed
    pocketbot --help >nul 2>&1
    if errorlevel 1 (
        echo pocketbot not found. Installing in development mode...
        pip install -e .
    )
    
    echo Starting pocketbot...
    pocketbot %*
) else (
    echo No virtual environment. Running with system Python...
    REM Check if pocketbot is available
    pocketbot --help >nul 2>&1
    if errorlevel 1 (
        echo pocketbot not found. Installing in development mode...
        pip install -e .
    )
    
    echo Starting pocketbot...
    pocketbot %*
)

pause
