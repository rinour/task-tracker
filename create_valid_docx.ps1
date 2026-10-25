Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceDocx = "BAO_CAO_TASK_TRACKER_ORIGINAL_BACKUP.docx"
$targetDocx = "BAO_CAO_TASK_TRACKER_REVISED.docx"

# 1. Copy original backup to target
Copy-Item $sourceDocx $targetDocx -Force
Write-Host "Copied backup to $targetDocx"

# 2. Read modified document.xml
$modifiedXmlPath = "docx_unpacked\word\document.xml"
$xmlBytes = [System.IO.File]::ReadAllBytes($modifiedXmlPath)
Write-Host "Modified XML size: $($xmlBytes.Length) bytes"

# 3. Open target docx in Update mode
$mode = [System.IO.Compression.ZipArchiveMode]::Update
$zip = [System.IO.Compression.ZipFile]::Open($targetDocx, $mode)

# 4. Remove existing word/document.xml entry
$entry = $zip.GetEntry("word/document.xml")
if ($entry -ne $null) {
    $entry.Delete()
    Write-Host "Deleted original word/document.xml entry"
}

# 5. Create new word/document.xml entry with forward slash
$level = [System.IO.Compression.CompressionLevel]::Optimal
$newEntry = $zip.CreateEntry("word/document.xml", $level)
$stream = $newEntry.Open()
$stream.Write($xmlBytes, 0, $xmlBytes.Length)
$stream.Flush()
$stream.Dispose()
Write-Host "Wrote updated word/document.xml into zip entry"

# 6. Dispose zip archive
$zip.Dispose()
Write-Host "Closed zip archive successfully!"
