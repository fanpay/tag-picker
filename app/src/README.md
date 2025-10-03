# Source Code Structure

This directory contains the React components and utilities for the Kontent.ai Tag Picker custom element.

## File Organization

### 📁 Core Files

- **`App.tsx`** - Main React component with UI logic and state management
- **`App.css`** - Styles for the tag picker component
- **`main.tsx`** - Application entry point and React rendering

### 📁 Type Definitions

- **`types.ts`** - All TypeScript interfaces and type definitions
  - `Tag` - Kontent.ai tag content type structure
  - `TreeTag` - Enhanced tag with hierarchical properties
  - `CustomElementContext` - Kontent.ai context interface
  - `CustomElementConfig` - Configuration options
  - `CustomElement` - Element instance interface
  - `SavedTagInfo` - Structured format for saved data
  - Global window interface extensions

### 📁 Utilities

- **`utils.ts`** - Reusable functions and business logic
  - `parseInitialValue()` - Parse saved values from Kontent.ai
  - `getDisplayName()` - Format tag names for display
  - `createTagTree()` - Build hierarchical tag structure
  - `flattenTree()` - Convert tree to flat array for rendering
  - `fetchTags()` - Retrieve tags from Kontent.ai API
  - `formatTagsForSaving()` - Convert tags to save format

## Architecture Benefits

### ✅ **Separation of Concerns**
- **Types**: Centralized type definitions for better maintainability
- **Utils**: Reusable business logic independent of React
- **Components**: Pure UI logic without cluttered inline utilities

### ✅ **Better Maintainability**
- **Single Source of Truth**: Types defined once, used everywhere
- **Testability**: Utility functions can be easily unit tested
- **Readability**: Cleaner component code focused on UI logic

### ✅ **Scalability**
- **Easy to Extend**: Add new types or utilities without touching components
- **Reusability**: Utils can be shared across multiple components
- **Type Safety**: Centralized types ensure consistency

### ✅ **Best Practices**
- **React/TypeScript Standards**: Following community conventions
- **Documentation**: Well-documented interfaces and functions
- **Import/Export**: Clean module boundaries

## Import Pattern

```typescript
// Types (import type for better tree-shaking)
import type { Tag, CustomElementContext } from './types';

// Utilities (named imports)
import { getDisplayName, fetchTags } from './utils';
```

## Development Workflow

1. **Add new types** → Edit `types.ts`
2. **Add new utilities** → Edit `utils.ts`
3. **Update components** → Edit `App.tsx`
4. **Update styles** → Edit `App.css`

This structure follows React and TypeScript best practices for medium-to-large applications while keeping the codebase organized and maintainable.