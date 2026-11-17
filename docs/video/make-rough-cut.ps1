# Builds a captioned rough cut from the real CI footage.
# Usage (from the repo root, ffmpeg on PATH):
#   powershell -ExecutionPolicy Bypass -File docs\video\make-rough-cut.ps1
# Inputs:  docs\video\plainclick-demo-macos26-raw.mov, docs\video\stdout.txt (SCENE lines),
#          docs\video\recording-started-epoch.txt
# Output:  docs\video\plainclick-rough-cut.mp4 (1080p, captions burned in) and plainclick-rough-cut.srt
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $dir 'plainclick-demo-macos26-raw.mov'
$recStart = [double](Get-Content (Join-Path $dir 'recording-started-epoch.txt') -Raw).Trim()
$scenes = [ordered]@{}
foreach ($line in Get-Content (Join-Path $dir 'stdout.txt')) {
    if ($line -match '^SCENE (\S+) ([0-9.]+)$') { $scenes[$Matches[1]] = [double]$Matches[2] - $recStart }
}
$duration = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $raw)

# Caption text per scene (honest, matches docs/launch-video.md). Keep each line short.
$captions = [ordered]@{
    'start'       = 'Your everyday Mac actions, made clearer.'
    'hotkey'      = 'Press Control-Option-P. A plain panel appears. TextEdit stays as it is.'
    'save'        = 'Click Save. TextEdit saves your document.'
    'keep-typing' = 'Your typing stays in your document.'
    'find'        = 'Find, in one clear click.'
    'safari'      = 'Only actions we have tested: Safari Reload and New Tab.'
    'unsupported' = 'Apps we have not tested get an honest message.'
    'close'       = 'PlainClick - pre-release build, recorded on macOS 26.'
}

$names = @($captions.Keys | Where-Object { $scenes.Contains($_) })
$font = 'C\:/Windows/Fonts/segoeuib.ttf'
$filters = @('scale=1440:1080:flags=lanczos', 'pad=1920:1080:240:0:color=0x111315')
$srt = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $names.Count; $i++) {
    $a = [Math]::Max([double]0, [double]$scenes[$names[$i]])
    $b = if ($i + 1 -lt $names.Count) { $scenes[$names[$i + 1]] } else { $duration }
    $text = $captions[$names[$i]].Replace("'", '').Replace(':', '\:')
    $filters += "drawtext=fontfile='$font':text='$text':fontcolor=white:fontsize=44:box=1:boxcolor=0x000000@0.72:boxborderw=22:x=(w-text_w)/2:y=h-150:enable='between(t,$([Math]::Round($a,2)),$([Math]::Round($b,2)))'"
    $fmt = { param($s) $ts = [TimeSpan]::FromSeconds($s); '{0:00}:{1:00}:{2:00},{3:000}' -f [int][Math]::Floor($ts.TotalHours), $ts.Minutes, $ts.Seconds, $ts.Milliseconds }
    $srt.Add("$($i + 1)"); $srt.Add("$(& $fmt $a) --> $(& $fmt $b)"); $srt.Add($captions[$names[$i]]); $srt.Add('')
}
$out = Join-Path $dir 'plainclick-rough-cut.mp4'
& ffmpeg -y -v error -i $raw -vf ($filters -join ',') -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -an $out
[IO.File]::WriteAllLines((Join-Path $dir 'plainclick-rough-cut.srt'), $srt)
Write-Host "Wrote $out ($([Math]::Round((Get-Item $out).Length / 1MB, 1)) MB), scenes: $($names -join ', ')"
