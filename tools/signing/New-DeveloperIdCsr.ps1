<#
.SYNOPSIS
  Step 1 of Developer ID signing on Windows (no Mac needed): creates the private key and a Certificate Signing
  Request (CSR) to upload at developer.apple.com > Certificates > "+" > Developer ID Application.

.DESCRIPTION
  Uses Windows' built-in certreq. The private key is created in YOUR Windows user certificate store
  (Cert:\CurrentUser\REQUEST) and never leaves this PC until Step 2 exports it as a password-protected .p12.
  Run Step 2 (Export-DeveloperIdP12.ps1) on the SAME Windows user account after Apple gives you the .cer file.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\signing\New-DeveloperIdCsr.ps1 -Email you@example.com -Name "Your Name"
#>
param(
  [Parameter(Mandatory = $true)][string]$Email,
  [Parameter(Mandatory = $true)][string]$Name,
  # Kept outside the repo (and outside OneDrive-synced Desktop/Documents) on purpose.
  [string]$OutDir = (Join-Path $HOME "PlainClick-signing")
)
$ErrorActionPreference = "Stop"

if ($Name -match '[",=+<>#;\\]') { throw "Name must not contain , = + < > # ; \ or quotes." }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$inf = Join-Path $OutDir "request.inf"
$raw = Join-Path $OutDir "request.raw.csr"
$csr = Join-Path $OutDir "PlainClick-DeveloperID.certSigningRequest"
if (Test-Path $csr) { throw "$csr already exists. Delete it first if you really want a NEW key (the old one stays in Cert:\CurrentUser\REQUEST)." }

@"
[Version]
Signature = "`$Windows NT`$"

[NewRequest]
Subject = "E=$Email, CN=$Name"
KeyAlgorithm = RSA
KeyLength = 2048
HashAlgorithm = sha256
Exportable = TRUE
MachineKeySet = FALSE
ProviderName = "Microsoft Software Key Storage Provider"
RequestType = PKCS10
KeyUsage = 0xa0
FriendlyName = "PlainClick Developer ID"
"@ | Set-Content -Path $inf -Encoding ascii

& certreq.exe -new -q -user $inf $raw | Out-Null
if ($LASTEXITCODE -ne 0) { throw "certreq -new failed (exit $LASTEXITCODE)" }

# Apple's portal expects the standard PEM label.
(Get-Content $raw -Raw) -replace 'NEW CERTIFICATE REQUEST', 'CERTIFICATE REQUEST' | Set-Content -Path $csr -Encoding ascii -NoNewline
Remove-Item $raw, $inf

Write-Host ""
Write-Host "CSR created:  $csr" -ForegroundColor Green
Write-Host "Private key:  Windows user store (Cert:\CurrentUser\REQUEST), friendly name 'PlainClick Developer ID'"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. developer.apple.com > Certificates, IDs & Profiles > Certificates > '+'"
Write-Host "  2. Choose 'Developer ID Application' (G2 Sub-CA), upload the .certSigningRequest above"
Write-Host "  3. Download the .cer file, then run:"
Write-Host "     powershell -ExecutionPolicy Bypass -File tools\signing\Export-DeveloperIdP12.ps1 -CerPath <downloaded .cer>"
