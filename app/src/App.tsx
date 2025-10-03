import { useState, useEffect, useMemo } from 'react';
import { useCombobox, useMultipleSelection } from 'downshift';
import type { Tag } from './types';
import { 
  parseInitialValue, 
  getDisplayName, 
  createTagTree, 
  flattenTree, 
  fetchTags, 
  formatTagsForSaving 
} from './utils';
import './App.css';

function App() {
  // State management
  const [disabled, setDisabled] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [languageCodename, setLanguageCodename] = useState('default');
  const [inputValue, setInputValue] = useState('');
  // Parent tag state managed internally by fetchTags function
  const [initialCodenames, setInitialCodenames] = useState<string[]>([]);

  // Memoized calculations
  const availableTags = useMemo(
    () => allTags.filter(tag => !selectedTags.some(selected => selected.system.codename === tag.system.codename)),
    [allTags, selectedTags]
  );

  // Filter tags based on search input
  const filteredTags = useMemo(() => {
    if (!inputValue.trim()) return availableTags;
    
    return availableTags.filter(tag => {
      const displayName = getDisplayName(tag).toLowerCase();
      const searchText = inputValue.toLowerCase();
      return displayName.includes(searchText);
    });
  }, [availableTags, inputValue]);

  const flattenedTags = useMemo(() => {
    const tree = createTagTree(filteredTags);
    return flattenTree(tree);
  }, [filteredTags]);

  // Downshift hooks
  const {
    getSelectedItemProps,
    getDropdownProps,
    addSelectedItem,
    removeSelectedItem,
    selectedItems,
  } = useMultipleSelection({
    selectedItems: selectedTags,
    onStateChange({ selectedItems: newSelectedItems, type }) {
      if (type === useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem) {
        setSelectedTags(newSelectedItems || []);
      }
    },
  });

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
    inputValue,
    selectedItem: null,
    stateReducer(_state, actionAndChanges) {
      const { changes, type } = actionAndChanges;
      
      if (type === useCombobox.stateChangeTypes.InputKeyDownEnter || 
          type === useCombobox.stateChangeTypes.ItemClick) {
        return {
          ...changes,
          isOpen: true,
          highlightedIndex: 0,
          inputValue: '',
        };
      }
      return changes;
    },
    onInputValueChange({ inputValue: newInputValue }) {
      setInputValue(newInputValue || '');
    },
    onStateChange({ type, selectedItem: newSelectedItem }) {
      if ((type === useCombobox.stateChangeTypes.InputKeyDownEnter || 
           type === useCombobox.stateChangeTypes.ItemClick) && 
          newSelectedItem) {
        addSelectedItem(newSelectedItem);
        setSelectedTags([...selectedTags, newSelectedItem]);
        setInputValue(''); // Clear search after selection
      }
    },
  });

  // Effects
  useEffect(() => {
    const initCustomElement = async () => {
      if (!window.CustomElement) {
        console.error("CustomElement SDK not found.");
        return;
      }

      window.CustomElement.init(async (element, context) => {
        // Parse initial value
        if (element.value) {
          setInitialCodenames(parseInitialValue(element.value));
        }

        // Log configuration
        if (element.config?.parentTagCodename) {
          console.log(`Filtering by parent tag: ${element.config.parentTagCodename}`);
        }

        // Set language
        if (context.variant?.codename) {
          setLanguageCodename(context.variant.codename);
        }

        // Set disabled state
        setDisabled(element.disabled);

        // Set initial height
        window.CustomElement.setHeight(180);

        // Fetch tags
        const tags = await fetchTags(
          context.projectId, 
          context.variant?.codename || 'default',
          element.config?.parentTagCodename
        );
        setAllTags(tags);
      });

      window.CustomElement.onDisabledChanged(setDisabled);
    };

    initCustomElement();
  }, []);

  // Initialize selected tags when tags are loaded
  useEffect(() => {
    if (allTags.length > 0 && initialCodenames.length > 0) {
      const initialTags = allTags.filter(tag => 
        initialCodenames.includes(tag.system.codename)
      );
      setSelectedTags(initialTags);
      setInitialCodenames([]);
    }
  }, [allTags, initialCodenames]);

  // Update height when content changes
  useEffect(() => {
    const updateHeight = () => {
      if (window.CustomElement) {
        const baseHeight = 180;
        const tagRows = Math.ceil(selectedItems.length / 3);
        const tagsHeight = Math.max(40, tagRows * 40);
        const dropdownHeight = isOpen ? Math.min(160, flattenedTags.length * 44) : 0;
        const totalHeight = baseHeight + tagsHeight + dropdownHeight;
        
        window.CustomElement.setHeight(Math.min(totalHeight, 500));
      }
    };

    const timeoutId = setTimeout(updateHeight, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedItems, isOpen, flattenedTags.length]);

  // Save value when selection changes
  useEffect(() => {
    if (window.CustomElement) {
      const selectedTagsInfo = formatTagsForSaving(selectedItems);
      window.CustomElement.setValue(JSON.stringify(selectedTagsInfo));
    }
  }, [selectedItems]);

  return (
    <div className="app">
      <label {...getLabelProps()}>Select Tag(s) ({languageCodename})</label>
      <div className="autocomplete-container">
        <div className="selected-tags">
          {selectedItems.map((tag, index) => (
            <span
              key={tag.system.codename}
              {...getSelectedItemProps({ selectedItem: tag, index })}
              className="selected-tag"
            >
              {getDisplayName(tag)}
              <button
                type="button"
                className="tag-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSelectedItem(tag);
                  setSelectedTags(selectedItems.filter(item => item !== tag));
                }}
                disabled={disabled}
                aria-label={`Remove ${getDisplayName(tag)}`}
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
          <ul 
            className="suggestions-list" 
            {...getMenuProps()}
            style={{ display: isOpen ? 'block' : 'none' }}
          >
            {isOpen && flattenedTags.map((item, index) => (
              <li
                className={`suggestion-item ${
                  highlightedIndex === index ? 'highlighted' : ''
                } ${item.isRoot ? 'root-tag' : 'child-tag'}`}
                key={`${item.system.codename}-${index}`}
                style={{ paddingLeft: `${1 + item.level * 1.5}rem` }}
                {...getItemProps({ item, index })}
              >
                <span className={`tag-name ${item.isRoot ? 'root' : 'child'}`}>
                  {getDisplayName(item)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;