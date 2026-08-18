# make-icon.ps1 — Ve logo ZK (tong xanh Zalo) ra cac file PNG nhieu kich thuoc
Add-Type -AssemblyName System.Drawing
$out = $PSScriptRoot
$sizes = @(16,24,32,48,64,128,256)

foreach ($S in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($S, $S, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Nen bo tron, gradient xanh Zalo
  $r = [int]($S * 0.22)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $S, $S)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($S - $d, 0, $d, $d, 270, 90)
  $path.AddArc($S - $d, $S - $d, $d, $d, 0, 90)
  $path.AddArc(0, $S - $d, $d, $d, 90, 90)
  $path.CloseFigure()

  $c1 = [System.Drawing.Color]::FromArgb(255, 0, 145, 255)
  $c2 = [System.Drawing.Color]::FromArgb(255, 0, 82, 217)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
  $g.FillPath($brush, $path)

  # Chu ZK trang
  $fontSize = [float]($S * 0.42)
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $textRect = New-Object System.Drawing.RectangleF(0, [float]($S * -0.02), [float]$S, [float]$S)
  $g.DrawString("ZK", $font, $white, $textRect, $fmt)

  $g.Dispose()
  $bmp.Save("$out\zk-$S.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Write-Output "Da tao PNG: $($sizes -join ', ')"
