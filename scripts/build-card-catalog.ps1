$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$tempRoot = Join-Path $projectRoot 'tmp\card-catalog-xlsx'
$jsonPath = Join-Path $projectRoot 'tmp\card-catalog-data.json'
$bundlePath = Join-Path $projectRoot 'tmp\card-export-build\export-card-data.mjs'
$outputDirectory = Join-Path $projectRoot 'docs'
$outputPath = Join-Path $outputDirectory 'catalogo-cartas-bangalores.xlsx'

New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'tmp') | Out-Null
Push-Location $projectRoot
try {
  & '.\node_modules\.bin\vite.cmd' build --config vite.export.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar os dados das cartas.' }
  node '.\tmp\card-export-build\export-card-data.mjs'
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar os dados das cartas.' }
} finally { Pop-Location }

if (Test-Path $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$tempRoot\_rels","$tempRoot\docProps","$tempRoot\xl\_rels","$tempRoot\xl\worksheets" | Out-Null
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

function Escape-Xml([object]$value) {
  if ($null -eq $value) { return '' }
  return [System.Security.SecurityElement]::Escape([string]$value)
}
function Column-Name([int]$number) {
  $name=''
  while($number -gt 0){$number--; $name=[char](65+($number%26))+$name; $number=[math]::Floor($number/26)}
  return $name
}

$rows = Get-Content -LiteralPath $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$headers = @($rows[0].PSObject.Properties.Name)
$sheet = New-Object System.Text.StringBuilder
[void]$sheet.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>')
$widths=@(24,38,16,22,15,18,14,14,12,11,11,11,11,11,14,60,55,70,55)
for($i=0;$i -lt $headers.Count;$i++){[void]$sheet.Append("<col min=`"$($i+1)`" max=`"$($i+1)`" width=`"$($widths[$i])`" customWidth=`"1`"/>")}
[void]$sheet.Append('</cols><sheetData>')
[void]$sheet.Append('<row r="1" ht="28" customHeight="1">')
for($i=0;$i -lt $headers.Count;$i++){$cell="$(Column-Name ($i+1))1";$value=Escape-Xml $headers[$i];[void]$sheet.Append("<c r=`"$cell`" t=`"inlineStr`" s=`"1`"><is><t>$value</t></is></c>")}
[void]$sheet.Append('</row>')
for($r=0;$r -lt $rows.Count;$r++){
  $rowNumber=$r+2;[void]$sheet.Append("<row r=`"$rowNumber`">")
  for($c=0;$c -lt $headers.Count;$c++){
    $property=$headers[$c];$value=$rows[$r].$property;$cell="$(Column-Name ($c+1))$rowNumber";$style=if($c -ge 15){2}else{0}
    if($value -is [int] -or $value -is [long] -or $value -is [double]){[void]$sheet.Append("<c r=`"$cell`" s=`"$style`"><v>$value</v></c>")}
    else{$escaped=Escape-Xml $value;[void]$sheet.Append("<c r=`"$cell`" t=`"inlineStr`" s=`"$style`"><is><t xml:space=`"preserve`">$escaped</t></is></c>")}
  }
  [void]$sheet.Append('</row>')
}
$lastColumn=Column-Name $headers.Count
[void]$sheet.Append("</sheetData><autoFilter ref=`"A1:$lastColumn$($rows.Count+1)`"/></worksheet>")

Set-Content -LiteralPath "$tempRoot\xl\worksheets\sheet1.xml" -Value $sheet.ToString() -Encoding UTF8
Set-Content -LiteralPath "$tempRoot\[Content_Types].xml" -Encoding UTF8 -Value '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'
Set-Content -LiteralPath "$tempRoot\_rels\.rels" -Encoding UTF8 -Value '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
Set-Content -LiteralPath "$tempRoot\xl\workbook.xml" -Encoding UTF8 -Value '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cartas" sheetId="1" r:id="rId1"/></sheets></workbook>'
Set-Content -LiteralPath "$tempRoot\xl\_rels\workbook.xml.rels" -Encoding UTF8 -Value '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
Set-Content -LiteralPath "$tempRoot\xl\styles.xml" -Encoding UTF8 -Value '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><color rgb="FFF3D38A"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF24170D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
$timestamp=(Get-Date).ToUniversalTime().ToString('s')+'Z'
Set-Content -LiteralPath "$tempRoot\docProps\core.xml" -Encoding UTF8 -Value "<?xml version=`"1.0`" encoding=`"UTF-8`"?><cp:coreProperties xmlns:cp=`"http://schemas.openxmlformats.org/package/2006/metadata/core-properties`" xmlns:dc=`"http://purl.org/dc/elements/1.1/`" xmlns:dcterms=`"http://purl.org/dc/terms/`" xmlns:xsi=`"http://www.w3.org/2001/XMLSchema-instance`"><dc:title>Catálogo de Cartas do Bangalore's</dc:title><dc:creator>Projeto Bangalore's</dc:creator><dcterms:created xsi:type=`"dcterms:W3CDTF`">$timestamp</dcterms:created></cp:coreProperties>"
Set-Content -LiteralPath "$tempRoot\docProps\app.xml" -Encoding UTF8 -Value '<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Bangalore&apos;s Card Export</Application></Properties>'

if(Test-Path $outputPath){Remove-Item -LiteralPath $outputPath -Force}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream=[System.IO.File]::Open($outputPath,[System.IO.FileMode]::Create)
try{
  $archive=New-Object System.IO.Compression.ZipArchive($stream,[System.IO.Compression.ZipArchiveMode]::Create,$false)
  try{
    Get-ChildItem -LiteralPath $tempRoot -Recurse -File | ForEach-Object {
      $relative=$_.FullName.Substring($tempRoot.Length+1).Replace('\','/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$_.FullName,$relative,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  }finally{$archive.Dispose()}
}finally{$stream.Dispose()}
Write-Host "Planilha criada: $outputPath ($($rows.Count) cartas)"
