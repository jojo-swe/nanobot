#!/usr/bin/env fish
echo "pocketbot launcher"
echo

# Check if venv exists
if not test -d "venv"
    echo "No virtual environment found."
    read -P "Would you like to create a virtual environment? (y/n): " create_venv
    if string match -q -i "y" $create_venv
        echo "Creating virtual environment..."
        python3 -m venv venv
        echo "Virtual environment created."
    end
end

# Check if venv exists now
if test -d "venv"
    echo "Activating virtual environment..."
    source venv/bin/activate.fish
    
    # Check if pocketbot is installed
    if not command -v pocketbot > /dev/null 2>&1
        echo "pocketbot not found. Installing in development mode..."
        pip install -e .
    end
    
    echo "Starting pocketbot..."
    pocketbot $argv
else
    echo "No virtual environment. Running with system Python..."
    # Check if pocketbot is available
    if not command -v pocketbot > /dev/null 2>&1
        echo "pocketbot not found. Installing in development mode..."
        pip install -e .
    end
    
    echo "Starting pocketbot..."
    pocketbot $argv
end
