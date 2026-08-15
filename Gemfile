source "https://rubygems.org"

ruby "3.2.11"

gem "jekyll", "~> 3.10"
gem "minima", "~> 2.5"
gem "base64"
gem "kramdown-parser-gfm"

# Windows·JRuby에서 _config.yml의 timezone(Asia/Seoul)을 지원하려면 필요. 리눅스(Cloudflare)는 OS zoneinfo를 써서 불필요
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-redirect-from"
  gem "jekyll-sitemap"
end
