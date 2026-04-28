<div align="center">

<img src="public/app-icon.png" width="96" alt="NoteCard" />

# NoteCard

**中文** · [English](#english)

把桌面上散落的 `.txt` 装进一个轻量卡片本。本地优先，按类别整理，敏感内容可加密。

[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#下载)
[![Release](https://img.shields.io/github/v/release/Ja1nHan/Notecard?style=flat-square)](https://github.com/Ja1nHan/Notecard/releases/latest)

[官网 / 在线演示](https://notecard.notgoogle.site) · [下载最新版](#下载)

</div>

---

## 它解决什么问题

很多人——也许包括你——喜欢在桌面上用 txt 记点东西：一个临时密码、一条命令、一个忽然冒出来的想法。打开记事本、Ctrl+S、起个名字，几秒钟搞定。

问题是，这些 txt 会越积越多：

```
密码.txt
临时记一下.txt
新建文本文档(3).txt
备忘 - 副本.txt
```

半年后想找一条 WiFi 密码，得在桌面上挨个翻；想加密某一条，又懒得搬家到专门的密码管理器。

**NoteCard 不替代 VS Code、Obsidian、Notion，也不替代记事本——它替代的是"在桌面上散落的那一堆 txt"。** 一张卡片就是一条记录，一个 `.ncard` 文件就是你的整张桌面。

---

## 功能

| | |
|---|---|
| ⚡ **极致轻量** | 基于 Rust + Tauri 构建。启动即用，关闭不驻留，无后台进程，内存占用极低 |
| 📋 **卡片式管理** | 按类别分组，拖拽排序，五种配色标记。一眼就能找到，不用建文件夹也不用起文件名 |
| 🔒 **分级加密** | AES-256-GCM 加密。可对单张卡片或整个分类独立加密，其余内容照常展示 |
| 🔍 **快速搜索** | 实时搜索所有卡片标题与正文，输入即过滤。加密内容默认不参与搜索 |
| 🌍 **多语言** | 支持简体中文、繁体中文、English、日本語。语言跟随系统，也可手动切换 |
| 💾 **纯本地** | 无云同步，无账号，无数据上传。文件在哪，数据就在哪——可放 U 盘随身携带 |
| 🔄 **自动更新** | 安装版启动后自动检测新版本，静默下载，一键安装 |

---

## 下载

前往 [Releases](https://github.com/Ja1nHan/Notecard/releases/latest) 下载最新版本（Windows x64）：

| 文件 | 说明 |
|------|------|
| `NoteCard_*_x64-setup.exe` | **安装版（推荐）** — 标准 Windows 安装包，支持自动更新，开始菜单一键启动 |
| `NoteCard_*_x64_portable.zip` | **便携版** — 解压即用，不写注册表，不留痕迹，可放 U 盘随身携带 |

---

## 文件格式

NoteCard 用 `.ncard` 文件存储所有数据，本质上就是一个 JSON。

- 无加密内容时可以直接用文本编辑器打开
- 有加密内容时，仅加密部分经过 AES-256-GCM 处理，其余明文保存
- 人类可读的结构，无私有格式，永远不会被锁住

```jsonc
{
  "version": "1.0",
  "tabs": [
    {
      "name": "账号密码",
      "cards": [
        { "title": "GitHub", "body": "[encrypted: AES-256-GCM]", "locked": true },
        { "title": "WiFi",   "body": "SSID: Home_5G\npass: ...", "color": "sage" }
      ]
    }
  ]
}
```

---

## 技术栈

- [Tauri v2](https://tauri.app/) — Rust 后端，最小化内存占用
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) 前端
- AES-256-GCM + Argon2 加密，纯 Rust 实现

---

## License

[MIT](LICENSE)

---

<div id="english"></div>

<div align="center">

[中文](#readme) · **English**

Replace the pile of `.txt` files on your desktop with a lightweight card book.  
Local-first, grouped by category, with optional encryption.

[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#download)
[![Release](https://img.shields.io/github/v/release/Ja1nHan/Notecard?style=flat-square)](https://github.com/Ja1nHan/Notecard/releases/latest)

[Website / Live Demo](https://notecard.notgoogle.site) · [Download](#download)

</div>

---

## The problem it solves

A lot of people — maybe you — scribble things on the desktop with `.txt` files: a temp password, a shell command, a thought that just popped up. Open Notepad, Ctrl+S, name it, done in seconds.

The problem is they pile up:

```
passwords.txt
temp-notes.txt
New Text Document (3).txt
memo - copy.txt
```

Six months in you're hunting through a sea of icons for one WiFi password, and the idea of moving everything to a "real" password manager feels like overkill.

**NoteCard isn't trying to replace VS Code, Obsidian, Notion — or even Notepad. It replaces the pile of stray `.txt` files on your desktop.** One card per scrap, one `.ncard` file for the whole desktop.

---

## Features

| | |
|---|---|
| ⚡ **Lightweight** | Built on Rust + Tauri. Launches instantly, no background process, minimal memory footprint |
| 📋 **Card layout** | Group by category, drag to reorder, tag with five colors. No folders to make, no filenames to invent |
| 🔒 **Granular encryption** | AES-256-GCM. Encrypt individual cards or whole categories, leave the rest readable |
| 🔍 **Instant search** | Real-time filter across titles and bodies. Encrypted content stays out of the index |
| 🌍 **Multilingual** | Simplified Chinese, Traditional Chinese, English, Japanese. Follows your system or set manually |
| 💾 **Local only** | No cloud sync, no account, no telemetry. Wherever the file goes, your data goes — even on a USB stick |
| 🔄 **Auto update** | Installer edition checks for updates on launch and installs silently |

---

## Download

Visit [Releases](https://github.com/Ja1nHan/Notecard/releases/latest) for the latest version (Windows x64):

| File | Description |
|------|-------------|
| `NoteCard_*_x64-setup.exe` | **Installer (Recommended)** — Standard Windows installer with auto-update. One click from the Start menu |
| `NoteCard_*_x64_portable.zip` | **Portable** — Extract and run. No registry writes, no traces. Carry it on a USB stick |

---

## File format

NoteCard stores everything in a `.ncard` file — really just JSON.

- With no encrypted content you can open it in any text editor
- When encryption is used, only the encrypted parts go through AES-256-GCM; the rest stays plain
- Human-readable structure, no proprietary lock-in, ever

```jsonc
{
  "version": "1.0",
  "tabs": [
    {
      "name": "Passwords",
      "cards": [
        { "title": "GitHub", "body": "[encrypted: AES-256-GCM]", "locked": true },
        { "title": "WiFi",   "body": "SSID: Home_5G\npass: ...", "color": "sage" }
      ]
    }
  ]
}
```

---

## Tech stack

- [Tauri v2](https://tauri.app/) — Rust backend, minimal memory footprint
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) frontend
- AES-256-GCM + Argon2 encryption, pure Rust

---

## License

[MIT](LICENSE)
