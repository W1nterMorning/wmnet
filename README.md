# wmnet

macOS 命令行网关切换工具 — 漂亮的终端交互界面。

<p align="center">
  <img src="https://img.shields.io/badge/theme-31-blue" />
  <img src="https://img.shields.io/badge/source-2038_lines-green" />
  <img src="https://img.shields.io/badge/macOS-✓-lightgrey" />
</p>

## Install

```bash
curl -L https://github.com/W1nterMorning/wmnet/releases/latest/download/wmnet -o ~/.local/bin/wmnet
chmod +x ~/.local/bin/wmnet
wmnet
```

零依赖。不需要 Node.js、Bun 或任何运行时，单文件直接运行。

## Usage

### 命令

```
wmnet                      交互模式
wmnet status               查看网络状态（IP / 网关 / DNS / WiFi 名称）
wmnet switch <profile>     直接切换，跳过交互界面
wmnet list                 列出所有配置
wmnet add --name "x" --gateway 192.168.x.x
wmnet add --name "x" --gateway 192.168.x.x --static --static-ip 192.168.x.x --subnet 255.255.255.0
wmnet edit <id>            编辑配置
wmnet delete <id>          删除配置
wmnet undo                 撤销上次切换
wmnet theme <name>         切换主题（31 套可选）
wmnet settings             查看 / 修改设置
```

### 交互模式按键

| 键 | 功能 |
|---|---|
| `↑` `↓` `j` `k` | 移动选择 |
| `Enter` | 确认切换 |
| `1`–`9` | 数字快速选择 |
| `a` | 添加配置 |
| `e` | 编辑当前配置 |
| `d` | 删除当前配置 |
| `t` | 主题选择器（3 列网格） |
| `r` | 刷新列表 |
| `u` | 撤销上次切换 |
| `q` | 退出（带确认） |
| `←` `→` | 主题选择器中左右翻页 |

### 切换后自动 Ping

切换完成后自动测试四个节点连通性：

```
  Ping     Google      22ms ✓
  Ping     GitHub     185ms ✓
  Ping     Baidu       45ms ✓
  Ping     Bilibili    12ms ✓
```

## Themes

**31 套配色**，三类风格：

```
── 原始色调 (6) ──
cyan · sunset · forest · purple · rose · monochrome

── 渐变 (13) ──
aurora · ocean · sakura · neon
matrix · lava · midnight · cotton-candy · sunflare · mint
tricolor · galaxy · candy

── 多色硬切 (12) ──
gundam · eva-01 · voltron · cyber · joker
frost · inferno · thor · venom
rainbow · prism · voltron-prism
```

`t` 键打开 3 列网格选择器，`↑↓←→` 导航，`Enter` 即时应用。

## Config

`~/.config/wmnet/profiles.yaml`

```yaml
version: 1
profiles:
  - id: home
    name: Home Gateway
    gateway: 192.168.1.1
    useDhcp: true
    dns: []
    description: DHCP auto-config

  - id: office
    name: Office Static
    gateway: 10.0.0.1
    useDhcp: false
    staticIp: 10.0.0.100
    subnetMask: 255.255.255.0
    dns:
      - 8.8.8.8
    description: Static IP

settings:
  confirmBeforeSwitch: true
  autoTestAfterSwitch: true
  theme: cyan
```

首次运行自动检测当前网络并生成默认配置。

## Build

```bash
bun install
bun run build      # → dist/index.js
bun run compile    # → dist/wmnet (单文件可执行)
```
