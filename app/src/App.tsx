import { useState, useEffect } from 'react';
import { useCombobox, useMultipleSelection } from 'downshift';
import { createDeliveryClient } from '@kontent-ai/delivery-sdk';
import type { IContentItem } from '@kontent-ai/delivery-sdk';
import './App.css';

/**
 * Custom Element interfaces for Kontent.ai integration
 */

/** Context provided by Kontent.ai when initializing a custom element */
interface CustomElementContext {
  /** The unique project identifier */
  projectId: string;
  /** Information about the current content variant */
  variant: {
    /** Unique variant identifier */
    id: string;
    /** Variant codename (e.g., 'default', 'de', 'es') */
    codename: string;
  };
}

/** Configuration options for the custom element */
interface CustomElementConfig {
  /** Optional parent tag codename to filter the tag tree */
  parentTagCodename?: string;
}

/** Custom element instance provided by Kontent.ai */
interface CustomElement {
  /** Current value stored in the custom element */
  value: string;
  /** Whether the element is disabled for editing */
  disabled: boolean;
  /** Optional configuration passed from Kontent.ai */
  config?: CustomElementConfig;
}

// The CustomElement object is globally available.
// We declare it here to inform TypeScript about its existence and type.
declare global {
  interface Window {
    CustomElement: {
      init: (callback: (element: CustomElement, context: CustomElementContext) => void) => void;
      setValue: (value: string | null) => void;
      setHeight: (height: number) => void;
      onDisabledChanged: (callback: (disabled: boolean) => void) => void;
    };
  }
}

/**
 * Tag content type interface based on the actual structure from Kontent.ai:
 * - name: Text element for the tag name  
 * - parent_tag: Modular content element for hierarchical relationships
 */
interface Tag extends IContentItem {
  elements: {
    name: {
      value: string;
    };
    parent_tag: {
      value: string[];
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // For SDK compatibility
  };
}

interface TagNode extends Tag {
  children: TagNode[];
}

function App() {
  const [disabled, setDisabled] = useState<boolean>(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [parentTagCodename, setParentTagCodename] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [languageCodename, setLanguageCodename] = useState<string>('en-us');

  // Downshift multiple selection hook
  const {
    getSelectedItemProps,
    getDropdownProps,
    addSelectedItem,
    removeSelectedItem,
    selectedItems,
  } = useMultipleSelection({
    selectedItems: selectedTags,
    onStateChange({ selectedItems: newSelectedItems, type }) {
      switch (type) {
        case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
        case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
        case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
        case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
          setSelectedTags(newSelectedItems || []);
          break;
        default:
          break;
      }
    },
  });

  // Filter tags that are not already selected
  const availableTags = allTags.filter(
    tag => !selectedItems.some(selected => selected.system.codename === tag.system.codename)
  );

  // Create tree structure for available tags
  /** TreeTag extends Tag with hierarchical properties for tree display */
  interface TreeTag extends Tag {
    children: TreeTag[];
    level: number;
    isRoot: boolean;
  }

  /**
   * Creates a hierarchical tree structure from a flat array of tags
   * @param tags - Array of tag items from Kontent.ai
   * @returns Tree structure with parent-child relationships
   */
  const createTagTree = (tags: Tag[]): TreeTag[] => {
    // Create a map for quick lookup
    const tagMap = new Map<string, TreeTag>();
    
    // Initialize all tags as tree nodes
    tags.forEach(tag => {
      tagMap.set(tag.system.codename, {
        ...tag,
        children: [],
        level: 0,
        isRoot: true
      });
    });

    const rootTags: TreeTag[] = [];

    // Build the tree structure
    tags.forEach(tag => {
      const treeTag = tagMap.get(tag.system.codename)!;
      const parentCodenames = tag.elements.parent_tag?.value || [];
      
      if (parentCodenames.length === 0) {
        // This is a root tag
        rootTags.push(treeTag);
      } else {
        // This tag has parents, add it to the first parent found in our available tags
        let addedToParent = false;
        parentCodenames.forEach((parentCodename: string) => {
          const parent = tagMap.get(parentCodename);
          if (parent && !addedToParent) {
            parent.children.push(treeTag);
            treeTag.level = parent.level + 1;
            treeTag.isRoot = false;
            addedToParent = true;
          }
        });
        
        // If no parent was found in available tags, treat as root
        if (!addedToParent) {
          rootTags.push(treeTag);
        }
      }
    });

    return rootTags;
  };

  /**
   * Flattens the hierarchical tree into a linear array for dropdown display
   * @param treeNodes - Tree structure of tags with children
   * @returns Flattened array maintaining hierarchical order
   */
  const flattenTree = (treeNodes: TreeTag[]): TreeTag[] => {
    const result: TreeTag[] = [];
    
    const addNodeAndChildren = (node: TreeTag) => {
      result.push(node);
      node.children.forEach(addNodeAndChildren);
    };
    
    treeNodes.forEach(addNodeAndChildren);
    return result;
  };

  const tagTree = createTagTree(availableTags);
  const flattenedTags = flattenTree(tagTree);

  /**
   * Gets the display name for a tag, combining system name with element name
   * Format: "System Name - Element Name" when different, otherwise just the element name
   * @param tag - The tag item to get the display name for
   * @returns Formatted display name
   */
  const getDisplayName = (tag: Tag): string => {
    const systemName = tag.system.name;
    const elementName = tag.elements.name.value;
    
    // If element name exists and is different from system name, show both
    if (elementName && elementName.trim() !== systemName.trim()) {
      return `${systemName} - ${elementName}`;
    }
    
    // Otherwise, prefer element name if available, fallback to system name
    return elementName || systemName;
  };

  // Downshift combobox hook
  const {
    isOpen,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    items: flattenedTags,
    itemToString: (item) => item ? getDisplayName(item) : '',
    defaultHighlightedIndex: 0,
    selectedItem: null,
    stateReducer(_state, actionAndChanges) {
      const { changes, type } = actionAndChanges;
      
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return {
            ...changes,
            isOpen: true,
            highlightedIndex: 0,
            inputValue: '',
          };
        default:
          return changes;
      }
    },
    onStateChange({
      type,
      selectedItem: newSelectedItem,
    }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.InputBlur:
          if (newSelectedItem) {
            addSelectedItem(newSelectedItem);
            setSelectedTags([...selectedItems, newSelectedItem]);
          }
          break;
        default:
          break;
      }
    },
  });

  // Store initial codenames until tags are loaded
  const [initialCodenames, setInitialCodenames] = useState<string[]>([]);

  useEffect(() => {
    const initCustomElement = () => {
      if (window.CustomElement) {
        window.CustomElement.init((element, context) => {
          // Set the initial value from Kontent.ai
          if (typeof element.value === 'string' && element.value) {
            let codenames: string[] = [];
            try {
              // Try to parse as a JSON array (new format)
              const parsedValue = JSON.parse(element.value);
              if (Array.isArray(parsedValue)) {
                codenames = parsedValue;
              }
            } catch {
              // If parsing fails, assume it's a single string (old format)
              codenames = [element.value];
            }
            setInitialCodenames(codenames);
          }

          // Get parentTagCodename from the custom element configuration (optional)
          if (element.config?.parentTagCodename) {
            setParentTagCodename(element.config.parentTagCodename);
            console.log(`Filtering by parent tag: ${element.config.parentTagCodename}`);
          } else {
            console.log("No parent tag filter configured - showing all tags");
          }

          // Capture the language codename from the context
          if (context.variant?.codename) {
            setLanguageCodename(context.variant.codename);
            console.log(`Custom element language: ${context.variant.codename}`);
          }

          // Set the initial disabled state
          setDisabled(element.disabled);

          // Set initial height for the iframe
          window.CustomElement.setHeight(180);

          // Fetch all tags from the Delivery API
          fetchTags(context.projectId, context.variant?.codename || 'en-us');
        });

        // Subscribe to disabled state changes
        window.CustomElement.onDisabledChanged(setDisabled);
      } else {
        console.error("CustomElement SDK not found.");
      }
    };

    const addTagToParents = (tag: Tag, tagMap: Map<string, TagNode>) => {
      const parentCodenames = tag.elements.parent_tag?.value || [];
      const currentNode = tagMap.get(tag.system.codename);
      
      parentCodenames.forEach((parentCodename: string) => {
        const parentNode = tagMap.get(parentCodename);
        if (parentNode && currentNode) {
          parentNode.children.push(currentNode);
        }
      });
    };

    const buildTagHierarchy = (tags: Tag[], tagMap: Map<string, TagNode>) => {
      tags.forEach(tag => {
        const parentCodenames = tag.elements.parent_tag?.value || [];
        if (parentCodenames.length > 0) {
          addTagToParents(tag, tagMap);
        }
      });
    };

    const getDescendants = (node: TagNode): Tag[] => {
      let descendants: Tag[] = [node];
      for (const child of node.children) {
        descendants = [...descendants, ...getDescendants(child)];
      }
      return descendants;
    };

    const fetchTags = async (projectId: string, languageCode: string = 'en-us') => {
      try {
        console.log(`Fetching tags for language: ${languageCode}`);
        
        // Create delivery client with the project ID
        const client = createDeliveryClient({
          environmentId: projectId
        });

        // Fetch all tags using the SDK with language parameter
        const response = await client
          .items<Tag>()
          .type('_tag')
          .languageParameter(languageCode)
          .toPromise();
        
        console.log(`Fetched ${response.data.items.length} tags in ${languageCode}`);
        
        if (parentTagCodename) {
          const allFetchedTags: Tag[] = response.data.items;
          const tagMap = new Map<string, TagNode>();

          // Initialize tag map
          allFetchedTags.forEach(tag => {
            tagMap.set(tag.system.codename, { ...tag, children: [] });
          });

          // Build hierarchy
          buildTagHierarchy(allFetchedTags, tagMap);

          const rootNode = tagMap.get(parentTagCodename);
          if (rootNode) {
            setAllTags(getDescendants(rootNode));
          } else {
            setAllTags([]);
          }
        } else {
          setAllTags(response.data.items);
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    initCustomElement();
  }, [parentTagCodename, languageCodename]);

  // Convert initial codenames to tags when tags are loaded
  useEffect(() => {
    if (allTags.length > 0 && initialCodenames.length > 0) {
      const initialTags = allTags.filter(tag => 
        initialCodenames.includes(tag.system.codename)
      );
      setSelectedTags(initialTags);
      setInitialCodenames([]); // Clear initial codenames
    }
  }, [allTags, initialCodenames]);

  useEffect(() => {
    // Update the element's height whenever the content changes with a slight delay
    const updateHeight = () => {
      if (window.CustomElement) {
        // Calculate height more accurately
        const appElement = document.querySelector('.app');
        if (appElement) {
          // Base height calculation
          const baseHeight = 180; // Minimum height
          
          // Add height for each row of tags (approximately 40px per row)
          const tagsPerRow = Math.floor(400 / 120); // Assuming ~120px per tag
          const tagRows = Math.ceil(selectedItems.length / tagsPerRow);
          const tagsHeight = Math.max(40, tagRows * 40);
          
          // Add extra height if dropdown is open
          const dropdownHeight = isOpen ? Math.min(160, flattenedTags.length * 44) : 0;
          
          const totalHeight = baseHeight + tagsHeight + dropdownHeight;
          
          window.CustomElement.setHeight(Math.min(totalHeight, 500)); // Max height 500px
        }
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(updateHeight, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedItems, isOpen, flattenedTags.length]);

  useEffect(() => {
    // Send selected codenames to Kontent.ai
    if (window.CustomElement && selectedItems) {
      const selectedCodenames = selectedItems.map(tag => tag.system.codename);
      window.CustomElement.setValue(JSON.stringify(selectedCodenames));
    }
  }, [selectedItems]);

  return (
    <div className="app">
      <label {...getLabelProps()}>Select Tag(s) ({languageCodename})</label>
      <div className="autocomplete-container">
        <div className="selected-tags">
          {selectedItems.map((selectedItemForRender, index) => (
            <span
              key={selectedItemForRender.system.codename}
              {...getSelectedItemProps({
                selectedItem: selectedItemForRender,
                index,
              })}
              className="selected-tag"
            >
              {getDisplayName(selectedItemForRender)}
              <button
                type="button"
                className="tag-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSelectedItem(selectedItemForRender);
                  setSelectedTags(selectedItems.filter(item => item !== selectedItemForRender));
                }}
                disabled={disabled}
                aria-label={`Remove ${getDisplayName(selectedItemForRender)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="combobox-container">
          <input
            placeholder="Search for tags..."
            className="combobox-input"
            disabled={disabled}
            {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
          />
          {isOpen && (
            <ul className="suggestions-list" {...getMenuProps()}>
              {flattenedTags.map((item, index) => (
                <li
                  className={`suggestion-item ${
                    highlightedIndex === index ? 'highlighted' : ''
                  } ${item.isRoot ? 'root-tag' : 'child-tag'}`}
                  key={`${item.system.codename}${index}`}
                  style={{
                    paddingLeft: `${1 + item.level * 1.5}rem`,
                  }}
                  {...getItemProps({ item, index })}
                >
                  <span className="tag-hierarchy">
                    <span className={`tag-name ${item.isRoot ? 'root' : 'child'}`}>
                      {getDisplayName(item)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;