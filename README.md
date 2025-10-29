# GW-Demo

God's Well - 2D 回合制 RPG Demo (Tauri)

This repository contains a Tauri desktop app skeleton plus GitHub Actions workflow to build a macOS .dmg you can download from the Actions run artifacts.

## 本地运行（Run locally）

项目目前仅包含一个静态网页原型，你可以使用任意静态文件服务器来预览。以下命令使用 Python 自带的 HTTP 服务器：

```bash
python3 -m http.server 8000
```

运行后访问 <http://localhost:8000/index_Version12.html> 即可看到 demo。需要停止时按 `Ctrl+C` 结束进程。

## GitHub Actions 打包

1. Go to the Actions tab.
2. Run the "Build macOS app" workflow.
3. Download the artifact (God_s_Well-macos.zip) after it completes.
