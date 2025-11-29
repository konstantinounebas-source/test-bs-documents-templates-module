import { CustomFieldLabel } from '@/entities/CustomFieldLabel';

let cachedLabels = null;
let lastFetch = 0;
const CACHE_DURATION = 15 * 60 * 1000; // Increase cache to 15 minutes

// Helper to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getCustomFieldLabels = async () => {
  const now = Date.now();
  if (cachedLabels && (now - lastFetch) < CACHE_DURATION) {
    return cachedLabels;
  }

  try {
    // Add delay to prevent rate limiting when fetching fresh data
    await delay(300);
    const labels = await CustomFieldLabel.list();
    const labelsMap = {};
    
    labels.forEach(label => {
      labelsMap[label.field_name] = label.label;
    });
    
    // Set defaults for missing labels
    if (!labelsMap['template_custom_field_1']) labelsMap['template_custom_field_1'] = 'Custom Field 1';
    if (!labelsMap['template_custom_field_2']) labelsMap['template_custom_field_2'] = 'Custom Field 2';
    if (!labelsMap['template_custom_field_3']) labelsMap['template_custom_field_3'] = 'Custom Field 3';
    if (!labelsMap['template_custom_field_4']) labelsMap['template_custom_field_4'] = 'Custom Field 4';
    
    cachedLabels = labelsMap;
    lastFetch = now;
    return labelsMap;
  } catch (error) {
    console.error('Error loading custom field labels:', error);
    return {
      'template_custom_field_1': 'Custom Field 1',
      'template_custom_field_2': 'Custom Field 2',
      'template_custom_field_3': 'Custom Field 3',
      'template_custom_field_4': 'Custom Field 4'
    };
  }
};

export const clearCustomFieldLabelsCache = () => {
  cachedLabels = null;
  lastFetch = 0;
};