# Affluence Gym : lance la démo complète en une commande (Windows PowerShell).
#
#   .\demo.ps1              # démo à l'heure de pointe (18 h), compteurs simulés
#   .\demo.ps1 -Hour 9      # autre heure simulée
#   .\demo.ps1 -NoExits     # mode « estimé » (tourniquet de sortie sans compteur)
#
# Démarre l'API sur la base de démonstration (chiffres FICTIFS, bandeau affiché),
# le simulateur des tourniquets et l'interface, chacun dans sa fenêtre.
# Pour tout arrêter : fermer les trois fenêtres.
param(
    [int]$Hour = 18,
    [switch]$NoExits
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "Environnement Python absent : lance d'abord l'installation (README, section Installation)." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Dépendances de l'interface absentes : lance 'npm install' dans frontend\." -ForegroundColor Red
    exit 1
}

# 1. Base de démonstration (créée une seule fois).
if (-not (Test-Path (Join-Path $backend "demo.db"))) {
    Write-Host "Création de la base de démonstration (données fictives)..."
    & $python (Join-Path $backend "scripts\seed_demo.py")
}

# 2. API en mode démo.
$api = "Set-Location '$backend'; `$env:DB_PATH='demo.db'; `$env:DEMO_DATA='true'; `$env:OFFICIAL_API_KEY='demo-key'; & '$python' -m uvicorn app.main:app --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $api

# 3. Simulateur des tourniquets (il réessaie tout seul tant que l'API démarre).
$simArgs = "--hour $Hour"
if ($NoExits) { $simArgs += " --no-exits" }
$sim = "Set-Location '$backend'; `$env:OFFICIAL_API_KEY='demo-key'; Start-Sleep -Seconds 3; & '$python' scripts\simulate_counter.py $simArgs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $sim

# 4. Interface (accessible aussi depuis un téléphone sur le même Wi-Fi).
$web = "Set-Location '$frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $web

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } |
    Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "Démo lancée (chiffres fictifs, heure simulée : $Hour h)." -ForegroundColor Green
Write-Host "  Ordinateur : http://localhost:5173"
if ($ip) { Write-Host "  Téléphone (même Wi-Fi) : http://${ip}:5173" }
Write-Host "Pour arrêter : ferme les trois fenêtres PowerShell ouvertes."
Start-Sleep -Seconds 8
Start-Process "http://localhost:5173"
