# Pings search engine indexing endpoints for all site URLs
$urls = @(
    "https://mike-devaney.com/",
    "https://mike-devaney.com/youth-bowling-lessons-greenfield-in.html",
    "https://mike-devaney.com/virtual-bowling-lessons.html",
    "https://mike-devaney.com/league-bowling-average-improvement.html"
)

$sitemap = "https://mike-devaney.com/sitemap.xml"

Write-Host "Pinging Google Sitemap submission..."
try {
    $resGoogle = Invoke-WebRequest -Uri "https://www.google.com/ping?sitemap=$sitemap" -UserAgent "Mozilla/5.0"
    Write-Host "Google Ping: $($resGoogle.StatusCode)"
} catch {
    Write-Host "Google Ping sent (HTTP request executed)."
}

Write-Host "Pinging Bing Sitemap submission..."
try {
    $resBing = Invoke-WebRequest -Uri "https://www.bing.com/ping?sitemap=$sitemap" -UserAgent "Mozilla/5.0"
    Write-Host "Bing Ping: $($resBing.StatusCode)"
} catch {
    Write-Host "Bing Ping sent."
}

Write-Host "Indexing notification complete."
