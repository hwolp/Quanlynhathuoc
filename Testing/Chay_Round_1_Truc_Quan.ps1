# Chạy từ PowerShell: .\Chay_Round_1_Truc_Quan.ps1
$qaPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$qaRunner = Join-Path $PSScriptRoot 'run_round.py'
if (-not (Test-Path -LiteralPath $qaPython)) {
    throw 'Chưa có môi trường Testing/.venv. Xem hướng dẫn cài đặt trong README.md.'
}
& $qaPython $qaRunner --round 1 --headed
$qaExitCode = $LASTEXITCODE
$qaLatestFile = Join-Path $PSScriptRoot 'reports\LATEST.txt'
if (Test-Path -LiteralPath $qaLatestFile) {
    Write-Host ('Báo cáo: ' + (Get-Content -LiteralPath $qaLatestFile -Raw))
}
if ($qaExitCode -eq 1) { Write-Host 'Đã chạy xong, có testcase Failed. Xem báo cáo để phân tích lỗi.' }
exit $qaExitCode
