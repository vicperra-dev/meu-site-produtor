# Script para debugar perguntas FAQ do usuario logado
# Execute este script enquanto estiver logado no site

Write-Host "Verificando perguntas FAQ do usuario logado..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/debug/minhas-perguntas-faq" -Method GET
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro ao buscar perguntas:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor:" -ForegroundColor Yellow
        $responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}
