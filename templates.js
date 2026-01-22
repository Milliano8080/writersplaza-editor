// Professional Writing Templates for WritersPlaza Editor
// Novel, Screenplay (Professional), Playwriting

const TEMPLATES = {
  novel: {
    name: 'Novel',
    description: 'Standard prose formatting',
    fontFamily: '"Literata", serif',
    fontSize: '12pt',
    lineHeight: '2',
    marginTop: '1in',
    marginBottom: '1in',
    marginLeft: '1in',
    marginRight: '1in',
    cssClass: 'template-novel'
  },

  screenplay: {
    name: 'Screenplay',
    description: 'Professional screenplay format',
    fontFamily: '"Courier Prime Sans", monospace',
    fontSize: '12pt',
    lineHeight: '1',
    marginTop: '1in',
    marginBottom: '0.5in',
    marginLeft: '1.5in',
    marginRight: '1in',
    cssClass: 'template-screenplay',
    elements: {
      sceneHeading: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: '12pt',
        marginBottom: '0',
        textAlign: 'left'
      },
      character: {
        textTransform: 'uppercase',
        marginLeft: '2.2in',
        marginTop: '12pt',
        textAlign: 'left'
      },
      dialogue: {
        marginLeft: '1.5in',
        marginRight: '1.5in',
        textAlign: 'left'
      },
      parenthetical: {
        marginLeft: '1.8in',
        textAlign: 'left'
      },
      action: {
        marginTop: '12pt',
        textAlign: 'left'
      },
      transition: {
        textAlign: 'right',
        textTransform: 'uppercase',
        marginTop: '12pt'
      }
    }
  },

  playwriting: {
    name: 'Playwriting',
    description: 'Standard play format',
    fontFamily: '"Literata", serif',
    fontSize: '12pt',
    lineHeight: '1.5',
    marginTop: '1in',
    marginBottom: '1in',
    marginLeft: '1.5in',
    marginRight: '1in',
    cssClass: 'template-playwriting',
    elements: {
      act: {
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase',
        marginTop: '24pt',
        marginBottom: '12pt'
      },
      scene: {
        fontWeight: 'bold',
        textAlign: 'left',
        marginTop: '12pt',
        marginBottom: '12pt'
      },
      character: {
        textTransform: 'uppercase',
        marginTop: '12pt',
        textAlign: 'left'
      },
      stageDirection: {
        fontStyle: 'italic',
        textAlign: 'left',
        marginTop: '6pt'
      }
    }
  }
};

let currentTemplate = 'novel';
let sceneNumberingEnabled = false;
let currentSceneNumber = 1;

// Switch active template
function switchTemplate() {
  const selector = document.getElementById('templateSelector');
  if (!selector) {
    console.error('Template selector not found');
    return;
  }
  
  const newTemplate = selector.value;
  // Switching template
  
  // Clear editor content when switching templates
  const editor = document.getElementById('editor');
  if (!editor) {
    console.error('Editor element not found');
    return;
  }
  
  if (currentTemplate !== newTemplate && editor.innerHTML.trim() !== '') {
    if (!confirm('Save your work before switching! This will clear all current content. Continue?')) {
      // User cancelled, revert selector
      selector.value = currentTemplate;
      return;
    }
    editor.innerHTML = '';
  }
  
  currentTemplate = newTemplate;
  
  applyTemplateCSS(currentTemplate);
  updateTemplateControls(currentTemplate);
  
  // Save preference
  localStorage.setItem('currentTemplate', currentTemplate);
  
  if (typeof showToast === 'function') {
    showToast(`Switched to ${TEMPLATES[currentTemplate].name} template`);
  } else {
    // Template switched
  }
}

// Apply template CSS to editor
function applyTemplateCSS(templateId) {
  const template = TEMPLATES[templateId];
  const editor = document.getElementById('editor');
  if (!editor) {
    console.error('Cannot apply template CSS: editor not found');
    return;
  }

  // Applying template CSS
  
  // Remove all template classes
  editor.classList.remove('template-novel', 'template-screenplay', 'template-playwriting');
  editor.classList.add(template.cssClass);

  // Apply font and spacing
  editor.style.fontFamily = template.fontFamily;
  editor.style.fontSize = template.fontSize;
  editor.style.lineHeight = template.lineHeight;
  
  // Apply margins/padding directly to editor
  editor.style.paddingTop = template.marginTop;
  editor.style.paddingBottom = template.marginBottom;
  editor.style.paddingLeft = template.marginLeft;
  editor.style.paddingRight = template.marginRight;
}

// Update visible controls based on template
function updateTemplateControls(templateId) {
  // Updating template controls
  
  const novelControls = document.getElementById('novelControls');
  const screenplayControls = document.getElementById('screenplayControls');
  const playwritingControls = document.getElementById('playwritingControls');
  const novelMatterControls = document.getElementById('novelMatterControls');
  
  if (novelControls) {
    novelControls.style.display = templateId === 'novel' ? 'block' : 'none';
  }
  if (screenplayControls) {
    screenplayControls.style.display = templateId === 'screenplay' ? 'block' : 'none';
  }
  if (playwritingControls) {
    playwritingControls.style.display = templateId === 'playwriting' ? 'block' : 'none';
  }
  if (novelMatterControls) {
    novelMatterControls.style.display = templateId === 'novel' ? 'block' : 'none';
  }
}

// Screenplay: Insert element
function insertScreenplayElement(type) {
  const editor = document.getElementById('editor');
  if (!editor) {
    console.error('Editor not found for screenplay element insertion');
    return;
  }
  
  const selection = window.getSelection();
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  
  if (!range) {
    console.warn('No selection range, creating one at the end of editor');
    const newRange = document.createRange();
    newRange.selectNodeContents(editor);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return insertScreenplayElement(type); // Retry with new range
  }
  
  let element;
  
  switch(type) {
    case 'titlepage':
      element = document.createElement('div');
      element.setAttribute('data-element', 'titlepage');
      element.style.cssText = 'text-align: center; margin-top: 3in; margin-bottom: 2in; page-break-after: always;';
      element.innerHTML = `
        <p style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 24pt;">SCREENPLAY TITLE</p>
        <p style="margin-bottom: 12pt;">Written by</p>
        <p style="font-weight: bold; margin-bottom: 48pt;">Author Name</p>
        <p style="position: absolute; bottom: 1in; left: 1.5in; text-align: left; font-size: 10pt;">
          Contact Information<br>
          Address<br>
          Phone<br>
          Email
        </p>
      `;
      break;
      
    case 'outline':
      element = document.createElement('div');
      element.setAttribute('data-element', 'outline');
      element.style.cssText = 'margin-bottom: 24pt; page-break-after: always;';
      element.innerHTML = `
        <p style="font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 12pt;">SCENE OUTLINE</p>
        <p style="margin-bottom: 6pt;">Scene 1: INT. LOCATION - DAY</p>
        <p style="margin-left: 0.5in; margin-bottom: 12pt;">Brief description of what happens in this scene...</p>
        <p style="margin-bottom: 6pt;">Scene 2: EXT. LOCATION - NIGHT</p>
        <p style="margin-left: 0.5in; margin-bottom: 12pt;">Brief description of what happens in this scene...</p>
      `;
      break;
      
    case 'scene':
      element = document.createElement('p');
      element.setAttribute('data-element', 'scene');
      element.style.cssText = 'font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 0; text-align: left;';
      element.textContent = '';
      if (sceneNumberingEnabled) {
        const sceneNum = document.createElement('span');
        sceneNum.style.cssText = 'margin-right: 20px;';
        sceneNum.textContent = currentSceneNumber + '. ';
        element.insertBefore(sceneNum, element.firstChild);
        currentSceneNumber++;
      }
      break;
      
    case 'general':
      element = document.createElement('p');
      element.setAttribute('data-element', 'general');
      element.style.cssText = 'margin-top: 12pt;';
      element.textContent = '';
      break;
      
    case 'character':
      element = document.createElement('p');
      element.setAttribute('data-element', 'character');
      element.style.cssText = 'text-align: center; margin-top: 12pt; text-transform: uppercase;';
      element.textContent = '';
      break;
      
    case 'dialogue':
      element = document.createElement('p');
      element.setAttribute('data-element', 'dialogue');
      element.style.cssText = 'margin-left: 1.5in; margin-right: 1.5in;';
      element.textContent = '';
      break;
      
    case 'parenthetical':
      element = document.createElement('p');
      element.setAttribute('data-element', 'parenthetical');
      element.style.cssText = 'margin-left: 1.8in;';
      element.textContent = '';
      break;
      
    case 'action':
      element = document.createElement('p');
      element.setAttribute('data-element', 'action');
      element.style.cssText = 'margin-top: 12pt;';
      element.textContent = '';
      break;
      
    case 'transition':
      element = document.createElement('p');
      element.setAttribute('data-element', 'transition');
      element.style.cssText = 'text-align: right; margin-top: 12pt; text-transform: uppercase;';
      element.textContent = '';
      break;
  }
  
  if (!element) {
    console.error('No element created for type:', type);
    return;
  }
  
  if (!range) {
    console.error('No valid range available');
    return;
  }
  
  try {
    range.insertNode(element);
    range.setStartAfter(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Focus and select text for easy editing
    const textNode = element.firstChild;
    if (textNode) {
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Screenplay element inserted successfully
  } catch (error) {
    console.error('Error inserting screenplay element:', error);
  }
}

// Playwriting: Insert element
function insertPlaywritingElement(type) {
  const editor = document.getElementById('editor');
  if (!editor) {
    console.error('Editor not found for playwriting element insertion');
    return;
  }
  
  const selection = window.getSelection();
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  
  if (!range) {
    console.warn('No selection range, creating one at the end of editor');
    const newRange = document.createRange();
    newRange.selectNodeContents(editor);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return insertPlaywritingElement(type); // Retry with new range
  }
  
  let element;
  
  switch(type) {
    case 'act':
      element = document.createElement('p');
      element.setAttribute('data-element', 'act');
      element.style.cssText = 'font-weight: bold; text-align: center; text-transform: uppercase; margin-top: 24pt; margin-bottom: 12pt;';
      element.textContent = 'ACT I';
      break;
      
    case 'scene':
      element = document.createElement('p');
      element.setAttribute('data-element', 'scene');
      element.style.cssText = 'font-weight: bold; margin-top: 12pt; margin-bottom: 12pt;';
      element.textContent = 'Scene 1';
      break;
      
    case 'character':
      element = document.createElement('p');
      element.setAttribute('data-element', 'character');
      element.style.cssText = 'text-transform: uppercase; margin-top: 12pt;';
      element.textContent = 'JANE: ';
      break;
      
    case 'stage':
      element = document.createElement('p');
      element.setAttribute('data-element', 'stage');
      element.style.cssText = 'font-style: italic; margin-top: 6pt;';
      element.textContent = '[Stage direction in italics]';
      break;
  }
  
  if (!element) {
    console.error('No element created for type:', type);
    return;
  }
  
  try {
    range.insertNode(element);
    range.setStartAfter(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Focus and select text for easy editing
    const textNode = element.firstChild;
    if (textNode) {
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Playwriting element inserted successfully
  } catch (error) {
    console.error('Error inserting playwriting element:', error);
  }
}

// Toggle scene numbering for screenplay
function toggleSceneNumbering() {
  const checkbox = document.getElementById('sceneNumbering');
  sceneNumberingEnabled = checkbox ? checkbox.checked : false;
  localStorage.setItem('sceneNumberingEnabled', sceneNumberingEnabled);
  
  if (!sceneNumberingEnabled) {
    currentSceneNumber = 1;
  }
}

// Initialize template on page load
function initializeTemplate(templateId) {
  // Wait for DOM if editor not ready
  const editor = document.getElementById('editor');
  if (!editor) {
    console.warn('Editor not ready, delaying template initialization');
    setTimeout(() => initializeTemplate(templateId), 100);
    return;
  }
  
  if (!templateId) {
    templateId = localStorage.getItem('currentTemplate') || 'novel';
  }
  
  currentTemplate = templateId;
  
  const selector = document.getElementById('templateSelector');
  if (selector) {
    selector.value = templateId;
  }
  
  applyTemplateCSS(templateId);
  updateTemplateControls(templateId);
  
  // Restore scene numbering preference
  const savedSceneNumbering = localStorage.getItem('sceneNumberingEnabled');
  if (savedSceneNumbering) {
    sceneNumberingEnabled = savedSceneNumbering === 'true';
    const checkbox = document.getElementById('sceneNumbering');
    if (checkbox) checkbox.checked = sceneNumberingEnabled;
  }
  
  // Template initialized
}
