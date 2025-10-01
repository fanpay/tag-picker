# Gemini Project: Kontent.ai Custom Element

This document outlines the plan for creating a web application to serve as a custom element in Kontent.ai.

## Objective

The goal is to build a React application using TypeScript that integrates with the Kontent.ai Custom Elements SDK. This will allow for a rich, custom editing experience for a specific content type field within the Kontent.ai app.

## Technology Stack

*   **Framework**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Kontent.ai Integration**: Kontent.ai JS SDK (via script tag)

## Development Plan

### 1. Project Setup

Initialize a new React + TypeScript project using Vite and install necessary dependencies.

```bash
# Create a new Vite project in the 'app' subdirectory
npm create vite@latest app -- --template react-ts

# Install project dependencies
cd app
npm install
```

### 2. SDK Integration

The Kontent.ai Custom Element SDK is not an npm package. It must be included by adding a `<script>` tag to `index.html`.

**File:** `app/index.html`

```html
<head>
  ...
  <script src="https://app.kontent.ai/js-api/custom-element/v1/custom-element.min.js"></script>
</head>
```

### 3. Application Structure

The core logic will reside within the `src` directory.

*   **`main.tsx`**: The entry point for the React application.
*   **`App.tsx`**: The main application component that will contain the custom element logic.
*   **`vite.config.ts`**: Vite configuration.

### 4. Implementation Steps

1.  **Initialize the SDK**: In `App.tsx`, use the `useEffect` hook to initialize the connection with the Kontent.ai app using the global `CustomElement` object.
2.  **Manage State**: Use the `useState` hook to manage the element's value.
3.  **Subscribe to Changes**: The `init` callback will receive a function to subscribe to external changes.
4.  **Update Kontent.ai**: When the user interacts with the custom element, use `CustomElement.setValue()` to save the new value.
5.  **Handle Disabled State**: The UI should respond to the `disabled` state.
6.  **Auto-resize**: Use `CustomElement.setHeight()` to ensure the `<iframe>` adjusts to its content height.

### 5. Example `App.tsx`

This is a basic example of a tag-picker that stores a comma-separated string.

```typescript
import { useState, useEffect } from 'react';
import './App.css';

// The CustomElement object is globally available from the script tag in index.html.
// We declare it here to inform TypeScript about its existence and type.
declare global {
  interface Window {
    CustomElement: {
      init: (callback: (element: any, context: any) => void) => void;
      setValue: (value: string | null) => void;
      setHeight: (height: number) => void;
      onDisabledChanged: (callback: (disabled: boolean) => void) => void;
    };
  }
}


function App() {
  const [value, setValue] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(true);

  useEffect(() => {
    const initCustomElement = () => {
      if (window.CustomElement) {
        window.CustomElement.init((element, context) => {
          // Set the initial value from Kontent.ai
          if (typeof element.value === 'string') {
            setValue(element.value);
          }
          
          // Set the initial disabled state
          setDisabled(element.disabled);

          // Update the element's height
          window.CustomElement.setHeight(document.documentElement.scrollHeight);
        });

        // Subscribe to disabled state changes
        window.CustomElement.onDisabledChanged(setDisabled);
      } else {
        console.error("CustomElement SDK not found. Make sure the script is included in index.html.");
      }
    };

    initCustomElement();
  }, []);

  useEffect(() => {
    // Update the element's height whenever the content changes
    if (window.CustomElement) {
      window.CustomElement.setHeight(document.documentElement.scrollHeight);
    }
  }, [value]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    if (window.CustomElement) {
      window.CustomElement.setValue(newValue);
    }
  };

  return (
    <div className="app">
      <label htmlFor="tag-input">Tags (comma-separated)</label>
      <input
        id="tag-input"
        type="text"
        value={value}
        onChange={handleValueChange}
        disabled={disabled}
        placeholder="e.g., marketing, tech, content"
      />
    </div>
  );
}

export default App;
```

### 6. Deployment

1.  **Build the Application**:
    ```bash
    npm run build
    ```
2.  **Host the `dist` folder**: The contents of the generated `dist` directory must be hosted on a publicly accessible URL (e.g., using Vercel, Netlify, or GitHub Pages).
3.  **Configure in Kontent.ai**: In the Kontent.ai UI, create a new "Custom element" and provide the URL where the application is hosted. Then, add this element to your content type.