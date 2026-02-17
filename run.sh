#!/bin/bash
echo "pocketbot launcher"
echo

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "No virtual environment found."
    read -p "Would you like to create a virtual environment? (y/n): " create_venv
    if [[ $create_venv =~ ^[Yy]$ ]]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
        echo "Virtual environment created."
    fi
fi

# Check if venv exists now
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
    
    # Check if pocketbot is installed
    if ! command -v pocketbot &> /dev/null; then
        echo "pocketbot not found. Installing in development mode..."
        pip install -e .
    fi
    
    echo "Starting pocketbot..."
    pocketbot "$@"
else
    echo "No virtual environment. Running with system Python..."
    # Check if pocketbot is available
    if ! command -v pocketbot &> /dev/null; then
        echo "pocketbot not found. Installing in development mode..."
        pip install -e .
    fi
    
    echo "Starting pocketbot..."
    pocketbot "$@"
fi
