<#
.SYNOPSIS
  Step 2 of Developer ID signing on Windows: joins Apple's .cer with the private key from Step 1 and exports a
  password-protected .p12, plus the base64 text to paste into GitHub secrets.

.DESCRIPTION
  Output (all in -OutDir, which is outside the repo):
    PlainClick-DeveloperID.p12            certificate + private key (KEEP SAFE, never commit)
    MACOS_CERT_P12_BASE64.txt             paste into GitHub secret MACOS_CERT_P12_BASE64
    MACOS_CERT_P12_PASSWORD.txt           paste into GitHub secret MACOS_CERT_P12_PASSWORD
    NOTARY_API_KEY_P8_BASE64.txt          (only with -P8Path) paste into GitHub secret NOTARY_API_KEY_P8_BASE64
  After the secrets are saved in GitHub, keep the .p12 + password in a password manager / offline backup and
  delete the .txt files.

  The key is matched by its public key, so Windows doesn't need to trust Apple's certificate chain.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\signing\Export-DeveloperIdP12.ps1 -CerPath "$HOME\Downloads\developerID_application.cer" -P8Path "$HOME\Downloads\AuthKey_ABC123.p8"
#>
param(
  [Parameter(Mandatory = $true)][string]$CerPath,
  [string]$P8Path = "",
  [string]$OutDir = (Join-Path $HOME "PlainClick-signing")
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$X509 = [System.Security.Cryptography.X509Certificates.X509Certificate2]

$cer = New-Object $X509 ((Resolve-Path $CerPath).Path)
Write-Host "Certificate: $($cer.Subject)"
Write-Host "Valid until: $($cer.NotAfter)"
if ($cer.Subject -notmatch 'Developer ID Application') {
  Write-Warning "This is not a 'Developer ID Application' certificate. Apple Development / Mac App Distribution certificates can't be used for downloads outside the App Store."
}

# Find the Step 1 key: the pending request (or an already-installed copy) with the SAME public key.
$pub = [Convert]::ToBase64String($cer.PublicKey.EncodedKeyValue.RawData)
$candidates = @(Get-ChildItem Cert:\CurrentUser\REQUEST -ErrorAction SilentlyContinue) + @(Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue)
$holder = $candidates | Where-Object { $_.HasPrivateKey -and [Convert]::ToBase64String($_.PublicKey.EncodedKeyValue.RawData) -eq $pub } | Select-Object -First 1
if (-not $holder) {
  throw "No private key on this Windows user matches this certificate. Run New-DeveloperIdCsr.ps1 on THIS Windows user and upload THAT .certSigningRequest to Apple."
}

$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($holder)
$withKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::CopyWithPrivateKey($cer, $rsa)

$bytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$pwPlain = [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'

# .NET Framework writes PKCS#12 with 3DES/SHA-1, the format every macOS 'security import' accepts.
$p12Bytes = $withKey.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pkcs12, $pwPlain)
$p12 = Join-Path $OutDir "PlainClick-DeveloperID.p12"
[IO.File]::WriteAllBytes($p12, $p12Bytes)

# Self-check: the file opens with the password and still carries the private key.
$check = New-Object $X509 ($p12, $pwPlain, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)
if (-not $check.HasPrivateKey -or $check.Thumbprint -ne $cer.Thumbprint) { throw "Self-check failed: the .p12 does not contain this certificate with its private key." }

[Convert]::ToBase64String($p12Bytes) | Set-Content -Path (Join-Path $OutDir "MACOS_CERT_P12_BASE64.txt") -Encoding ascii -NoNewline
$pwPlain | Set-Content -Path (Join-Path $OutDir "MACOS_CERT_P12_PASSWORD.txt") -Encoding ascii -NoNewline

if ($P8Path) {
  $p8 = (Resolve-Path $P8Path).Path
  if ((Get-Content $p8 -Raw) -notmatch 'BEGIN PRIVATE KEY') { throw "$P8Path doesn't look like an App Store Connect API key (.p8)." }
  [Convert]::ToBase64String([IO.File]::ReadAllBytes($p8)) | Set-Content -Path (Join-Path $OutDir "NOTARY_API_KEY_P8_BASE64.txt") -Encoding ascii -NoNewline
}

Write-Host ""
Write-Host "Done (self-check passed). Files in $OutDir :" -ForegroundColor Green
Get-ChildItem $OutDir | ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""
Write-Host "Next: GitHub repo > Settings > Secrets and variables > Actions > New repository secret."
Write-Host "Paste each .txt file's content into the secret with the same name. Then delete the .txt files."
