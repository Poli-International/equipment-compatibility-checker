// This script fetches the static HTML tool, its CSS, and its JavaScript,
// then injects them directly into the main document to ensure correct rendering.

const toolHtmlRelativePath = 'standalone-tools/equipment-compatibility/index.html';

async function loadTool() {
  try {
    // 1. Fetch the tool's main HTML file.
    const response = await fetch(toolHtmlRelativePath);
    if (!response.ok) {
      throw new Error(`HTTP error fetching HTML (${toolHtmlRelativePath}): ${response.status}`);
    }
    const html = await response.text();
    
    // 2. Derive the base path from the tool's known relative path.
    const toolBasePath = toolHtmlRelativePath.substring(0, toolHtmlRelativePath.lastIndexOf('/') + 1);

    // 3. Parse the fetched HTML to find all CSS and JS assets.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 4. Fetch all CSS files referenced in the HTML in parallel.
    const cssPromises = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link => {
        const href = link.getAttribute('href');
        if (!href) return Promise.resolve('');
        
        const isAbsolute = href.startsWith('http') || href.startsWith('//');
        const cssPath = isAbsolute ? href : toolBasePath + href;

        return fetch(cssPath).then(res => {
            if (!res.ok) throw new Error(`HTTP error fetching CSS (${cssPath}): ${res.status}`);
            return res.text();
        });
    });
    
    // 5. Get all script URLs in their original, specified order.
    const scriptUrls = Array.from(doc.querySelectorAll('script[src]')).map(script => {
        const src = script.getAttribute('src');
        if (!src) return null;
        const isAbsolute = src.startsWith('http') || src.startsWith('//');
        return isAbsolute ? src : toolBasePath + src;
    }).filter(Boolean);

    // 6. Fetch all CSS and wait for it to complete.
    const allCss = await Promise.all(cssPromises);
    
    // 7. Fetch all JavaScript files SEQUENTIALLY to guarantee dependency order.
    const allJsContent = [];
    for (const url of scriptUrls) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error fetching JS (${url}): ${res.status}`);
        allJsContent.push(await res.text());
    }

    // --- Start DOM Manipulation ---
    // 8. Prepare the main document.
    document.head.innerHTML = '';
    document.body.innerHTML = ''; 
    
    // 9. Inject head elements from the tool's HTML (e.g., title, meta tags).
    doc.head.childNodes.forEach(node => {
        if (!(node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
            document.head.appendChild(node.cloneNode(true));
        }
    });

    // 10. Inject all CSS content into a single <style> tag for performance.
    const style = document.createElement('style');
    style.textContent = allCss.join('\n\n/* --- */\n\n');
    document.head.appendChild(style);

    // 11. Copy attributes from the parsed <body> (e.g., classes for dark mode).
    for (const { name, value } of doc.body.attributes) {
        document.body.setAttribute(name, value);
    }

    // 12. Copy the content from the parsed <body>.
    document.body.innerHTML = doc.body.innerHTML;
    
    // 13. Inject all JavaScript content in order, ensuring correct execution.
    allJsContent.forEach(scriptContent => {
        const newScript = document.createElement('script');
        newScript.textContent = scriptContent;
        document.body.appendChild(newScript);
    });
    
  } catch (error) {
    console.error('Failed to load the tool:', error);
    document.body.innerHTML = `<p style="font-family: sans-serif; text-align: center; padding: 2rem; color: #DC3545; background-color: #121212;">Error: Could not load the Equipment Compatibility Checker. Details: ${error.message}</p>`;
  }
}

// Start the loading process.
loadTool();
