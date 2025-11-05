# **Simplified Theme Generator (Figma Plugin)**

## **1\. Purpose of the Plugin**

This plugin is used to create and manage color variable collections in Figma. It is loosely based on the principles of Material Design and generates a complete set of system tokens (Light & Dark Mode) based on three key colors (Primary, Secondary, Tertiary).

The main focus is a "generator-first" approach, allowing designers and developers to quickly create a robust, WCAG-checked theme and to edit and update it at a later time.

### **Key Features**

* **Dynamic Palette Generation:** Creates 10-step palettes (50-900) for 7 categories (primary, secondary, tertiary, neutral, error, success, info).  
* **Live Preview:** All changes to colors or sliders are immediately reflected in a real-time preview of the system tokens, palettes, and as code (JSON, Markdown).  
* **Fine-Tuning:**  
  * **Palette Contrast:** Controls the "spread" of the palettes (flat vs. high-contrast).  
  * **Palette Brightness:** Adjusts the global brightness of all palettes.  
  * **Surface Tint:** Subtly mixes the primary color into the surface colors.  
* **WCAG Contrast Check:** Ensures that all "On-" color tokens (e.g., on-primary) meet AA or AAA contrast standards against their background colors.  
* **Create & Update:**  
  * **Create:** Creates new Figma variable collections with Light and Dark modes.  
  * **Update:** (The core feature) Allows loading an existing collection created with this plugin, adjusting the parameters, and overwriting the values without losing the links in your designs.  
* **Helper Tools:** "Switch" and "Random" buttons for rapid iteration of key colors.  
* **Automated Descriptions:** Every created variable (e.g., accent/primary/primary-container) automatically receives a description explaining its purpose.

## **2\. Architecture: The Two-File Principle (Important for AI Development)**

To continue development (especially when working with AI tools), it is crucial to understand the plugin's architecture. The plugin is separated into two main parts:

### **A. ui.html (The "Frontend" & Brain)**

This file is a self-contained "mini-program." It contains **HTML** (structure), **CSS** (styling), and all the **JavaScript** (logic) in a single \<script\> block at the end of the file.

* **Responsibility:** **EVERYTHING the user sees and *before* it is sent to Figma.**  
* **Logic:** All color logic (palette generation, contrast checks, tinting) happens *here*.  
* **Technology:** Uses chroma.js (loaded via CDN) for all color calculations.  
* **Communication:**  
  * Sends commands to code.js via parent.postMessage(...).  
  * Receives data from code.js via window.onmessage \= ....

### **B. code.js (The "Backend" & Figma-API)**

This file runs in Figma's "sandbox" and has direct access to the Figma API. It is intentionally kept "dumb."

* **Responsibility:** **Exclusively communication with the Figma API.**  
* **Logic:** It performs *no* calculations of its own. It only accepts commands from ui.html (e.g., "Create these 50 variables with these HEX codes") and executes them.  
* **Communication:**  
  * Starts ui.html via figma.showUI(...).  
  * Receives commands from ui.html via figma.ui.onmessage \= ....  
  * Sends data (e.g., the list of existing collections) back to ui.html via figma.ui.postMessage(...).

## **3\. Development Guide (for Humans & AI)**

If you want to extend this plugin with an AI tool (like Gemini, ChatGPT, etc.), the most important instruction you must give the AI is *which file* to edit.

### **Scenario 1: "I want to change the UI..."**

*(e.g., "Add a slider for 'Saturation'" or "Change the layout")*

* **File:** ui.html  
* **What to do:**  
  1. **HTML:** Add the new HTML elements (e.g., a .slider-group block) in the \<body\>.  
  2. **CSS:** If necessary, adjust the styles in the \<style\> block.  
  3. **JavaScript:** Go to the \<script\> block at the end of the file:  
     * Get a reference to the new element (e.g., const saturationSlider \= ...).  
     * Add an event listener in init() (e.g., saturationSlider.addEventListener('input', updateAllPreviews);).  
     * Read the new value in the updateAllPreviews() function.  
     * Pass the new value to the logic functions (e.g., generateAllScales).  
* **code.js is not needed.**

### **Scenario 2: "I want to change the color logic..."**

*(e.g., "The palette generation should use a different algorithm" or "Surface Tint should be stronger")*

* **File:** ui.html  
* **What to do:**  
  1. Go to the \<script\> block.  
  2. **For Palette Calculation:** Find the generateBrandScale() and generateNeutralScale() functions. Adjust the chroma.js logic within these functions.  
  3. **For System Token Recipes:** Find the getResolvedRecipes() function.  
     * To change the mapping (e.g., primary should be palettes.primary.400 instead of 500), edit lightRecipeAliasMap and darkRecipeAliasMap.  
     * To change the tinting logic, edit the "Surface Tinting" section within getResolvedRecipes().  
* **code.js is not needed.**

### **Scenario 3: "I want to change the Figma interaction..."**

*(e.g., "The plugin should also create 'Spacing' variables" or "Change the token descriptions")*

* **File:** code.js (and probably ui.html)  
* **What to do:**  
  1. **Token Descriptions:** Directly edit the variableDescriptions object in code.js.  
  2. **New Variable Types (e.g., Spacing):**  
     * **ui.html:** Add UI elements to input the spacing values.  
     * **ui.html:** Find the generateButton.addEventListener('click', ...) block. Add the new spacing data to the payload object that is sent to parent.postMessage.  
     * **code.js:** Go to the figma.ui.onmessage handler for case 'generate-theme'.  
     * Read the new spacing data from msg.payload.  
     * In the for (const varName of variableNames) loop (or in a separate loop), create the new variables using figma.variables.createVariable(name, collection.id, 'FLOAT').  
     * Ensure this happens in both the isUpdate block and the else (Create) block.

## **4\. File Overview & Key Functions**

### **manifest.json**

* Standard Figma manifest.  
* Defines code.js as main (backend) and ui.html as ui (frontend).  
* networkAccess: Required so ui.html can load the chroma.js library from cdnjs.cloudflare.com.

### **code.js (Backend / Figma-API)**

* figma.ui.onmessage: The main controller that reacts to msg.type.  
* case 'get-collections': Fetches all variable collections and sends their names/IDs to the UI.  
* case 'load-theme-data': Reads the base colors (P, S, T) from a selected collection (incl. alias resolution) and sends them as HEX values to the UI.  
* case 'generate-theme': The most important part. Contains the if (isUpdate) logic.  
  * **Update Path:** Fetches variables via a Map (fast access) and uses variable.setValueForMode() to overwrite values.  
  * **Create Path:** Uses figma.variables.createVariableCollection(), collection.renameMode(), collection.appendMode(), and variable.setValueForMode() to create everything from scratch.  
* variableDescriptions: (Constant) Contains all the German descriptions for the Figma variables.  
* findModes(): (Helper function) Robustly finds the mode IDs for Light & Dark.

### **ui.html (Frontend / Logic-Brain)**

* \<body\>: Contains the entire HTML structure for the UI (Inputs, Sliders, Tabs, Previews).  
* \<style\>: Contains all CSS rules for the appearance.  
* \<script\>:  
  * **Global References:** Defines constants for all important DOM elements (e.g., paletteContrastSlider, pickers, hexInputs).  
  * **Constants & Recipes:** Defines lightRecipeAliasMap, darkRecipeAliasMap, onTokenBackgroundMap, etc. These are the "recipes" for the color tokens.  
  * **Helper Functions:**  
    * setPickerColor(), syncHexAndPicker(): Manage the state between the \<input type="color"\> and \<input type="text"\> fields.  
    * switchColors(), randomizeColors(): Logic for the two action buttons.  
  * **Color Logic (Core):**  
    * generateBrandScale(), generateNeutralScale(): Use chroma.js to create a 10-step palette from a base color \+ slider settings.  
    * generateAllScales(): Calls the scale generators for all 7 palettes.  
    * getResolvedRecipes(): Applies the ...AliasMap recipes to the generated palettes, performs tinting, and checks WCAG contrast.  
  * **UI-Update (Core):**  
    * updateAllPreviews(): The *most important* function in the frontend. It is called on *every* change. It reads all sliders, calls generateAllScales() and getResolvedRecipes(), and then updates all preview elements (System Tokens, Palettes Tab, JSON Tab, MD Tab).  
    * populatePalettesTab(), generateTokensJSON(), generateGuidelinesMD(): Fill the content of the respective tabs.  
  * **Initialization & Communication:**  
    * init(): Is called on startup. Sets all addEventListener for buttons, sliders, and tabs.  
    * generateButton.addEventListener('click', ...): Collects all final data (the payload object) and sends it via parent.postMessage({ type: 'generate-theme', ... }) to code.js.  
    * window.onmessage: Receives messages from code.js (e.g., collections-list, theme-data-loaded).