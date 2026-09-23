param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][ValidateRange(1, 12)][int]$Columns,
  [Parameter(Mandatory = $true)][ValidateRange(1, 12)][int]$Rows,
  [Parameter(Mandatory = $true)][string]$State,
  [Parameter(Mandatory = $true)][string]$Destination,
  [ValidateRange(1, 512)][int]$Frames,
  [ValidateRange(64, 2048)][int]$CanvasSize = 512
)

# Splits a transparent image-generation sheet into the individual battle frames.
# Rows are read left-to-right, then top-to-bottom; every exported frame is a
# square RGBA PNG. Nearest-neighbour scaling preserves the intentionally crisp
# pixel-art edge treatment from the source sheet.
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source sheet not found: $Source"
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$sheet = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source))
try {
  $maxFrames = $Columns * $Rows
  if (-not $PSBoundParameters.ContainsKey('Frames')) { $Frames = $maxFrames }
  if ($Frames -gt $maxFrames) { throw "Frames ($Frames) exceeds the grid capacity ($maxFrames)." }

  for ($index = 0; $index -lt $Frames; $index++) {
    $column = $index % $Columns
    $row = [math]::Floor($index / $Columns)
    $left = [math]::Round($column * $sheet.Width / $Columns)
    $top = [math]::Round($row * $sheet.Height / $Rows)
    $right = [math]::Round(($column + 1) * $sheet.Width / $Columns)
    $bottom = [math]::Round(($row + 1) * $sheet.Height / $Rows)
    $sourceRect = [System.Drawing.Rectangle]::FromLTRB($left, $top, $right, $bottom)

    $frame = New-Object System.Drawing.Bitmap $CanvasSize, $CanvasSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($frame)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.DrawImage($sheet, (New-Object System.Drawing.Rectangle 0, 0, $CanvasSize, $CanvasSize), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }
      $name = '{0}_{1:D2}.png' -f $State, $index
      $frame.Save((Join-Path $Destination $name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $frame.Dispose()
    }
  }
} finally {
  $sheet.Dispose()
}
