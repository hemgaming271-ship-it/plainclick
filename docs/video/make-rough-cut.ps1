# Builds a tight, captioned cut (about 50-60 s) from the real CI footage. Nothing is faked or sped up:
# each scene is trimmed (dead time removed), then captions and an end card are added.
# Usage (from the repo root, ffmpeg on PATH):
#   powershell -ExecutionPolicy Bypass -File docs\video\make-rough-cut.ps1
# Inputs:  docs\video\plainclick-demo-macos26-raw.mov, docs\video\stdout.txt (SCENE lines),
#          docs\video\recording-started-epoch.txt
# Output:  docs\video\plainclick-rough-cut.mp4 (1920x1080, 30 fps, captions burned in) + plainclick-rough-cut.srt
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $dir 'plainclick-demo-macos26-raw.mov'
$recStart = [double](Get-Content (Join-Path $dir 'recording-started-epoch.txt') -Raw).Trim()
$scenes = [ordered]@{}
foreach ($line in Get-Content (Join-Path $dir 'stdout.txt')) {
    if ($line -match '^SCENE (\S+) ([0-9.]+)$') { $scenes[$Matches[1]] = [double]$Matches[2] - $recStart }
}
$duration = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $raw)

# scene = caption, seconds to skip at the scene start, max seconds to keep
$plan = [ordered]@{
    'start'       = @('Your everyday Mac actions, made clearer.', 0.0, 11.0)
    'hotkey'      = @('Press Control-Option-P. A plain panel appears. TextEdit stays as it is.', 0.0, 3.0)
    'save'        = @('Click Save. TextEdit saves your document.', 0.0, 4.5)
    'keep-typing' = @('Your typing stays in your document.', 0.0, 5.5)
    'find'        = @('Find, in one clear click.', 0.0, 6.5)
    'safari'      = @('Only actions we have tested: Safari Reload and New Tab.', 0.0, 7.0)
    'unsupported' = @('Apps we have not tested get an honest message.', 1.0, 4.5)
    'close'       = @('Press Control-Option-P again to close it.', 0.0, 4.0)
}
$names = @($plan.Keys | Where-Object { $scenes.Contains($_) })

$selects = @(); $captionsOnCut = @(); $t = 0.0
for ($i = 0; $i -lt $names.Count; $i++) {
    $p = $plan[$names[$i]]
    $a = [Math]::Max([double]0, [double]$scenes[$names[$i]] + [double]$p[1])
    $next = if ($i + 1 -lt $names.Count) { [double]$scenes[$names[$i + 1]] } else { $duration }
    $b = [Math]::Min($next, $a + [double]$p[2])
    if ($b -le $a) { continue }
    $selects += "between(t\,$([Math]::Round($a,3))\,$([Math]::Round($b,3)))"
    $end = $t + ($b - $a)
    $captionsOnCut += , @($p[0], $t, $end)
    $t = $end
}

$font = 'C\:/Windows/Fonts/segoeuib.ttf'
$fontReg = 'C\:/Windows/Fonts/segoeui.ttf'
$draw = @()
foreach ($c in $captionsOnCut) {
    $text = $c[0].Replace("'", '').Replace(':', '\:')
    $draw += "drawtext=fontfile='$font':text='$text':fontcolor=white:fontsize=44:box=1:boxcolor=0x000000@0.72:boxborderw=22:x=(w-text_w)/2:y=h-150:enable='between(t,$([Math]::Round($c[1],2)),$([Math]::Round($c[2],2)))'"
}
$main = "[0:v]fps=30,select='" + ($selects -join '+') + "',setpts=N/30/TB,scale=1440:1080:flags=lanczos,pad=1920:1080:240:0:color=0x111315," + ($draw -join ',') + "[main]"
$card = "color=c=0x111315:s=1920x1080:d=5:r=30," +
    "drawtext=fontfile='$font':text='PlainClick':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=330," +
    "drawtext=fontfile='$fontReg':text='Clear controls. Less clutter.':fontcolor=0xd9d6cf:fontsize=52:x=(w-text_w)/2:y=490," +
    "drawtext=fontfile='$font':text='Join the beta':fontcolor=0x8cc3dd:fontsize=56:x=(w-text_w)/2:y=620," +
    "drawtext=fontfile='$fontReg':text='Pre-release build. Works with listed apps only. Not affiliated with Apple.':fontcolor=0x9a9ea3:fontsize=30:x=(w-text_w)/2:y=900[card]"
$graph = "$main;$card;[main][card]concat=n=2:v=1:a=0[out]"
$graphFile = Join-Path $env:TEMP 'plainclick-cut-graph.txt'
[IO.File]::WriteAllText($graphFile, $graph)

$out = Join-Path $dir 'plainclick-rough-cut.mp4'
& ffmpeg -y -v error -i $raw '-/filter_complex' $graphFile -map '[out]' -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -an $out
if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed ($LASTEXITCODE)" }

# SRT (cut timeline) including the end card
$fmt = { param($s) $ts = [TimeSpan]::FromSeconds([double]$s); '{0:00}:{1:00}:{2:00},{3:000}' -f [int][Math]::Floor($ts.TotalHours), $ts.Minutes, $ts.Seconds, $ts.Milliseconds }
$srt = New-Object System.Collections.Generic.List[string]; $n = 0
foreach ($c in $captionsOnCut) { $n++; $srt.Add("$n"); $srt.Add("$(& $fmt $c[1]) --> $(& $fmt $c[2])"); $srt.Add($c[0]); $srt.Add('') }
$n++; $srt.Add("$n"); $srt.Add("$(& $fmt $t) --> $(& $fmt ($t + 5))"); $srt.Add('PlainClick. Clear controls. Less clutter. Join the beta.'); $srt.Add('')
[IO.File]::WriteAllLines((Join-Path $dir 'plainclick-rough-cut.srt'), $srt)
$len = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $out)
Write-Host "Wrote $out ($([Math]::Round((Get-Item $out).Length / 1MB, 1)) MB, $([Math]::Round($len,1)) s), scenes: $($names -join ', ')"
