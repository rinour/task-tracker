Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Xml

Write-Host "=== 1. Extracting clean original document.xml from backup ==="
$backupZip = [System.IO.Compression.ZipFile]::OpenRead('BAO_CAO_TASK_TRACKER_ORIGINAL_BACKUP.docx')
$cleanEntry = $backupZip.GetEntry('word/document.xml')
$destPath = 'docx_unpacked\word\document.xml'
$destDir = [System.IO.Path]::GetDirectoryName($destPath)
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
if (Test-Path $destPath) { Remove-Item $destPath -Force }

$destStream = [System.IO.File]::Create($destPath)
$cleanStream = $cleanEntry.Open()
$cleanStream.CopyTo($destStream)
$cleanStream.Dispose()
$destStream.Dispose()
$backupZip.Dispose()
Write-Host "Clean document.xml extracted successfully!"

Write-Host "=== 2. Running build_revised_docx.js to apply escaped XML updates ==="
& node build_revised_docx.js

Write-Host "=== 3. Updating BAO_CAO_TASK_TRACKER_REVISED.docx in-place ==="
Copy-Item "BAO_CAO_TASK_TRACKER_ORIGINAL_BACKUP.docx" "BAO_CAO_TASK_TRACKER_REVISED.docx" -Force

$xmlBytes = [System.IO.File]::ReadAllBytes($destPath)
$targetZip = [System.IO.Compression.ZipFile]::Open("BAO_CAO_TASK_TRACKER_REVISED.docx", [System.IO.Compression.ZipArchiveMode]::Update)
$oldEntry = $targetZip.GetEntry("word/document.xml")
if ($oldEntry -ne $null) { $oldEntry.Delete() }

$newEntry = $targetZip.CreateEntry("word/document.xml", [System.IO.Compression.CompressionLevel]::Optimal)
$stream = $newEntry.Open()
$stream.Write($xmlBytes, 0, $xmlBytes.Length)
$stream.Flush()
$stream.Dispose()
$targetZip.Dispose()
Write-Host "BAO_CAO_TASK_TRACKER_REVISED.docx updated!"

Write-Host "=== 4. Validating XML syntax of revised document.xml ==="
$verifyZip = [System.IO.Compression.ZipFile]::OpenRead("BAO_CAO_TASK_TRACKER_REVISED.docx")
$verifyEntry = $verifyZip.GetEntry("word/document.xml")
$reader = New-Object System.IO.StreamReader($verifyEntry.Open())
$xmlText = $reader.ReadToEnd()
$reader.Dispose()
$verifyZip.Dispose()

$xmlDoc = New-Object System.Xml.XmlDocument
try {
    $xmlDoc.LoadXml($xmlText)
    Write-Host "SUCCESS: XML syntax is 100% VALID! Root element: $($xmlDoc.DocumentElement.Name)" -ForegroundColor Green
} catch {
    Write-Host "FAILURE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=== 5. Checking all ZIP entry paths have forward slashes ==="
$checkZip = [System.IO.Compression.ZipFile]::OpenRead("BAO_CAO_TASK_TRACKER_REVISED.docx")
$hasBackslash = $false
foreach ($e in $checkZip.Entries) {
    if ($e.FullName.Contains("\")) {
        Write-Host "WARNING: Backslash found in entry: $($e.FullName)" -ForegroundColor Red
        $hasBackslash = $true
    }
}
$checkZip.Dispose()

if (-not $hasBackslash) {
    Write-Host "SUCCESS: All ZIP entry paths use forward slashes (OpenXML compliant)!" -ForegroundColor Green
}
Write-Host "=== DONE ==="
