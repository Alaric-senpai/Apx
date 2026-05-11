APX

Offline-first project scaffolding for modern JavaScript frameworks.
Create projects instantly from locally cached templates and reuse shared dependencies powered by pnpm.


---

🚀 Why APX?

Starting a new project often means:

Re-downloading framework templates every time

Waiting for package installs on slow or unstable internet

Recreating huge node_modules folders across projects

Losing productivity when offline


APX solves this by caching framework starters locally and using pnpm’s efficient global package store.

That means:

✅ Scaffold projects faster
✅ Work offline after first setup
✅ Reduce redundant downloads
✅ Reuse dependencies across projects
✅ Improve DX in low-bandwidth environments


---

🧠 What is APX?

APX is a CLI tool that helps developers scaffold projects from cached framework templates.

Instead of:

npx create-next-app my-app

You can do:

apx setup nextjs
apx init nextjs my-app

The first command downloads and stores the framework template locally.

The second command creates a new project instantly using the local cache.


---

⚙️ How It Works

APX uses two ideas:

1. Local Template Caching

Framework starter templates are stored locally.

Example:

~/.apx/templates/nextjs/15.x/

This allows project generation without internet after initial setup.


---

2. Shared Dependencies via pnpm

Instead of downloading dependencies repeatedly, APX relies on pnpm’s shared package store.

Benefits:

Faster installs

Lower disk usage

Less duplication

Better offline installs



---

📦 Current MVP Scope

First supported framework:

Next.js


Planned support:

React + Vite

NestJS

Angular

Expo



---

📥 Installation

Requirements

Node.js 18+

pnpm installed globally


Install pnpm:

npm install -g pnpm

Install APX (future):

npm install -g apx

For development:

git clone <repo>
cd apx
pnpm install
pnpm build


---

🚀 Usage

Setup a Framework (First Time)

apx setup nextjs

What happens:

Downloads starter template

Detects framework version

Stores template locally

Updates APX registry



---

Create a New Project

apx init nextjs my-app

What happens:

Reads local registry

Copies cached template

Runs:


pnpm install --offline

Your project is ready



---

Example Workflow

apx setup nextjs
apx init nextjs blog
apx init nextjs dashboard
apx init nextjs portfolio

One setup. Many projects.


---

📁 Local Storage Structure

~/.apx/
├── registry.json
├── templates/
│   └── nextjs/
│       └── 15.x/
│           └── template/
├── cache/
└── logs/


---

📄 Registry Example

{
  "frameworks": {
    "nextjs": {
      "versions": ["15.x"],
      "default": "15.x"
    }
  }
}


---

🛠 Commands

Setup Framework

apx setup nextjs

Scaffold Project

apx init nextjs my-app

Planned Commands

apx list
apx update nextjs
apx remove nextjs
apx doctor


---

🌍 Why APX Matters

Many developers around the world deal with:

expensive mobile data

unstable internet

slow networks

repeated installs wasting time


APX is built with those developers in mind.

Especially useful for:

students

remote developers

travel coding setups

low bandwidth regions

offline-first workflows



---

🧱 Tech Stack

Current MVP:

TypeScript

Node.js

Commander

fs-extra

execa

pnpm


Future Enhancements:

Rust performance engine

WebAssembly bridge

Smart version diffing

Multi-framework profiles

Template marketplace



---

🛣 Roadmap

MVP

Next.js support

Local template cache

Offline project creation

Registry system


v2

React + Vite

NestJS

Update checking

Better prompts


v3

Rust-powered storage engine

Binary package acceleration

Team-shared cache sync

Plugin ecosystem



---

🤝 Contributing

Contributions are welcome.

Ideas especially welcome in:

offline workflows

CLI experience

framework adapters

caching systems

cross-platform support



---

📜 Vision

APX aims to become the fastest and most practical project scaffolding tool for developers anywhere—especially where internet cannot be taken for granted.

Build once. Cache forever. Create instantly.


---

📄 License

MIT


---

⭐ Support

If APX helps you, star the repo and share it with other developers.