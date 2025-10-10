import { createDeliveryClient } from '@kontent-ai/delivery-sdk';
import type { Tag, TreeTag, SavedTagInfo, TagPickerMode } from './types';

/**
 * Parses the initial value from Kontent.ai to extract tag codenames
 * Supports both old format (array of strings) and new format (array of objects)
 * 
 * @param value - JSON string value from Kontent.ai
 * @returns Array of tag codenames
 */
export const parseInitialValue = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].codename
        ? parsed.map(tag => tag.codename)
        : parsed;
    }
  } catch {
    return [value];
  }
  return [];
};

/**
 * Gets the display name for a tag, combining system name with element name when different
 * 
 * @param tag - The tag item to get the display name for
 * @returns Formatted display name
 */
export const getDisplayName = (tag: Tag): string => {
  const elementName = tag.elements.name.value;
  const systemName = tag.system.name;
  
  return elementName && elementName.trim() !== systemName.trim()
    ? `${systemName} - ${elementName}`
    : elementName || systemName;
};

/**
 * Creates a hierarchical tree structure from a flat array of tags
 * 
 * @param tags - Array of tag items from Kontent.ai
 * @returns Tree structure with parent-child relationships
 */
export const createTagTree = (tags: Tag[]): TreeTag[] => {
  const tagMap = new Map<string, TreeTag>();
  
  // Initialize nodes
  tags.forEach(tag => {
    tagMap.set(tag.system.codename, {
      ...tag,
      children: [],
      level: 0,
      isRoot: true
    });
  });

  const rootTags: TreeTag[] = [];

  // Build hierarchy
  tags.forEach(tag => {
    const node = tagMap.get(tag.system.codename)!;
    const parents = tag.elements.parent_tag?.value || [];
    
    if (parents.length === 0) {
      rootTags.push(node);
    } else {
      const parentCodename = parents.find(p => tagMap.has(p));
      if (parentCodename) {
        const parentNode = tagMap.get(parentCodename)!;
        parentNode.children.push(node);
        node.level = parentNode.level + 1;
        node.isRoot = false;
      } else {
        rootTags.push(node);
      }
    }
  });

  return rootTags;
};

/**
 * Flattens a hierarchical tree into a linear array for dropdown display
 * Maintains hierarchical order with proper nesting
 * 
 * @param nodes - Tree structure of tags with children
 * @returns Flattened array maintaining hierarchical order
 */
export const flattenTree = (nodes: TreeTag[]): TreeTag[] => {
  const result: TreeTag[] = [];
  const flatten = (node: TreeTag) => {
    result.push(node);
    node.children.forEach(flatten);
  };
  nodes.forEach(flatten);
  return result;
};

/**
 * Fetches tags from Kontent.ai using the Delivery SDK
 * Optionally filters by parent tag hierarchy
 * 
 * @param projectId - Kontent.ai project/environment ID
 * @param languageCode - Language variant codename
 * @param parentFilter - Optional parent tag codename to filter descendants
 * @returns Promise resolving to array of tags
 */
export const fetchTags = async (
  projectId: string, 
  languageCode: string, 
  parentFilter?: string
): Promise<Tag[]> => {
  try {
    console.log(`Fetching tags for language: ${languageCode}`);
    
    const client = createDeliveryClient({
      environmentId: projectId
    });

    const response = await client
      .items<Tag>()
      .type('_tag')
      .languageParameter(languageCode)
      .toPromise();
    
    console.log(`Fetched ${response.data.items.length} tags`);
    
    if (parentFilter) {
      // Filter by parent tag hierarchy
      const allTags = response.data.items;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tagMap = new Map<string, Tag & { children: any[] }>();
      
      // Initialize map
      allTags.forEach(tag => {
        tagMap.set(tag.system.codename, { ...tag, children: [] });
      });
      
      // Build hierarchy
      allTags.forEach(tag => {
        const parents = tag.elements.parent_tag?.value || [];
        const currentNode = tagMap.get(tag.system.codename);
        
        parents.forEach((parentCodename: string) => {
          const parentNode = tagMap.get(parentCodename);
          if (parentNode && currentNode) {
            parentNode.children.push(currentNode);
          }
        });
      });
      
      // Get descendants of parent tag
      const rootNode = tagMap.get(parentFilter);
      if (rootNode) {
        const getDescendants = (node: typeof rootNode): Tag[] => {
          let descendants: Tag[] = [node];
          for (const child of node.children) {
            descendants = [...descendants, ...getDescendants(child)];
          }
          return descendants;
        };
        return getDescendants(rootNode);
      }
      return [];
    }
    
    return response.data.items;
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
};

/**
 * Converts selected tags to the enhanced saved format
 * 
 * @param tags - Array of selected tag objects
 * @returns Array of structured tag information for saving
 */
export const formatTagsForSaving = (tags: Tag[]): SavedTagInfo[] => {
  return tags.map(tag => ({
    codename: tag.system.codename,
    name: tag.system.name,
    displayName: tag.elements.name.value || tag.system.name,
    id: tag.system.id,
    parentTags: tag.elements.parent_tag?.value || []
  }));
};

/**
 * Parses comma-separated list of tag codenames from configuration
 * 
 * @param specificTagCodenames - Comma-separated string of tag codenames
 * @returns Array of trimmed codename strings
 */
export const parseSpecificTagCodenames = (specificTagCodenames: string): string[] => {
  if (!specificTagCodenames || typeof specificTagCodenames !== 'string') {
    return [];
  }
  
  return specificTagCodenames
    .split(',')
    .map(codename => codename.trim())
    .filter(codename => codename.length > 0);
};

/**
 * Determines the operation mode based on the provided configuration
 * 
 * @param config - Custom element configuration object
 * @returns The determined TagPickerMode
 */
export const determineTagPickerMode = (config?: { parentTagCodename?: string; specificTagCodenames?: string }): TagPickerMode => {
  if (config?.specificTagCodenames) {
    return 'specific-tags';
  }
  if (config?.parentTagCodename) {
    return 'parent-filtered';
  }
  return 'all-tags';
};

/**
 * Fetches specific tags by their codenames from Kontent.ai
 * 
 * @param projectId - Kontent.ai project/environment ID
 * @param languageCode - Language variant codename
 * @param tagCodenames - Array of specific tag codenames to fetch
 * @returns Promise resolving to array of matching tags
 */
export const fetchSpecificTags = async (
  projectId: string, 
  languageCode: string, 
  tagCodenames: string[]
): Promise<Tag[]> => {
  try {
    console.log(`Fetching specific tags: ${tagCodenames.join(', ')} for language: ${languageCode}`);
    
    const client = createDeliveryClient({
      environmentId: projectId
    });

    // Fetch tags with codename filter
    const response = await client
      .items<Tag>()
      .type('_tag')
      .languageParameter(languageCode)
      .inFilter('system.codename', tagCodenames)
      .toPromise();
    
    const foundTags = response.data.items;
    console.log(`Found ${foundTags.length} out of ${tagCodenames.length} requested tags`);
    
    // Log any missing tags
    const foundCodenames = foundTags.map(tag => tag.system.codename);
    const missingCodenames = tagCodenames.filter(codename => !foundCodenames.includes(codename));
    if (missingCodenames.length > 0) {
      console.warn(`Tags not found: ${missingCodenames.join(', ')}`);
    }
    
    return foundTags;
  } catch (error) {
    console.error("Error fetching specific tags:", error);
    return [];
  }
};