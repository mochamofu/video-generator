#!/bin/bash
set -e

cd /MoneyPrinterTurbo

# Generate config.toml if not already mounted
if [ ! -f config.toml ]; then
    python /init_config.py
fi

echo "Starting MoneyPrinterTurbo API server..."
python main.py
