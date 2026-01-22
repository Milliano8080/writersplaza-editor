// ============================================
// AUTOMATIC SCREENPLAY FORMATTING SYSTEM
// ============================================

let screenplayAutoFormat = {
  enabled: false,
  currentElementType: 'action', // action, scene, character, dialogue, parenthetical, transition
  lastLineWasCharacter: false,
  suppressNextFormat: false
};

// Initialize auto-formatting when screenplay template is active
function initScreenplayAutoFormat() {
  const editor = document.getElementById('editor');
  if (!editor) return;
  
  // Add event listeners for auto-formatting
  editor.addEventListener('keydown', handleScreenplayKeydown);
  editor.addEventListener('input', handleScreenplayInput);
  
  screenplayAutoFormat.enabled = true;
}

// Disable auto-formatting
function disableScreenplayAutoFormat() {
  const editor = document.getElementById('editor');
  if (!editor) return;
  
  editor.removeEventListener('keydown', handleScreenplayKeydown);
  editor.removeEventListener('input', handleScreenplayInput);
  
  screenplayAutoFormat.enabled = false;
}

// Handle keydown events for auto-formatting
function handleScreenplayKeydown(e) {
  if (!screenplayAutoFormat.enabled) return;
  
  const editor = document.getElementById('editor');
  const selection = window.getSelection();
  
  // Handle Enter key
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleScreenplayEnter(editor, selection);
    return;
  }
  
  // Handle Tab key - cycle through element types
  if (e.key === 'Tab') {
    e.preventDefault();
    cycleScreenplayElement(editor, selection);
    return;
  }
}

// Handle input events for pattern detection
function handleScreenplayInput(e) {
  if (!screenplayAutoFormat.enabled) return;
  if (screenplayAutoFormat.suppressNextFormat) {
    screenplayAutoFormat.suppressNextFormat = false;
    return;
  }
  
  const editor = document.getElementById('editor');
  const selection = window.getSelection();
  
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const currentParagraph = getCurrentParagraph(range.startContainer);
  
  if (!currentParagraph) return;
  
  const text = currentParagraph.textContent.trim();
  
  // Detect element type based on content
  detectAndFormatElement(currentParagraph, text);
}

// Get current paragraph element
function getCurrentParagraph(node) {
  while (node && node.nodeType !== 1) {
    node = node.parentNode;
  }
  
  while (node && node.tagName !== 'P' && node.tagName !== 'DIV') {
    node = node.parentNode;
  }
  
  return node && node.id !== 'editor' ? node : null;
}

// Detect element type and apply formatting
function detectAndFormatElement(paragraph, text) {
  if (!text) return;
  
  // Scene Heading: INT./EXT. pattern
  if (text.match(/^(INT\.|EXT\.|INT\/EXT|I\/E)/i)) {
    applyScreenplayStyle(paragraph, 'scene');
    screenplayAutoFormat.currentElementType = 'scene';
    screenplayAutoFormat.lastLineWasCharacter = false;
    return;
  }
  
  // Transition: CUT TO:, FADE IN:, etc. (right-aligned, ends with colon)
  if (text.match(/^(CUT TO|FADE IN|FADE OUT|DISSOLVE TO|SMASH CUT|MATCH CUT):$/i)) {
    applyScreenplayStyle(paragraph, 'transition');
    screenplayAutoFormat.currentElementType = 'transition';
    screenplayAutoFormat.lastLineWasCharacter = false;
    return;
  }
  
  // Character Name: ALL CAPS, short length
  if (text === text.toUpperCase() && 
      text.length > 1 && 
      text.length < 40 && 
      !text.match(/^(INT\.|EXT\.|FADE|CUT|DISSOLVE|CONTINUED)/i) &&
      text.match(/^[A-Z\s\.]+$/) &&
      !text.includes('  ')) {
    applyScreenplayStyle(paragraph, 'character');
    screenplayAutoFormat.currentElementType = 'character';
    screenplayAutoFormat.lastLineWasCharacter = true;
    return;
  }
  
  // Parenthetical: (beat), (angry), etc.
  if (text.startsWith('(') && text.endsWith(')') && text.length < 50) {
    applyScreenplayStyle(paragraph, 'parenthetical');
    screenplayAutoFormat.currentElementType = 'parenthetical';
    return;
  }
  
  // Dialogue: comes after character or parenthetical
  if (screenplayAutoFormat.lastLineWasCharacter || 
      screenplayAutoFormat.currentElementType === 'dialogue' ||
      screenplayAutoFormat.currentElementType === 'parenthetical') {
    applyScreenplayStyle(paragraph, 'dialogue');
    screenplayAutoFormat.currentElementType = 'dialogue';
    return;
  }
  
  // Default: Action/Description
  applyScreenplayStyle(paragraph, 'action');
  screenplayAutoFormat.currentElementType = 'action';
  screenplayAutoFormat.lastLineWasCharacter = false;
}

// Apply screenplay formatting styles
function applyScreenplayStyle(paragraph, type) {
  // Remove all screenplay classes
  paragraph.className = paragraph.className.replace(/screenplay-\w+/g, '').trim();
  
  // Apply new class
  paragraph.classList.add(`screenplay-${type}`);
  
  // Apply inline styles for immediate effect
  switch(type) {
    case 'scene':
      // Scene heading: uppercase, bold, left-aligned
      paragraph.style.cssText = 'text-transform: uppercase; font-weight: bold; margin: 1em 0 0.5em 0; padding-left: 0; text-align: left; font-family: "Courier Prime", monospace;';
      break;
      
    case 'character':
      // Character name: uppercase, centered at 3.5"
      paragraph.style.cssText = 'text-transform: uppercase; margin: 1em 0 0.3em 0; padding-left: 3.5in; font-weight: bold; font-family: "Courier Prime", monospace;';
      break;
      
    case 'dialogue':
      // Dialogue: indented 2.5" from both sides
      paragraph.style.cssText = 'margin: 0 0 0.5em 0; padding-left: 2.5in; padding-right: 2.5in; text-transform: none; font-family: "Courier Prime", monospace;';
      break;
      
    case 'parenthetical':
      // Parenthetical: indented 3", italic
      paragraph.style.cssText = 'margin: 0.2em 0 0.5em 0; padding-left: 3in; padding-right: 2.5in; font-style: italic; text-transform: none; font-family: "Courier Prime", monospace;';
      break;
      
    case 'transition':
      // Transition: right-aligned, uppercase
      paragraph.style.cssText = 'text-transform: uppercase; text-align: right; margin: 1em 0; font-weight: bold; padding-right: 0; font-family: "Courier Prime", monospace;';
      break;
      
    case 'action':
    default:
      // Action/Description: full width, normal
      paragraph.style.cssText = 'margin: 0.5em 0; padding-left: 0; padding-right: 0; text-align: left; text-transform: none; font-family: "Courier Prime", monospace;';
      break;
  }
}

// Handle Enter key press
function handleScreenplayEnter(editor, selection) {
  const range = selection.getRangeAt(0);
  const currentParagraph = getCurrentParagraph(range.startContainer);
  
  // Create new paragraph
  const newParagraph = document.createElement('p');
  newParagraph.innerHTML = '<br>'; // Empty paragraph
  
  // Determine next element type based on current
  let nextType = 'action';
  
  if (currentParagraph) {
    const currentType = screenplayAutoFormat.currentElementType;
    
    switch(currentType) {
      case 'scene':
        nextType = 'action';
        screenplayAutoFormat.lastLineWasCharacter = false;
        break;
        
      case 'character':
        nextType = 'dialogue';
        screenplayAutoFormat.lastLineWasCharacter = true;
        break;
        
      case 'dialogue':
      case 'parenthetical':
        // Check if we should continue dialogue or go to action
        if (currentParagraph.textContent.trim()) {
          nextType = 'action';
          screenplayAutoFormat.lastLineWasCharacter = false;
        } else {
          nextType = 'dialogue';
        }
        break;
        
      case 'transition':
        nextType = 'scene';
        screenplayAutoFormat.lastLineWasCharacter = false;
        break;
        
      case 'action':
      default:
        nextType = 'action';
        screenplayAutoFormat.lastLineWasCharacter = false;
        break;
    }
  }
  
  // Apply default styling for next element
  applyScreenplayStyle(newParagraph, nextType);
  screenplayAutoFormat.currentElementType = nextType;
  
  // Insert new paragraph
  if (currentParagraph) {
    currentParagraph.parentNode.insertBefore(newParagraph, currentParagraph.nextSibling);
  } else {
    editor.appendChild(newParagraph);
  }
  
  // Move cursor to new paragraph
  const newRange = document.createRange();
  newRange.setStart(newParagraph, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
  
  // Suppress next format trigger
  screenplayAutoFormat.suppressNextFormat = true;
  
  // Scroll into view
  newParagraph.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Cycle through element types with Tab key
function cycleScreenplayElement(editor, selection) {
  const range = selection.getRangeAt(0);
  const currentParagraph = getCurrentParagraph(range.startContainer);
  
  if (!currentParagraph) return;
  
  const currentType = screenplayAutoFormat.currentElementType;
  
  // Cycle order: scene -> action -> character -> dialogue -> parenthetical -> transition -> scene
  const cycleOrder = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
  const currentIndex = cycleOrder.indexOf(currentType);
  const nextIndex = (currentIndex + 1) % cycleOrder.length;
  const nextType = cycleOrder[nextIndex];
  
  // Apply new style
  applyScreenplayStyle(currentParagraph, nextType);
  screenplayAutoFormat.currentElementType = nextType;
  
  // Update last line was character flag
  if (nextType === 'character') {
    screenplayAutoFormat.lastLineWasCharacter = true;
  } else if (nextType !== 'dialogue' && nextType !== 'parenthetical') {
    screenplayAutoFormat.lastLineWasCharacter = false;
  }
  
  // Suppress next format trigger
  screenplayAutoFormat.suppressNextFormat = true;
}
