# Comando para processar pagamento manualmente (SEM AUTENTICAÇÃO)
# Copie e cole este comando no PowerShell (com o servidor Next.js rodando)

$body = @{
    numeroFatura = "731430920"
    valor = 5.00
    descricao = "Pagamento de Teste - Plano THouse Rec"
    secretKey = "debug-local-only"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/pagamentos/processar-direto" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro HTTP: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Resposta do servidor:"
    $responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 10
}
