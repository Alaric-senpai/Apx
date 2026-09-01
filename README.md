# 🚀 APX

**Offline-first project scaffolding for modern JavaScript frameworks.**

Create projects instantly from locally cached templates and reuse shared dependencies powered by pnpm. Work offline, scaffold faster, use less bandwidth.

![Status](https://img.shields.io/badge/status-MVP-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Why APX?

### The Problem
Starting new projects is slow and wasteful:
- ❌ Re-downloading framework templates every time
- ❌ Waiting for installs on slow/unstable internet
- ❌ Massive disk usage with duplicate `node_modules` folders
- ❌ No productivity when offline

### The Solution
APX caches framework templates locally and leverages pnpm's intelligent package store.

**Result:**
- ⚡ Instant project scaffolding
- 🌐 Full offline support after first setup
- 💾 90% less disk space for dependencies
- 🔄 Shared packages across all projects
- 📍 Perfect for low-bandwidth environments

---

## 🎯 Quick Start

### 1. Initialize APX
```bash
apx init
```
Creates `~/.apx/` with registry and templates directory. Runs system diagnostics.

### 2. Cache a Framework
```bash
apx setup nextjs
```
Downloads and caches the latest Next.js template (~150MB). Requires internet.

### 3. Create Projects (Instantly!)
```bash
apx create nextjs my-app
cd my-app
pnpm dev
```
Creates a new Next.js project using cached template. Works offline ✈️

---

## 📋 Commands

### `apx init`
Initialize APX directories and validate your environment.
```bash
apx init
```
- Creates `~/.apx/` structure
- Verifies pnpm installation
- Runs system health checks

### `apx setup <framework>`
Download and cache a framework template.
```bash
apx setup nextjs              # Cache latest version
apx setup nextjs --version 14 # Cache specific version
apx setup nextjs --force      # Re-download even if cached
```
**Requires:** Internet connection

### `apx create <framework> <name>`
Create a new project from cached template.
```bash
apx create nextjs my-app              # Use default cached version
apx create nextjs my-app --version 13 # Use specific cached version
apx create nextjs my-app --offline    # Force offline mode (no version check)
```
**Result:** Full Next.js project ready for development. Zero network calls after setup.

### `apx list`
Show all cached frameworks and versions.
```bash
apx list
```
Displays:
- Default version for each framework
- All cached versions
- Cache date

### `apx doctor`
Run system diagnostics.
```bash
apx doctor
```
Checks:
- ✓ Node.js version
- ✓ pnpm installation and version
- ✓ APX directories
- ✓ Registry integrity
- ✓ Internet connectivity

---

## 🏗️ How It Works

### Two-Step Workflow

```
┌─────────────────────────────────────────┐
│ Step 1: SETUP (Requires Internet)      │
├─────────────────────────────────────────┤
│ apx setup nextjs                        │
│                                         │
│ ✓ Downloads create-next-app scaffold   │
│ ✓ Stores at ~/.apx/templates/nextjs/   │
│ ✓ Registers in local registry          │
│ ✓ Validates with pnpm                  │
└─────────────────────────────────────────┘
                    ⬇️
┌─────────────────────────────────────────┐
│ Step 2: CREATE (Works Offline!)         │
├─────────────────────────────────────────┤
│ apx create nextjs my-app                │
│                                         │
│ ✓ Copies template to project dir       │
│ ✓ Updates package.json name            │
│ ✓ Runs pnpm install --offline          │
│ ✓ Ready to dev!                        │
│                                         │
│ 🕐 Total time: ~10 seconds             │
│ 📶 Internet: Not needed                │
│ 💾 Disk: Deduplicated via pnpm store   │
└─────────────────────────────────────────┘
```

### Local Cache Structure
```
~/.apx/
├── registry.json          # Framework metadata & versions
├── templates/
│  └── nextjs/
│     ├── 14.2.0/
│     │  └── template/     # Cached Next.js 14.2.0 scaffold
│     └── 15.0.0/
│        └── template/     # Cached Next.js 15.0.0 scaffold
└── logs/                  # Setup/create operation logs
```

### pnpm Offline Magic
APX uses `pnpm install --offline` which:
1. Uses pnpm's global store (usually `~/.pnpm-store/`)
2. All packages are already there from first `setup`
3. Symlinks packages directly into node_modules
4. **No network calls needed!**

---

## 📦 Supported Frameworks

### Currently Implemented ✅
- **Next.js** — Full TypeScript support, App Router, Tailwind CSS

### Planned Support 🗓️
- React + Vite
- NestJS
- Angular
- Expo

---

## 💾 Installation

### Prerequisites
- **Node.js** 18+ (check: `node --version`)
- **pnpm** 9+ (install: `npm i -g pnpm`)
- **3GB+ disk space** for templates and stores

### Install APX

From npm (coming soon):
```bash
npm install -g apx
```

From source (now):
```bash
git clone https://github.com/yourusername/apx
cd apx
pnpm install
pnpm build
pnpm -w start
```

---

## 🗂️ Project Architecture

This is a TypeScript monorepo using **pnpm workspaces** and **Turbo** for task orchestration.

```
apx/
├── apps/
│  └── cli/                    # Main CLI entry point (Commander.js)
│     ├── src/index.ts         # Command registration
│     └── dist/index.js        # Compiled executable
│
├── packages/
│  ├── commands/               # Command implementations
│  │  ├── setup.ts             # Framework caching logic
│  │  ├── create.ts            # Project generation logic
│  │  ├── init.ts              # System initialization
│  │  ├── list.ts              # Display cached frameworks
│  │  └── doctor.ts            # Health diagnostics
│  │
│  ├── core/                   # Core scaffolding engine
│  │  ├── registry.ts          # Registry read/write
│  │  └── template.ts          # Template download & copy
│  │
│  ├── types/                  # Shared TypeScript interfaces
│  │
│  └── utils/                  # Shared utilities
│     ├── logger.ts            # CLI logging & spinners
│     └── network.ts           # Network checks & version fetching
│
├── pnpm-workspace.yaml        # Workspace config
├── turbo.json                 # Build orchestration
└── tsconfig.base.json         # Base TypeScript config
```

---

## 🔧 Development

### Setup
```bash
pnpm install
pnpm dev      # Watch mode for all packages
```

### Build
```bash
pnpm build    # Compile all packages with Turbo
```

### Test Commands
```bash
# After build:
node apps/cli/dist/index.js --help
node apps/cli/dist/index.js doctor
node apps/cli/dist/index.js list
```

### Monorepo Scripts
```bash
pnpm dev       # Continuous compilation
pnpm build     # Production build
pnpm lint      # Linting (when added)
pnpm clean     # Remove all dist/build artifacts
```

---

## 📊 Performance Benchmarks

### Without APX
```
npx create-next-app my-app
Total: 3-5 minutes
Downloaded: ~150MB (Next.js + deps)
Disk used: ~500MB per project
```

### With APX (after setup)
```
apx setup nextjs          # First time: 1-2 minutes (one-time)
apx create nextjs my-app  # Every time: 10-15 seconds
Total projects: 5 × 10s = 50s vs 5 × 4min = 20min
Disk saved: 5 × 400MB = 2GB with deduplication
```

---

## 🌐 Offline Workflow Example

```bash
# Day 1: At office with internet
apx setup nextjs          # Download & cache

# Day 2: On airplane, no internet
apx create nextjs frontend    # ✈️ Works perfectly!
apx create nextjs api         # ✈️ Works perfectly!
apx create nextjs dashboard   # ✈️ Works perfectly!

# Later: Back at office
pnpm -r dev               # Start all projects
```

---

## 🤝 Contributing

We welcome contributions! Areas to help:

- [ ] Add more framework support (Vite, NestJS, Angular)
- [ ] Improve offline detection and fallbacks
- [ ] Add progress indicators for large projects
- [ ] Windows compatibility testing
- [ ] Performance optimizations

---

## 📝 License

MIT © APX Contributors

---

## 🚀 What's Next?

- [x] Next.js MVP
- [ ] Multi-framework support
- [ ] Registry versioning improvements
- [ ] Template customization
- [ ] CI/CD integration
- [ ] Web dashboard for template browser

---

## 💬 Questions?

- 📖 Read the docs
- 🐛 Report issues on GitHub
- 💡 Suggest features
