Add-Type -AssemblyName System.Drawing

$sourceDirectory = Join-Path $PSScriptRoot '..\public\assets\cards\catalogo'
$outputDirectory = Join-Path $PSScriptRoot '..\public\assets\art\events'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($number in 196..215) {
    $index = $number - 195
    # As páginas 213 e 215 também estão partidas. Para esses dois eventos usamos
    # cenas completas de tema compatível: floresta sombria e cura ancestral.
    $replacement = @{ 213 = 208; 215 = 198 }
    $sourceNumber = if ($replacement.ContainsKey($number)) { $replacement[$number] } else { $number }
    $source = Get-ChildItem -LiteralPath $sourceDirectory -Filter ("{0:D3}_eventos_*.jpg" -f $sourceNumber) | Select-Object -First 1
    if (-not $source) { throw "Carta de evento $number não encontrada." }
    $image = [System.Drawing.Bitmap]::FromFile($source.FullName)
    try {
        # Gabarito das cartas válidas: ilustração entre cabeçalho e painel EFEITO.
        $crop = New-Object System.Drawing.Rectangle 17, 78, 268, 198
        $target = New-Object System.Drawing.Bitmap 804, 594
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($target)
            try {
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle 0, 0, 804, 594), $crop, [System.Drawing.GraphicsUnit]::Pixel)
            } finally { $graphics.Dispose() }
            $destination = Join-Path $outputDirectory ("event-{0:D2}.jpg" -f $index)
            $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
            $parameters = New-Object System.Drawing.Imaging.EncoderParameters 1
            $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
            $target.Save($destination, $encoder, $parameters)
            $parameters.Dispose()
        } finally { $target.Dispose() }
    } finally { $image.Dispose() }
}

Write-Host '20 ilustrações de eventos extraídas e normalizadas.'
