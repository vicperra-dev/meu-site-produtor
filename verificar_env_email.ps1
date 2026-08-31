# Script para verificar e configurar variáveis de email no .env.local

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificando configuração de email..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env.local"

# Verificar se o arquivo existe
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Arquivo .env.local não encontrado!" -ForegroundColor Red
    Write-Host "Criando arquivo .env.local..." -ForegroundColor Yellow
    
    # Criar arquivo com as variáveis necessárias
    @"
SUPPORT_EMAIL=thouse.rec.tremv@gmail.com
SUPPORT_EMAIL_PASSWORD=
SUPPORT_DEST_EMAIL=thouse.rec.tremv@gmail.com
"@ | Out-File -FilePath $envFile -Encoding UTF8
    
    Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Você precisa adicionar a SUPPORT_EMAIL_PASSWORD!" -ForegroundColor Yellow
    Write-Host "   A senha de app do Gmail (sem espaços)" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "✅ Arquivo .env.local encontrado" -ForegroundColor Green
    Write-Host ""
}

# Ler o arquivo
$content = Get-Content $envFile -Raw
$lines = Get-Content $envFile

Write-Host "Verificando variáveis de ambiente..." -ForegroundColor Cyan
Write-Host ""

$hasSupportEmail = $false
$hasSupportEmailPassword = $false
$hasSupportDestEmail = $false

foreach ($line in $lines) {
    $trimmedLine = $line.Trim()
    
    # Ignorar linhas vazias e comentários
    if ($trimmedLine -eq "" -or $trimmedLine.StartsWith("#")) {
        continue
    }
    
    if ($trimmedLine.StartsWith("SUPPORT_EMAIL=")) {
        $hasSupportEmail = $true
        $value = $trimmedLine.Substring("SUPPORT_EMAIL=".Length).Trim()
        if ($value -eq "" -or $value -eq "thouse.rec.tremv@gmail.com") {
            Write-Host "✅ SUPPORT_EMAIL: $value" -ForegroundColor Green
        } else {
            Write-Host "⚠️  SUPPORT_EMAIL: $value (deve ser thouse.rec.tremv@gmail.com)" -ForegroundColor Yellow
        }
    }
    
    if ($trimmedLine.StartsWith("SUPPORT_EMAIL_PASSWORD=")) {
        $hasSupportEmailPassword = $true
        $value = $trimmedLine.Substring("SUPPORT_EMAIL_PASSWORD=".Length).Trim()
        if ($value -ne "") {
            Write-Host "✅ SUPPORT_EMAIL_PASSWORD: Configurado (oculto)" -ForegroundColor Green
        } else {
            Write-Host "❌ SUPPORT_EMAIL_PASSWORD: NÃO CONFIGURADO" -ForegroundColor Red
        }
    }
    
    if ($trimmedLine.StartsWith("SUPPORT_DEST_EMAIL=")) {
        $hasSupportDestEmail = $true
        $value = $trimmedLine.Substring("SUPPORT_DEST_EMAIL=".Length).Trim()
        if ($value -eq "" -or $value -eq "thouse.rec.tremv@gmail.com") {
            Write-Host "✅ SUPPORT_DEST_EMAIL: $value" -ForegroundColor Green
        } else {
            Write-Host "⚠️  SUPPORT_DEST_EMAIL: $value (deve ser thouse.rec.tremv@gmail.com)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Verificar o que está faltando
$needsUpdate = $false
$newContent = @()

if (-not $hasSupportEmail) {
    Write-Host "⚠️  Adicionando SUPPORT_EMAIL..." -ForegroundColor Yellow
    $newContent += "SUPPORT_EMAIL=thouse.rec.tremv@gmail.com"
    $needsUpdate = $true
}

if (-not $hasSupportEmailPassword) {
    Write-Host "⚠️  Adicionando SUPPORT_EMAIL_PASSWORD (vazio - você precisa preencher)..." -ForegroundColor Yellow
    $newContent += "SUPPORT_EMAIL_PASSWORD="
    $needsUpdate = $true
}

if (-not $hasSupportDestEmail) {
    Write-Host "⚠️  Adicionando SUPPORT_DEST_EMAIL..." -ForegroundColor Yellow
    $newContent += "SUPPORT_DEST_EMAIL=thouse.rec.tremv@gmail.com"
    $needsUpdate = $true
}

# Atualizar o arquivo se necessário
if ($needsUpdate) {
    Write-Host ""
    Write-Host "Atualizando arquivo .env.local..." -ForegroundColor Cyan
    
    # Ler conteúdo atual
    $currentContent = Get-Content $envFile
    
    # Adicionar novas linhas
    foreach ($line in $newContent) {
        $currentContent += $line
    }
    
    # Salvar
    $currentContent | Out-File -FilePath $envFile -Encoding UTF8
    
    Write-Host "✅ Arquivo atualizado!" -ForegroundColor Green
    Write-Host ""
}

# Resumo final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMO:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($hasSupportEmail -and $hasSupportEmailPassword -and $hasSupportDestEmail) {
    $passwordValue = ""
    foreach ($line in $lines) {
        if ($line.Trim().StartsWith("SUPPORT_EMAIL_PASSWORD=")) {
            $passwordValue = $line.Trim().Substring("SUPPORT_EMAIL_PASSWORD=".Length).Trim()
            break
        }
    }
    
    if ($passwordValue -ne "") {
        Write-Host "✅ Todas as variáveis estão configuradas!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Próximo passo: Reiniciar o servidor Next.js" -ForegroundColor Yellow
        Write-Host "  1. Pare o servidor (Ctrl+C no terminal onde está rodando)" -ForegroundColor White
        Write-Host "  2. Execute: npm run dev" -ForegroundColor White
    } else {
        Write-Host "⚠️  SUPPORT_EMAIL_PASSWORD está vazio!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Você precisa:" -ForegroundColor Yellow
        Write-Host "  1. Obter a senha de app do Gmail:" -ForegroundColor White
        Write-Host "     https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
        Write-Host "  2. Adicionar no .env.local:" -ForegroundColor White
        Write-Host "     SUPPORT_EMAIL_PASSWORD=sua_senha_de_app_aqui" -ForegroundColor Cyan
        Write-Host "  3. Reiniciar o servidor" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  Algumas variáveis estão faltando!" -ForegroundColor Yellow
    Write-Host "   Verifique o arquivo .env.local" -ForegroundColor White
}

Write-Host ""
