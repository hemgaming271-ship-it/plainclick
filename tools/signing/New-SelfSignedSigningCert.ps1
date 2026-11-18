<#
.SYNOPSIS
  FREE signing for PlainClick (no Apple Developer Program): creates a self-signed code-signing certificate and the two
  GitHub secret values release.yml needs (SELFSIGNED_P12_BASE64, SELFSIGNED_P12_PASSWORD).

.DESCRIPTION
  Why bother if it isn't notarized? macOS ties the Accessibility permission to the app's signing identity. Ad-hoc
  builds get a new identity on every update, so users would have to grant permission again after each update. A
  self-signed certificate keeps one stable identity for years. Gatekeeper still asks buyers to click "Open Anyway"
  once, because only Apple can notarize.

  Make this certificate ONCE and keep the .p12 + password safe (password manager / offline backup). A new certificate
  = a new identity = every user re-grants Accessibility.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\signing\New-SelfSignedSigningCert.ps1
#>
param(
  [string]$Name = "PlainClick",
  [string]$OutDir = (Join-Path $HOME "PlainClick-signing")
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$p12 = Join-Path $OutDir "PlainClick-SelfSigned.p12"
if (Test-Path $p12) { throw "$p12 already exists. Re-use it (changing the certificate makes every user re-grant Accessibility). Delete it only if you really mean to start over." }

$X = "System.Security.Cryptography.X509Certificates"
$rsa = [System.Security.Cryptography.RSA]::Create(3072)
$req = New-Object "$X.CertificateRequest" ("CN=$Name Code Signing (self-signed)", $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$eku = New-Object System.Security.Cryptography.OidCollection
[void]$eku.Add((New-Object System.Security.Cryptography.Oid("1.3.6.1.5.5.7.3.3")))  # code signing
$req.CertificateExtensions.Add((New-Object "$X.X509EnhancedKeyUsageExtension" ($eku, $true)))
$req.CertificateExtensions.Add((New-Object "$X.X509KeyUsageExtension" ([System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature, $true)))
$req.CertificateExtensions.Add((New-Object "$X.X509BasicConstraintsExtension" ($false, $false, 0, $true)))
# Created in memory only: nothing is added to the Windows certificate store.
$cert = $req.CreateSelfSigned([DateTimeOffset]::Now.AddDays(-1), [DateTimeOffset]::Now.AddYears(20))

$bytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$pw = [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'
# .NET Framework writes PKCS#12 with 3DES/SHA-1, which every macOS 'security import' accepts.
$p12Bytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pkcs12, $pw)
[IO.File]::WriteAllBytes($p12, $p12Bytes)

$check = New-Object "$X.X509Certificate2" ($p12, $pw, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)
if (-not $check.HasPrivateKey) { throw "Self-check failed: the .p12 has no private key." }

[Convert]::ToBase64String($p12Bytes) | Set-Content -Path (Join-Path $OutDir "SELFSIGNED_P12_BASE64.txt") -Encoding ascii -NoNewline
$pw | Set-Content -Path (Join-Path $OutDir "SELFSIGNED_P12_PASSWORD.txt") -Encoding ascii -NoNewline

Write-Host ""
Write-Host "Self-signed certificate created (valid 20 years): $($cert.Subject)" -ForegroundColor Green
Write-Host "SHA-1: $($cert.Thumbprint)"
Write-Host "Files in $OutDir :"
Get-ChildItem $OutDir | Where-Object { $_.Name -like "*SelfSigned*" -or $_.Name -like "SELFSIGNED_*" } | ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""
Write-Host "Next: GitHub repo > Settings > Secrets and variables > Actions > New repository secret:"
Write-Host "  SELFSIGNED_P12_BASE64   = contents of SELFSIGNED_P12_BASE64.txt"
Write-Host "  SELFSIGNED_P12_PASSWORD = contents of SELFSIGNED_P12_PASSWORD.txt"
Write-Host "Then back up PlainClick-SelfSigned.p12 + the password somewhere safe and delete the two .txt files."
