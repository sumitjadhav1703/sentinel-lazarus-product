# Lazarus Sentinel -- Multi-Server Safety Terminal

## Overview

Lazarus Sentinel is a desktop-first terminal application designed to
help developers and DevOps engineers safely manage multiple servers. It
focuses on preventing costly mistakes (especially in production
environments) while improving visibility and efficiency.

------------------------------------------------------------------------

## Problem

Managing multiple SSH sessions is confusing: - Hard to differentiate
environments (Prod vs Staging vs Dev) - Risk of running commands on
wrong server - Switching between tabs is inefficient - No unified view
of outputs

------------------------------------------------------------------------

## Solution

A safety-first terminal system with: - Environment-aware terminals -
Risk detection for dangerous commands - Multi-server command execution -
Unified execution console (grid view) - Local + remote terminal support

------------------------------------------------------------------------

## Core Features

### 1. Environment Awareness

-   Color-coded terminals
-   Clear labels (PROD / STAGING / DEV)

### 2. Multi-Server Execution

Run a command across multiple servers with preview and confirmation.

### 3. Execution Console

-   Grid layout of terminals
-   Real-time outputs
-   Status indicators (Success / Failed / Running)

### 4. Risk Detection

Warn users before executing dangerous commands on production.

### 5. Local + Remote Terminals

-   Local terminal (via node-pty)
-   SSH terminals (via ssh2)

### 6. Command History & Logs

-   Store commands with timestamps
-   Optional output logging
-   Privacy controls

------------------------------------------------------------------------

## User Journey

1.  User installs app
2.  Adds servers with environment tags
3.  Views dashboard of servers
4.  Opens terminals or selects multiple servers
5.  Runs commands
6.  Gets warnings if risky
7.  Views results in execution console
8.  Reviews history/logs

------------------------------------------------------------------------

## User Flows

### First-Time Setup

Login → Add Server → Tag Environment → Dashboard

### Single Server Use

Dashboard → Open Terminal → Run Command → Output

### Multi-Server Execution

Select Servers → Enter Command → Preview → Confirm → Execution Console

### Safety Flow

Command Input → Risk Detection → Warning → Execute

------------------------------------------------------------------------

## Architecture

### Local-first Desktop App

UI (React + xterm.js) ↓ Node.js backend (local) ↓ SSH (ssh2) / Local
shell (node-pty)

------------------------------------------------------------------------

## Tech Stack

-   Electron (desktop)
-   React (UI)
-   xterm.js (terminal)
-   Node.js (backend)
-   ssh2 (SSH)
-   node-pty (local terminal)

------------------------------------------------------------------------

## Data Storage

-   SQLite for command history
-   Logs stored optionally
-   Sensitive data masked

------------------------------------------------------------------------

## Security Principles

-   Store data locally
-   Use SSH keys
-   Mask secrets
-   User-controlled logging

------------------------------------------------------------------------

## Unique Value Proposition

"An operational safety layer for engineers working across multiple
servers."

------------------------------------------------------------------------

## Business Model

-   Free tier (limited servers)
-   Pro subscription
-   Team plans
-   Enterprise self-hosted

------------------------------------------------------------------------

## Roadmap

1.  MVP desktop app
2.  Add cloud sync
3.  Team collaboration
4.  AI features

------------------------------------------------------------------------

## Name

**Lazarus Sentinel**

------------------------------------------------------------------------

## Key Insight

This is not just a terminal. It is a system that prevents mistakes,
improves visibility, and makes multi-server operations safer.
