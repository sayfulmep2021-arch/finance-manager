Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$Size,
        [string]$Path,
        [bool]$IsMaskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $cTop = [System.Drawing.Color]::FromArgb(255, 2, 132, 199)
    $cBot = [System.Drawing.Color]::FromArgb(255, 3, 105, 161)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBot, 45.0)
    $g.FillRectangle($brush, $rect)

    # Accent ring
    $penColor = [System.Drawing.Color]::FromArgb(45, 255, 255, 255)
    $penWidth = [Math]::Max(2, [int]($Size * 0.03))
    $pen = New-Object System.Drawing.Pen($penColor, $penWidth)
    $ringMargin = [int]($Size * 0.12)
    $ringRect = New-Object System.Drawing.Rectangle($ringMargin, $ringMargin, ($Size - 2 * $ringMargin), ($Size - 2 * $ringMargin))
    $g.DrawEllipse($pen, $ringRect)

    # Symbol
    $fontSize = if ($IsMaskable) { [int]($Size * 0.45) } else { [int]($Size * 0.55) }
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    
    $takaSymbol = [char]0x09F3
    $strFormat = New-Object System.Drawing.StringFormat
    $strFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $yOffset = [int]($Size * 0.02)
    $g.DrawString($takaSymbol.ToString(), $font, $whiteBrush, ($Size / 2), ($Size / 2 + $yOffset), $strFormat)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $Path"
}

if (!(Test-Path "icons")) {
    New-Item -ItemType Directory -Path "icons" | Out-Null
}

Generate-Icon -Size 192 -Path "icons\icon-192.png"
Generate-Icon -Size 512 -Path "icons\icon-512.png"
Generate-Icon -Size 512 -Path "icons\icon-maskable.png" -IsMaskable $true
