

# Prompt

Generate a documentation full of graphs, making the script #file:index.ts more intuitive and easy to understand

# Answer

Here is a documentation draft for your index.ts script, featuring intuitive diagrams and explanations to make the plugin's logic and flow easy to understand.

---

# Siyuan Adaptive Expander Plugin Documentation

## Overview

This plugin automatically expands or folds blocks in Siyuan based on their content when a page is loaded. It listens to specific events, checks block attributes, and manages their expanded/collapsed state for a smoother user experience.

---

## High-Level Architecture

```mermaid
flowchart TD
    A[Plugin Load] --> B[Register Event Listeners]
    B --> C{Event Occurs}
    C -->|loaded-protyle-static| D[Check Block Attributes]
    D -->|Folded| E[Expand Block & Register]
    D -->|Not Folded| F[Do Nothing]
    C -->|destroy-protyle| G[Fold Back Registered Blocks]
    G --> H[Clear Registered List]
```

---

## Event Flow

### 1. Plugin Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Plugin
    User->>Plugin: Load Plugin
    Plugin->>Plugin: onload()
    Plugin->>Plugin: registerEventListeners()
    User->>Plugin: Disable/Unload Plugin
    Plugin->>Plugin: onunload()
    Plugin->>Plugin: unregisterEventListeners()
    User->>Plugin: Uninstall Plugin
    Plugin->>Plugin: uninstall()
```

---

### 2. Block Expansion Logic

```mermaid
flowchart TD
    A[Event: loaded-protyle-static] --> B[Get Block ID]
    B --> C[Fetch Block Attributes]
    C --> D{Is Folded?}
    D -- Yes --> E[Expand Block]
    E --> F[Register Block for Refolding]
    D -- No --> G[Do Nothing]
```

---

### 3. Block Refolding Logic

```mermaid
flowchart TD
    A[Event: destroy-protyle] --> B[Iterate Registered Blocks]
    B --> C[Fold Each Block]
    C --> D[Clear Registered List]
```

---

## Key Data Structures

- **latestFoldedBlockIdArray**:  
  An array storing IDs of blocks that were expanded and need to be folded back later.

---

## Main Methods

### registerEventListeners / unregisterEventListeners

- Registers/unregisters event handlers for:
  - `loaded-protyle-static` (expand/fold logic)
  - `destroy-protyle` (refold logic)

### tryExpandBlock

- Checks if a block is folded.
- If so, expands it and adds its ID to `latestFoldedBlockIdArray`.

### tryFoldBlockWhenDestroyProtype

- Folds back all blocks in `latestFoldedBlockIdArray` when the protyle instance is destroyed.

---

## Debugging

- Set `myDebug = true` to enable detailed logging.
- Use `window.myPathVar` to specify which part of the event object to log.

---

## Class Diagram

```mermaid
classDiagram
    class PluginSample {
        -fnLogArgsExecCount: number
        -latestFoldedBlockIdArray: string[]
        -isMobile: boolean
        +onload()
        +onunload()
        +uninstall()
        +registerEventListeners()
        +unregisterEventListeners()
        +tryExpandBlock()
        +tryFoldBlock()
        +tryFoldBlockWhenDestroyProtype()
        +logArgsCallback()
    }
    PluginSample --|> Plugin
```

---

## Summary

- **Purpose**: Automatically expand/fold blocks for better readability.
- **How**: Listens to events, checks block attributes, manages expanded/collapsed state.
- **Customization**: Debugging and logging are configurable.

---

Let me know if you want this as a Markdown file in your project, or need more diagrams or details!