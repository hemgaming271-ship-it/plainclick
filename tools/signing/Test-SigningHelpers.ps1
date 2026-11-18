<#
.SYNOPSIS
  End-to-end test of New-DeveloperIdCsr.ps1 + Export-DeveloperIdP12.ps1 with a THROWAWAY local CA standing in for
  Apple. Nothing here is a real certificate. Used by .github/workflows/signing-selftest.yml (Windows → macOS import).

.PARAMETER KeepDir
  If set, the throwaway .p12 / password files are copied there (for the macOS import test). Otherwise all is deleted.
#>
param([string]$KeepDir = "")
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$t = Join-Path $env:TEMP "pc-sign-e2e-$(Get-Random)"
$name = "PlainClick Selftest $(Get-Random)"
$X = "System.Security.Cryptography.X509Certificates"
$fail = 0
function Check($label, $ok) { if ($ok) { Write-Host "PASS  $label" } else { Write-Host "FAIL  $label"; $script:fail++ } }

try {
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$here\New-DeveloperIdCsr.ps1" -Email selftest@example.invalid -Name $name -OutDir $t | Out-Null
  Check "CSR created" (Test-Path "$t\PlainClick-DeveloperID.certSigningRequest")
  Check "CSR has standard PEM label" ((Get-Content "$t\PlainClick-DeveloperID.certSigningRequest" -TotalCount 1) -eq "-----BEGIN CERTIFICATE REQUEST-----")
  $req = Get-ChildItem Cert:\CurrentUser\REQUEST | Where-Object { $_.Subject -like "*$name*" } | Select-Object -First 1
  Check "pending key stored, RSA 2048" ($req -and $req.HasPrivateKey -and $req.PublicKey.Key.KeySize -eq 2048)

  # Throwaway CA (in memory) issues a code-signing cert for the CSR's public key, like Apple would.
  $caKey = [System.Security.Cryptography.RSA]::Create(2048)
  $gen = [System.Security.Cryptography.X509Certificates.X509SignatureGenerator]::CreateForRSA($caKey, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
  $issuer = New-Object "$X.X500DistinguishedName" ("CN=PlainClick Throwaway Test CA")
  $leafReq = New-Object "$X.CertificateRequest" ((New-Object "$X.X500DistinguishedName" ("CN=Developer ID Application: $name (TEAM000000)")), $req.PublicKey, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
  $eku = New-Object System.Security.Cryptography.OidCollection
  [void]$eku.Add((New-Object System.Security.Cryptography.Oid("1.3.6.1.5.5.7.3.3")))  # code signing
  $leafReq.CertificateExtensions.Add((New-Object "$X.X509EnhancedKeyUsageExtension" ($eku, $true)))
  $leafReq.CertificateExtensions.Add((New-Object "$X.X509KeyUsageExtension" ([System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature, $true)))
  $leafReq.CertificateExtensions.Add((New-Object "$X.X509BasicConstraintsExtension" ($false, $false, 0, $true)))
  $leaf = $leafReq.Create($issuer, $gen, [DateTimeOffset]::Now.AddDays(-1), [DateTimeOffset]::Now.AddDays(7), [byte[]](1, 2, 3, 4, 5, 6, 7, 8))
  [IO.File]::WriteAllBytes("$t\developerID_application.cer", $leaf.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
  "-----BEGIN PRIVATE KEY-----`nAAAA`n-----END PRIVATE KEY-----" | Set-Content "$t\AuthKey_TEST.p8" -Encoding ascii

  & powershell -NoProfile -ExecutionPolicy Bypass -File "$here\Export-DeveloperIdP12.ps1" -CerPath "$t\developerID_application.cer" -P8Path "$t\AuthKey_TEST.p8" -OutDir $t | Out-Null
  Check "export script succeeded" ($LASTEXITCODE -eq 0)

  $pw = Get-Content "$t\MACOS_CERT_P12_PASSWORD.txt" -Raw
  $b = [Convert]::FromBase64String((Get-Content "$t\MACOS_CERT_P12_BASE64.txt" -Raw))
  $x = New-Object "$X.X509Certificate2" ($b, $pw, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)
  Check "p12 (from base64) opens with password, has private key, right cert" ($x.HasPrivateKey -and $x.Thumbprint -eq $leaf.Thumbprint)
  $data = [Text.Encoding]::UTF8.GetBytes("plainclick")
  $sig = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($x).SignData($data, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
  Check "key in p12 pairs with the certificate" ([System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPublicKey($leaf).VerifyData($data, $sig, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1))
  $hex = [BitConverter]::ToString($b) -replace '-', ''
  Check "p12 uses 3DES (macOS-compatible PKCS#12)" ($hex -match '2A864886F70D010C0103')
  Check "p8 base64 written" (Test-Path "$t\NOTARY_API_KEY_P8_BASE64.txt")

  if ($KeepDir) {
    New-Item -ItemType Directory -Force -Path $KeepDir | Out-Null
    Copy-Item "$t\MACOS_CERT_P12_BASE64.txt", "$t\MACOS_CERT_P12_PASSWORD.txt" $KeepDir
    $leaf.Thumbprint | Set-Content "$KeepDir\expected-sha1.txt" -Encoding ascii -NoNewline
  }
}
finally {
  Get-ChildItem Cert:\CurrentUser\REQUEST -ErrorAction SilentlyContinue | Where-Object { $_.Subject -like "*$name*" } | ForEach-Object { Remove-Item $_.PSPath -DeleteKey }
  Remove-Item -Recurse -Force $t -ErrorAction SilentlyContinue
}
Check "test key removed from Windows store" (@(Get-ChildItem Cert:\CurrentUser\REQUEST -ErrorAction SilentlyContinue | Where-Object { $_.Subject -like "*$name*" }).Count -eq 0)
if ($fail) { Write-Host "$fail check(s) failed"; exit 1 } else { Write-Host "All checks passed" }
