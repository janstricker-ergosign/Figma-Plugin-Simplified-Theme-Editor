// --- Show the UI ---
// Startet das Plugin und zeigt die Benutzeroberfläche (definiert in ui.html)
// mit einer festgelegten Fenstergröße an.
figma.showUI(__html__, { width: 860, height: 1000, title: "Simplified Theme Generator" });

// --- Helper Functions ---
// Diese Funktionen sind kleine Werkzeuge, die wir immer wieder brauchen.

/**
 * Wandelt ein Figma RGBA-Farbobjekt (Werte von 0 bis 1) in einen HEX-String um (z.B. #FFFFFF).
 * @param {object} { r, g, b } - Ein Objekt mit Rot-, Grün- und Blauwerten (Alpha wird ignoriert).
 * @returns {string} Ein 6-stelliger HEX-Farbcode.
 */
function rgbaToHex({ r, g, b }) {
  const toHex = (c) => {
    // Wandelt einen 0-1-Wert in einen 0-255-Wert um, dann in einen Hexadezimal-String.
    const hex = Math.round(c * 255).toString(16);
    // Stellt sicher, dass der String zweistellig ist (z.B. "F" wird zu "0F").
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Wandelt einen HEX-String (z.B. #FFF oder #FFFFFF) in ein Figma RGBA-Farbobjekt um.
 * @param {string} hex - Der HEX-Farbcode.
 * @returns {object} Ein Figma RGBA-Objekt (Werte 0-1, a: 1).
 */
function hexToRgba(hex) {
  // Erweitert Kurzformen (z.B. #F0C zu #FF00CC)
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    result = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i.exec(hex);
    if (result) {
      result[1] = result[1] + result[1];
      result[2] = result[2] + result[2];
      result[3] = result[3] + result[3];
    } else {
      // Fallback bei ungültigem Hex-Code
      console.warn("Invalid hex for hexToRgba:", hex);
      return { r: 0, g: 0, b: 0, a: 1 }; // Schwarz
    }
  }
  try {
    // Wandelt die Hex-Werte (0-255) zurück in 0-1-Werte für Figma.
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
      a: 1, // Standard-Alpha ist 1 (opak)
    };
  } catch (e) {
     console.error("Error parsing hex in hexToRgba:", hex, e);
     return { r: 0, g: 0, b: 0, a: 1 }; // Schwarz
  }
}

/**
 * Nimmt einen Wert aus der UI (der ein HEX-String sein *sollte*)
 * und stellt sicher, dass er in das Figma RGBA-Format umgewandelt wird.
 * @param {string | object} value - Der Farbwert aus der UI.
 * @param {string} varNameForLogging - (Optional) Der Name der Variable für bessere Fehlermeldungen.
 * @returns {object} Ein Figma RGBA-Objekt.
 */
function convertUiValueToFigmaRgba(value, varNameForLogging = "unknown") {
    if (typeof value === 'string') {
        // Der Normalfall: Wert ist ein HEX-String
        return hexToRgba(value);
    }
    if (typeof value === 'object' && value !== null && value.hasOwnProperty('r')) {
        // Falls der Wert bereits ein RGBA-Objekt ist, wird er einfach durchgereicht.
        return { r: value.r, g: value.g, b: value.b, a: value.a !== undefined ? value.a : 1 };
    }
    // Fallback, wenn der Wert ein unerwartetes Format hat
    console.warn(`Unexpected value type for ${varNameForLogging}, using fallback:`, JSON.stringify(value));
    return { r: 0, g: 0, b: 0, a: 1 }; // Schwarz
}

// --- Description Map ---
// Dies ist eine "Datenbank" für alle Token-Beschreibungen.
// Beim Erstellen oder Aktualisieren einer Variable wird der entsprechende Text
// in das "Description"-Feld der Figma-Variable geschrieben.
const variableDescriptions = {
  'accent/primary/primary': "Die primäre Markenfarbe, verwendet für interaktive Hauptelemente (z.B. Buttons, aktive Status).",
  'accent/primary/on-primary': "Text und Symbole, die auf der 'primary'-Farbe platziert werden.",
  'accent/primary/primary-container': "Eine abgetönte Container-Farbe, die sich von der 'primary'-Farbe ableitet (z.B. für Banner, hervorgehobene Bereiche).",
  'accent/primary/on-primary-container': "Text und Symbole, die auf der 'primary-container'-Farbe platziert werden.",
  'accent/secondary/secondary': "Eine Akzentfarbe für weniger prominente Komponenten, die dennoch Aufmerksamkeit erfordern (z.B. Filter-Chips, sekundäre Buttons).",
  'accent/secondary/on-secondary': "Text und Symbole, die auf der 'secondary'-Farbe platziert werden.",
  'accent/secondary/secondary-container': "Eine abgetönte Container-Farbe, die sich von der 'secondary'-Farbe ableitet.",
  'accent/secondary/on-secondary-container': "Text und Symbole, die auf der 'secondary-container'-Farbe platziert werden.",
  'accent/tertiary/tertiary': "Eine Tertiärfarbe für Akzente mit geringerer Priorität.",
  'accent/tertiary/on-tertiary': "Text/Symbole auf 'tertiary'.",
  'accent/tertiary/tertiary-container': "Ein Container mit 'tertiary'-Tönung.",
  'accent/tertiary/on-tertiary-container': "Text/Symbole auf 'tertiary-container'.",
  'base/surface/surface-lowest': "Die unterste Oberflächenebene, typischerweise der Haupt-Hintergrund der Seite.",
  'base/surface/surface': "Die Standard-Oberflächenfarbe für Komponenten wie Karten (Cards), Dialoge und Menüs.",
  'base/surface/surface-variant': "Eine Oberflächenfarbe mit leichter Betonung, oft für Hintergründe von z.B. Eingabefeldern oder als subtile Variante zur 'surface'.",
  'base/surface/on-surface': "Die primäre Farbe für Text und Symbole auf allen 'surface'-Farben.",
  'base/surface/on-surface-variant': "Eine gedämpfte Farbe für Text und Symbole, z.B. für sekundären Text, Platzhalter oder deaktivierte Zustände.",
  'base/other/outline': "Die Standard-Rahmenfarbe für Komponenten, die eine visuelle Abgrenzung benötigen (z.B. Eingabefelder, Buttons im 'outlined'-Stil).",
  'base/other/outline-variant': "Eine subtile Rahmenfarbe für dekorative Abgrenzungen (z.B. Trennlinien/Dividers).",
  'base/other/shadow': "Farbe, die für Schlagschatten verwendet wird, um eine Elevationsebene darzustellen.",
  'base/other/overlay': "Farbe für den Overlay-Hintergrund, der den Rest der UI abdunkelt, wenn ein modales Fenster oder Drawer geöffnet ist.",
  'feedback/error/error': "Die Farbe zur Signalisierung von Fehlerzuständen.",
  'feedback/error/on-error': "Text und Symbole, die auf der 'error'-Farbe platziert werden.",
  'feedback/error/error-container': "Eine abgetönte Container-Farbe für Fehlerhinweise (z.B. Hintergrund eines Fehler-Banners).",
  'feedback/error/on-error-container': "Text und Symbole, die auf der 'error-container'-Farbe platziert werden.",
  'feedback/success/success': "Die Farbe zur Signalisierung von Erfolgszuständen.",
  'feedback/success/on-success': "Text und Symbole, die auf der 'success'-Farbe platziert werden.",
  'feedback/success/success-container': "Eine abgetönte Container-Farbe für Erfolgshinweise.",
  'feedback/success/on-success-container': "Text und Symbole, die auf der 'success-container'-Farbe platziert werden.",
  'feedback/info/info': "Die Farbe zur Signalisierung von informativen Hinweisen.",
  'feedback/info/on-info': "Text und Symbole, die auf der 'info'-Farbe platziert werden.",
  'feedback/info/info-container': "Eine abgetönte Container-Farbe für informative Hinweise.",
  'feedback/info/on-info-container': "Text und Symbole, die auf der 'info-container'-Farbe platziert werden."
};


/**
 * Eine robuste Hilfsfunktion, um die Mode-IDs für 'Light' und 'Dark' zu finden.
 * Sie ist 'robust', weil sie mehrere Strategien versucht:
 * 1. Sie sucht nach exakten Treffern (z.B. "MyTheme/Light").
 * 2. Wenn das fehlschlägt, sucht sie nach Suffixen (z.B. irgendein Modus, der auf "/Light" endet).
 * 3. Wenn das fehlschlägt, nimmt sie einfach die ersten beiden Modi in der Sammlung.
 * @param {VariableCollection} collection - Die Figma Variablen-Sammlung.
 * @param {string} themeName - Der erwartete Themename aus der UI.
 * @returns {object} Ein Objekt mit { lightModeId, darkModeId }.
 */
function findModes(collection, themeName) {
    // 1. Versuche, exakte Übereinstimmungen zu finden
    const exactLightMode = collection.modes.find(m => m.name === `${themeName}/Light`);
    const exactDarkMode = collection.modes.find(m => m.name === `${themeName}/Dark`);

    // 2. Versuche, Fallback-Übereinstimmungen basierend auf dem Suffix zu finden
    const fallbackLightMode = collection.modes.find(m => m.name.endsWith('/Light'));
    const fallbackDarkMode = collection.modes.find(m => m.name.endsWith('/Dark'));

    // 3. Nimm die ersten beiden Modi als letzten Ausweg
    const firstMode = collection.modes.length > 0 ? collection.modes[0] : null;
    const secondMode = collection.modes.length > 1 ? collection.modes[1] : null;

    // Wähle die beste verfügbare Option
    const lightMode = exactLightMode || fallbackLightMode || firstMode;
    const darkMode = exactDarkMode || fallbackDarkMode || secondMode;
    
    if (!lightMode || !darkMode) {
        throw new Error(`Could not determine Light and Dark modes for collection "${collection.name}".`);
    }
    
    // Sicherheitsprüfung: Stelle sicher, dass wir nicht denselben Modus für beide haben,
    // es sei denn, es gibt nur einen Modus (was ein Fehler wäre).
    if (lightMode.modeId === darkMode.modeId && collection.modes.length < 2) {
         throw new Error(`Collection "${collection.name}" only has one mode. Cannot update Light and Dark.`);
    }
    
    // Wenn Light und Dark (durch einen Fehler) auf denselben Modus zeigen, aber ein zweiter Modus existiert,
    // nimm den zweiten Modus für Dark.
    if (lightMode.modeId === darkMode.modeId) {
        return { lightModeId: lightMode.modeId, darkModeId: secondMode.modeId };
    }

    return { lightModeId: lightMode.modeId, darkModeId: darkMode.modeId };
}


// --- Main Plugin Logic ---

/**
 * Dies ist der Haupt-Event-Listener. Er 'lauscht' auf alle Nachrichten,
 * die von der UI (ui.html, über `parent.postMessage`) gesendet werden.
 */
figma.ui.onmessage = async (msg) => {

  // --- Get Collections Handler ---
  // BEFEHL: 'get-collections'
  // Holt alle lokalen Variablen-Sammlungen, um sie im 'Import'-Dropdown in der UI anzuzeigen.
  if (msg.type === 'get-collections') {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      // Wir senden nur die ID und den Namen an die UI, mehr braucht sie nicht.
      const collectionData = collections.map(col => ({ id: col.id, name: col.name }));
      figma.ui.postMessage({ type: 'collections-list', collections: collectionData });
    } catch (e) {
      console.error("Error fetching collections:", e);
      figma.ui.postMessage({ type: 'collections-list', collections: [] });
    }
    return; // Wichtig: Beendet die Funktion nach dieser Nachricht.
  }

  // --- Load Theme Data Handler ---
  // BEFEHL: 'load-theme-data'
  // Wird ausgelöst, wenn der Benutzer eine vorhandene Sammlung auswählt.
  // Lädt die Kernfarben (primary, secondary, tertiary) aus dieser Sammlung,
  // um die Farbwähler in der UI zu füllen.
  if (msg.type === 'load-theme-data') {
    const { collectionId, themeName } = msg.payload;
    try {
      const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
      if (!collection) throw new Error("Collection not found.");
      
      // Finde den Light-Modus, um die Grundfarben zu laden
      const { lightModeId } = findModes(collection, themeName);
      if (!lightModeId) {
          throw new Error(`No suitable Light mode found in collection "${themeName}".`);
      }
      const modeIdToUse = lightModeId;

      // Hole alle lokalen Variablen, um Alias-Werte auflösen zu können
      const allLocalVariables = await figma.variables.getLocalVariablesAsync();
      const variableMap = new Map(allLocalVariables.map(v => [v.id, v]));

      /**
       * Interne Hilfsfunktion: Sucht eine Variable (z.B. 'accent/primary/primary')
       * im Light-Modus der Sammlung und gibt ihren Farbw ert zurück.
       * Kann auch Aliasen folgen (wenn eine Variable auf eine andere verweist).
       */
      const getResolvedValue = (varName) => {
        const collectionVariables = allLocalVariables.filter(v => v.variableCollectionId === collectionId);
        const variable = collectionVariables.find(v => v.name === varName);
        if (!variable) throw new Error(`Variable "${varName}" not found in collection "${themeName}".`);
        
        let value = variable.valuesByMode[modeIdToUse];
        
        // Fallback, wenn der Modus existiert, aber keinen Wert hat
        if (!value) {
            console.warn(`No value found for modeId ${modeIdToUse} in var "${varName}". Using first available mode.`);
            const availableModeId = Object.keys(variable.valuesByMode)[0];
            if (!availableModeId) throw new Error(`Variable "${varName}" has no mode values at all.`);
            value = variable.valuesByMode[availableModeId];
        }
        
        // Wenn der Wert ein Alias ist (ein Verweis auf eine andere Variable)
        if (value && value.type === 'VARIABLE_ALIAS') {
          const resolvedVar = variableMap.get(value.id); // Finde die referenzierte Variable
          if (!resolvedVar) throw new Error(`Could not resolve alias ID "${value.id}".`);
          // Nimm den ersten verfügbaren Wert der referenzierten Variable
          const resolvedModeId = Object.keys(resolvedVar.valuesByMode)[0]; 
          if (!resolvedModeId) throw new Error(`Resolved alias variable "${resolvedVar.name}" has no mode values.`);
          value = resolvedVar.valuesByMode[resolvedModeId];
        }
        
        // Endgültige Prüfung, ob wir eine Farbe haben
        if (typeof value !== 'object' || value === null || !value.hasOwnProperty('r')) {
           throw new Error(`Value for "${varName}" is not a color. Found: ${JSON.stringify(value)}`);
        }
        return value; // Gibt das {r, g, b, a} Objekt zurück
      };

      let valPrimary, valSecondary, valTertiary;
      
      // Versuche, die drei Grundfarben zu laden.
      // Wenn eine fehlschlägt (z.B. weil sie in der Sammlung fehlt),
      // verwenden wir die Standard-UI-Farben als Fallback.
      try { valPrimary = getResolvedValue('accent/primary/primary'); } catch (e) { valPrimary = {r:0.18,g:0.525,b:0.67}; console.warn("Primary base color not found, using default #2E86AB.", e.message); } // #2E86AB
      try { valSecondary = getResolvedValue('accent/secondary/secondary'); } catch (e) { valSecondary = {r:0.753,g:0.96,b:0.63}; console.warn("Secondary base color not found, using default #C0F5A1.", e.message); } // #C0F5A1
      try { valTertiary = getResolvedValue('accent/tertiary/tertiary'); } catch (e) { valTertiary = {r:0.937,g:0.525,b:0.067}; console.warn("Tertiary base color not found, using default #EF8611.", e.message); } // #EF8611

      // Sende die geladenen Farben (in HEX umgewandelt) zurück an die UI
      figma.ui.postMessage({
        type: 'theme-data-loaded',
        payload: {
          primary: rgbaToHex(valPrimary),
          secondary: rgbaToHex(valSecondary),
          tertiary: rgbaToHex(valTertiary),
        }
      });
    } catch (e) {
      console.error("Error loading theme data:", e);
      figma.notify(`❌ Error loading theme: ${e.message}`, { error: true });
    }
    return; // Wichtig: Beendet die Funktion nach dieser Nachricht.
  }

  // --- Generate/Update Theme Handler ---
  // BEFEHL: 'generate-theme'
  // Dies ist die Kernfunktion des Plugins. Sie wird ausgelöst, wenn der Benutzer
  // auf 'Export to Variables' oder 'Update Variables' klickt.
  if (msg.type === 'generate-theme') {
    // Entpacke alle Daten, die von der UI gesendet wurden
    const { themeName, lightRecipe, darkRecipe, collectionIdToUpdate } = msg.payload;
    
    // Prüfen, ob wir eine *neue* Sammlung erstellen oder eine *vorhandene* aktualisieren.
    // `collectionIdToUpdate` ist `null` (oder "falsy"), wenn 'Import' nicht verwendet wurde.
    const isUpdate = !!collectionIdToUpdate;
    // Holt alle Variablennamen (z.B. "accent/primary/primary") aus dem "Rezept" der UI.
    const variableNames = Object.keys(lightRecipe);

    try {
      let collection;
      let lightModeId;
      let darkModeId;

      if (isUpdate) {
        // --- UPDATE-PFAD ---
        // Wird ausgeführt, wenn der Benutzer eine Sammlung zum Aktualisieren ausgewählt hat.
        console.log(`Updating existing theme collection: ${themeName} (ID: ${collectionIdToUpdate})`);
        collection = await figma.variables.getVariableCollectionByIdAsync(collectionIdToUpdate);
        if (!collection) {
            throw new Error(`Collection to update (ID: ${collectionIdToUpdate}) not found.`);
        }

        // Finde die IDs für den Light- und Dark-Modus in der vorhandenen Sammlung.
        const modes = findModes(collection, themeName);
        lightModeId = modes.lightModeId;
        darkModeId = modes.darkModeId;
        
        // Prüfen, ob der Benutzer die Sammlung im Textfeld umbenannt hat.
        if (collection.name !== themeName) {
            console.log(`Renaming collection from "${collection.name}" to "${themeName}".`);
            collection.name = themeName; // Collection-Namen aktualisieren
        }
        // Stelle sicher, dass die Modi auch den neuen Namen reflektieren.
        if (collection.modes.find(m => m.modeId === lightModeId).name !== `${themeName}/Light`) {
             collection.renameMode(lightModeId, `${themeName}/Light`);
        }
        if (collection.modes.find(m => m.modeId === darkModeId).name !== `${themeName}/Dark`) {
             collection.renameMode(darkModeId, `${themeName}/Dark`);
        }

        // --- UPDATE-Logik für Variablen ---
        // Hole alle Variablen, die *bereits* in dieser Sammlung vorhanden sind.
        const allLocalVariables = await figma.variables.getLocalVariablesAsync();
        const collectionVariables = allLocalVariables.filter(v => v.variableCollectionId === collection.id);
        // Erstellt eine 'Map' (schnelles Nachschlagewerk) dieser Variablen,
        // um schnell über den Namen darauf zugreifen zu können (z.B. variableMap.get("accent/primary/primary")).
        const variableMap = new Map(collectionVariables.map(v => [v.name, v]));
        
        console.log(`Processing ${variableNames.length} variables for UPDATE...`);
        // Schleife durch *alle* Variablen, die das Plugin *erwartet* (aus `lightRecipe` von der UI).
        for (const varName of variableNames) {
           let variable = variableMap.get(varName); // Versuche, die Variable in der Map zu finden.
           
           if (!variable) {
               // FALLS die Variable in der Sammlung nicht gefunden wurde (z.B. weil dies ein
               // Plugin-Update mit neuen Tokens ist oder der Benutzer sie gelöscht hat),
               // erstellen wir sie hier einfach neu.
               console.warn(`Variable "${varName}" not found in existing collection. Creating it...`);
               variable = await figma.variables.createVariable(varName, collection.id, 'COLOR');
           }

           // --- Description setzen ---
           // Hole die Beschreibung aus unserer "Datenbank".
           const description = variableDescriptions[varName];
           // Setze die Beschreibung, falls sie existiert UND sich von der aktuellen unterscheidet.
           if (description && variable.description !== description) {
               variable.description = description;
           }
           
           if (!variable || typeof variable.setValueForMode !== 'function') {
             throw new Error(`Invalid variable object for "${varName}"`);
           }
           
           try {
             // Wandle die HEX-Werte aus der UI in Figma-RGBA-Objekte um.
             const figmaLightValue = convertUiValueToFigmaRgba(lightRecipe[varName], `${varName}-Light`);
             const figmaDarkValue = convertUiValueToFigmaRgba(darkRecipe[varName], `${varName}-Dark`);

             // --- SPEZIALFALL: Transparenz ---
             // 'shadow' und 'overlay' sollen immer 20% Transparenz haben.
             if (varName === 'base/other/shadow' || varName === 'base/other/overlay') {
                 figmaLightValue.a = 0.2;
                 figmaDarkValue.a = 0.2;
             }

             // Setze den (neuen) Farbwert für beide Modi.
             await variable.setValueForMode(lightModeId, figmaLightValue);
             await variable.setValueForMode(darkModeId, figmaDarkValue);
           } catch (setVarError) {
                // Fängt Fehler ab, falls *eine einzelne* Variable fehlschlägt
                console.error(`Error setting variable "${varName}" during UPDATE:`, setVarError);
                figma.notify(`⚠️ Error processing variable "${varName}". See console.`, { error: true, timeout: 5000 });
           }
        } // Ende der for-Schleife

      } else {
        // --- CREATE-PFAD ---
        // Wird ausgeführt, wenn keine Sammlung ausgewählt wurde und eine neue erstellt wird.
        console.log(`Creating new theme collection: ${themeName}`);
        
        // Erstellt die brandneue Sammlung.
        let initialCollection = figma.variables.createVariableCollection(themeName);
        const collectionId = initialCollection.id;
        console.log("Initial collection created, ID:", collectionId);

        // Wir müssen die Sammlung neu abrufen, um alle Methoden (z.B. renameMode) zu haben.
        collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
        if (!collection) {
            throw new Error("Failed to refetch collection.");
        }
        console.log("Collection refetched successfully.");

        // Die neue Sammlung startet mit einem Modus namens "Mode 1".
        // Wir benennen ihn in ".../Light" um.
        lightModeId = collection.modes[0].modeId;
        collection.renameMode(lightModeId, `${themeName}/Light`);
        console.log("Renamed default mode to Light.");

        // --- Dark Mode Erstellung ---
        console.log("Available keys/methods on collection object:", Object.keys(collection));
        console.log("typeof collection.appendMode:", typeof collection.appendMode);
        console.log("typeof collection.addMode:", typeof collection.addMode);

        let darkModeId;
        // `appendMode` ist die neue, bevorzugte API-Methode.
        if (typeof collection.appendMode === 'function') {
          console.log("Attempting to use collection.appendMode...");
          const darkMode = collection.appendMode(`${themeName}/Dark`);
          darkModeId = darkMode.modeId;
          console.log("Appended Dark mode using appendMode, ID:", darkModeId);
        } else if (typeof collection.addMode === 'function') {
          // `addMode` ist veraltet, wird aber als Fallback für ältere Figma-Versionen unterstützt.
          console.warn("collection.appendMode is not a function. Attempting deprecated collection.addMode...");
          darkModeId = collection.addMode(`${themeName}/Dark`); 
          console.log("Added Dark mode using deprecated addMode, ID:", darkModeId);
        } else {
          console.error("Neither appendMode nor addMode function exists on the collection object!");
          throw new Error("Cannot add new mode to collection - function missing.");
        }

        if (!darkModeId) throw new Error("Failed to create Dark mode using any method.");
        // --- ENDE MODUS-ERSTELLUNG ---

        console.log(`Processing ${variableNames.length} variables for CREATE...`);
        // Schleife durch alle erwarteten Variablen
        for (const varName of variableNames) {
           try {
             // Erstellt jede Variable von Grund auf neu in der neuen Sammlung.
             const variable = await figma.variables.createVariable(varName, collection.id, 'COLOR');

             // --- Description setzen ---
             const description = variableDescriptions[varName];
             if (description) {
                 variable.description = description;
             }

             if (!variable || typeof variable.setValueForMode !== 'function') {
               throw new Error(`Invalid variable object or missing function for "${varName}"`);
             }
             
             // Wandle die HEX-Werte aus der UI in Figma-RGBA-Objekte um.
             const figmaLightValue = convertUiValueToFigmaRgba(lightRecipe[varName], `${varName}-Light`);
             const figmaDarkValue = convertUiValueToFigmaRgba(darkRecipe[varName], `${varName}-Dark`);

             // --- SPEZIALFALL: Transparenz ---
             if (varName === 'base/other/shadow' || varName === 'base/other/overlay') {
                 figmaLightValue.a = 0.2;
                 figmaDarkValue.a = 0.2;
             }
             
             // Setze die Farbwerte für beide Modi.
             await variable.setValueForMode(lightModeId, figmaLightValue);
             await variable.setValueForMode(darkModeId, figmaDarkValue);
           } catch (createVarError) {
              // Fängt Fehler ab, falls *eine einzelne* Variable fehlschlägt
              console.error(`Error creating/setting variable "${varName}" during CREATE:`, createVarError);
              figma.notify(`⚠️ Error processing variable "${varName}". See console.`, { error: true, timeout: 5000 });
           }
        } // Ende der for-Schleife
      } // Ende des if/else (Update/Create) Blocks

      // --- Gemeinsames Ende (wird nach erfolgreichem Update ODER Create ausgeführt) ---
      console.log("Finished processing variables.");
      // Sendet eine Erfolgsmeldung an den Benutzer
      figma.notify(`✅ Theme "${themeName}" ${isUpdate ? 'updated' : 'created'}.`);
      // Sendet eine Nachricht zurück an die UI, damit diese z.B. den Button wieder aktiviert.
      figma.ui.postMessage({ type: "generation-complete" });

    } catch (e) {
      // --- FEHLERBEHANDLUNG (Global) ---
      // Fängt alle Fehler ab, die im 'generate-theme'-Block auftreten (z.B. wenn die Sammlung
      // nicht gefunden wird oder das Hinzufügen eines Modus fehlschlägt).
      console.error(`Error during theme ${isUpdate ? 'update' : 'creation'} main block:`, e);
      figma.notify(`❌ Error ${isUpdate ? 'updating' : 'creating'} theme: ${e.message}`, { error: true });
      figma.ui.postMessage({ type: "generation-error" });
    }
  } // Ende des 'generate-theme' Handlers
};
// --- ENDE der figma.ui.onmessage Funktion ---