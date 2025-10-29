# GW-Demo

运行说明
快速开始（无需安装）

把三份文件放在同一文件夹：
index.html、styles_Version12.css、script.js

双击 index.html 用 Chrome / Edge / Safari 打开就能跑。

这是纯前端静态页面，不需要后端或构建流程。

用本地服务器（可选，更稳）

任选其一：

方式 A：Python
cd <你的项目文件夹>
python3 -m http.server 8000
# 浏览器访问：
http://localhost:8000/index.html

方式 B：VS Code（Live Server）

VS Code 安装扩展：Live Server

右键 index.html → Open with Live Server

方式 C：Node（http-server）
# 一次性运行（无需全局安装）
npx http-server -p 8080 .
# 浏览器访问：
http://localhost:8080/index.html

文件结构
project/
├─ index.html
├─ styles_Version12.css
└─ script.js

常见问题

页面空白 / 样式或脚本不生效：检查 index.html 里是否引用了正确文件名
（必须是 styles_Version12.css 和 script.js，不要写成 styles.css）。

控制台报 404：文件名或路径不匹配（大小写/空格）。

改了代码但页面没变：刷新时按住 Shift（强制忽略缓存），或在 DevTools → Network 勾选 Disable cache。
