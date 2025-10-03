import type { IContentItem } from '@kontent-ai/delivery-sdk';

/**
 * Tag content type interface based on the actual structure from Kontent.ai
 * Represents a tag item with name and parent relationships
 */
export interface Tag extends IContentItem {
  elements: {
    /** Display name of the tag */
    name: { value: string };
    /** Array of parent tag codenames for hierarchy */
    parent_tag: { value: string[] };
    /** Additional elements for SDK compatibility */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * Extended tag interface with hierarchical tree properties
 * Used for building and displaying the tag tree structure
 */
export interface TreeTag extends Tag {
  /** Child tags in the hierarchy */
  children: TreeTag[];
  /** Depth level in the tree (0 = root) */
  level: number;
  /** Whether this tag is a root level tag */
  isRoot: boolean;
}

/**
 * Kontent.ai Custom Element context provided during initialization
 */
export interface CustomElementContext {
  /** The unique project identifier */
  projectId: string;
  /** Information about the current content variant */
  variant: { 
    /** Unique variant identifier */
    id: string; 
    /** Variant codename (e.g., 'default', 'en', 'es') */
    codename: string; 
  };
}

/**
 * Configuration options for the custom element
 * Passed from Kontent.ai when the element is configured
 */
export interface CustomElementConfig {
  /** Optional parent tag codename to filter the tag tree */
  parentTagCodename?: string;
}

/**
 * Custom element instance interface
 * Represents the element state and configuration from Kontent.ai
 */
export interface CustomElement {
  /** Current value stored in the custom element */
  value: string;
  /** Whether the element is disabled for editing */
  disabled: boolean;
  /** Optional configuration passed from Kontent.ai */
  config?: CustomElementConfig;
}

/**
 * Structured tag information saved to Kontent.ai
 * Enhanced format with complete tag metadata
 */
export interface SavedTagInfo {
  /** Tag codename for technical references */
  codename: string;
  /** System name in Kontent.ai */
  name: string;
  /** Display name for user interfaces */
  displayName: string;
  /** Unique identifier */
  id: string;
  /** Array of parent tag codenames */
  parentTags: string[];
}

/**
 * Global window interface extension for Kontent.ai Custom Element SDK
 */
declare global {
  interface Window {
    CustomElement: {
      /** Initialize the custom element with callback */
      init: (callback: (element: CustomElement, context: CustomElementContext) => void) => void;
      /** Save value to Kontent.ai */
      setValue: (value: string | null) => void;
      /** Set the height of the custom element iframe */
      setHeight: (height: number) => void;
      /** Subscribe to disabled state changes */
      onDisabledChanged: (callback: (disabled: boolean) => void) => void;
    };
  }
}