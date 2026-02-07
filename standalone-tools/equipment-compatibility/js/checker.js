// This script now runs immediately, as the loading process guarantees the DOM and data are ready.

window.PoliTools = window.PoliTools || {};
window.PoliTools.EquipmentCompatibility = window.PoliTools.EquipmentCompatibility || {};

// Combine all databases into a single accessible object
window.PoliTools.EquipmentCompatibility.databases = {
    machine: window.PoliTools.machineDB,
    cartridge: window.PoliTools.cartridgeDB,
    power: window.PoliTools.powerDB,
    grip: window.PoliTools.gripDB
};

// --- GLOBAL STATE ---
const state = {
    selected: {
        comp1: { type: null, id: null },
        comp2: { type: null, id: null },
        reverse: { type: null, id: null },
        build: {
            machine: null,
            power: null,
            cartridge: null,
            grip: null,
        }
    }
};

const allItems = [
    ...window.PoliTools.EquipmentCompatibility.databases.machine.map(i => ({...i, type: 'machine'})),
    ...window.PoliTools.EquipmentCompatibility.databases.cartridge.map(i => ({...i, type: 'cartridge'})),
    ...window.PoliTools.EquipmentCompatibility.databases.power.map(i => ({...i, type: 'power'})),
    ...window.PoliTools.EquipmentCompatibility.databases.grip.map(i => ({...i, type: 'grip'}))
];

// --- UTILITY FUNCTIONS ---
function getItem(type, id) {
    if (!type || !id || !window.PoliTools.EquipmentCompatibility.databases[type]) return null;
    return window.PoliTools.EquipmentCompatibility.databases[type].find(item => item.id === id);
}

function formatPrice(priceRange) {
    if (!priceRange) return 'N/A';
    const count = priceRange.length;
    if (count <= 2) return `<span class="price-tier price-tier--low" title="Low Cost">${priceRange}</span>`;
    if (count <= 4) return `<span class="price-tier price-tier--mid" title="Medium Cost">${priceRange}</span>`;
    return `<span class="price-tier price-tier--high" title="Premium Cost">${priceRange}</span>`;
}

function renderStatusBadges(item) {
    if (!item.status) return '';

    const badges = [];
    if (item.status.includes('new')) {
        badges.push('<span class="status-badge status-badge--new">New</span>');
    }
    if (item.status.includes('popular')) {
        badges.push('<span class="status-badge status-badge--popular">Popular</span>');
    }
    if (item.status.includes('recommended')) {
        badges.push('<span class="status-badge status-badge--recommended">Recommended</span>');
    }

    return badges.join('');
}

// --- FAVORITES MANAGEMENT ---
function toggleFavorite(type, id, buttonElement) {
    if (!window.EquipStorage) return;

    const isNowFavorite = window.EquipStorage.Favorites.toggle(type, id);

    if (buttonElement) {
        if (isNowFavorite) {
            buttonElement.classList.add('favorite-btn--active');
            buttonElement.setAttribute('aria-label', 'Remove from favorites');
        } else {
            buttonElement.classList.remove('favorite-btn--active');
            buttonElement.setAttribute('aria-label', 'Add to favorites');
        }
    }
}

function createFavoriteButton(type, id, className = 'favorite-btn') {
    const isFavorite = window.EquipStorage ? window.EquipStorage.Favorites.isFavorite(type, id) : false;

    return `<button class="${className} ${isFavorite ? 'favorite-btn--active' : ''}"
                    data-type="${type}"
                    data-id="${id}"
                    aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                    type="button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>`;
}

// --- TAB NAVIGATION ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-nav__button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Add ARIA attributes to tabs
    tabButtons.forEach((button, index) => {
        const tabId = button.dataset.tab;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', tabId);
        button.setAttribute('id', `tab-${tabId}`);
        button.setAttribute('aria-selected', button.classList.contains('tab-nav__button--active') ? 'true' : 'false');
        button.tabIndex = button.classList.contains('tab-nav__button--active') ? 0 : -1;

        button.addEventListener('click', () => {
            // Update all tabs
            tabButtons.forEach(btn => {
                btn.classList.remove('tab-nav__button--active');
                btn.setAttribute('aria-selected', 'false');
                btn.tabIndex = -1;
            });

            // Activate clicked tab
            button.classList.add('tab-nav__button--active');
            button.setAttribute('aria-selected', 'true');
            button.tabIndex = 0;

            // Show corresponding content
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });

            // Focus the tab panel for screen readers
            document.getElementById(tabId)?.focus();
        });

        // Keyboard navigation for tabs
        button.addEventListener('keydown', (e) => {
            let targetButton = null;
            const currentIndex = Array.from(tabButtons).indexOf(button);

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    targetButton = tabButtons[currentIndex - 1] || tabButtons[tabButtons.length - 1];
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    targetButton = tabButtons[currentIndex + 1] || tabButtons[0];
                    break;
                case 'Home':
                    e.preventDefault();
                    targetButton = tabButtons[0];
                    break;
                case 'End':
                    e.preventDefault();
                    targetButton = tabButtons[tabButtons.length - 1];
                    break;
            }

            if (targetButton) {
                targetButton.click();
                targetButton.focus();
            }
        });
    });

    // Add tablist role to nav
    const tabNav = document.querySelector('.tab-nav');
    if (tabNav) {
        tabNav.setAttribute('role', 'tablist');
        tabNav.setAttribute('aria-label', 'Equipment checker navigation');
    }
}

// --- UTILITY: DEBOUNCE FUNCTION ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- PERFORMANCE: LAZY LOADING FOR IMAGES ---
function enableLazyLoading() {
    // Add intersection observer for lazy loading images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px' // Start loading 50px before element enters viewport
        });

        // Observe all images with data-src attribute
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });

        return imageObserver;
    }
    return null;
}

// --- PERFORMANCE: RESULT CACHING ---
const compatibilityCache = new Map();

function getCachedCompatibility(item1Id, item2Id, type1, type2) {
    const cacheKey = `${type1}-${item1Id}-${type2}-${item2Id}`;
    return compatibilityCache.get(cacheKey);
}

function setCachedCompatibility(item1Id, item2Id, type1, type2, result) {
    const cacheKey = `${type1}-${item1Id}-${type2}-${item2Id}`;
    compatibilityCache.set(cacheKey, result);

    // Limit cache size to prevent memory issues
    if (compatibilityCache.size > 1000) {
        const firstKey = compatibilityCache.keys().next().value;
        compatibilityCache.delete(firstKey);
    }
}

// --- SEARCHABLE COMBOBOX ---
function createSearchableCombobox(inputId, listId, data, onSelect) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const wrapper = input.closest('.combobox-wrapper');
    let activeIndex = -1;

    // Initialize Fuse.js for fuzzy search
    const fuseOptions = {
        keys: [
            { name: 'brand', weight: 0.7 },
            { name: 'model', weight: 0.3 }
        ],
        threshold: 0.4, // 0 = perfect match, 1 = match anything
        distance: 100, // Maximum distance for characters to be considered a match
        minMatchCharLength: 2,
        ignoreLocation: true,
        includeScore: true
    };
    const fuse = new Fuse(data, fuseOptions);

    // Create clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'combobox__clear';
    clearBtn.innerHTML = '×';
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.type = 'button';
    wrapper.appendChild(clearBtn);

    // Show/hide clear button based on input value
    const updateClearButton = () => {
        if (input.value.trim()) {
            clearBtn.classList.add('active');
        } else {
            clearBtn.classList.remove('active');
        }
    };

    // Clear button click handler
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        list.style.display = 'none';
        input.setAttribute('aria-expanded', 'false');
        updateClearButton();
        input.focus();
    });

    const renderList = (filter = '') => {
        list.innerHTML = '';

        // Show recent searches when filter is empty
        if (!filter && window.EquipStorage) {
            const recentSearches = window.EquipStorage.SearchHistory.getRecent(5);
            if (recentSearches.length > 0) {
                const recentHeader = document.createElement('li');
                recentHeader.className = 'combobox__item combobox__item--header';
                recentHeader.textContent = 'Recent Searches';
                list.appendChild(recentHeader);

                recentSearches.forEach(term => {
                    const li = document.createElement('li');
                    li.className = 'combobox__item combobox__item--recent';
                    li.innerHTML = `
                        <svg class="combobox__recent-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
                        <span class="combobox__recent-text">${term}</span>
                    `;
                    li.addEventListener('click', () => {
                        input.value = term;
                        input.dispatchEvent(new Event('input'));
                    });
                    list.appendChild(li);
                });

                const divider = document.createElement('li');
                divider.className = 'combobox__divider';
                list.appendChild(divider);
            }
        }

        // Use fuzzy search if filter exists
        let filteredData;
        if (filter) {
            const fuseResults = fuse.search(filter);
            filteredData = fuseResults.map(result => result.item).slice(0, 20); // Limit to 20 results
        } else {
            filteredData = data.slice(0, 20); // Show first 20 items when no filter
        }

        if (filteredData.length === 0 && filter) {
            list.innerHTML = `<li class="combobox__item combobox__item--no-results">No results found. Try a different search term.</li>`;
            return;
        }

        filteredData.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'combobox__item';
            li.dataset.id = item.id;
            li.dataset.type = item.type;
            li.setAttribute('role', 'option');
            li.id = `${inputId}-option-${index}`;
            li.tabIndex = -1;

            const isFavorite = window.EquipStorage ? window.EquipStorage.Favorites.isFavorite(item.type, item.id) : false;

            li.innerHTML = `
                <span class="combobox__item-text">
                    <span class="combobox__item-brand">${item.brand}</span>
                    <span class="combobox__item-model">${item.model}${renderStatusBadges(item)}</span>
                </span>
                ${formatPrice(item.price_range)}
                <button class="favorite-btn ${isFavorite ? 'favorite-btn--active' : ''}"
                        data-type="${item.type}"
                        data-id="${item.id}"
                        aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                        type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
            `;

            // Handle item selection
            li.addEventListener('click', (e) => {
                // Don't select if clicking favorite button
                if (e.target.closest('.favorite-btn')) return;

                const searchTerm = `${item.brand} ${item.model}`;
                input.value = `${item.brand} - ${item.model}`;
                list.style.display = 'none';
                onSelect(item.type, item.id);

                // Save to search history
                if (window.EquipStorage) {
                    window.EquipStorage.SearchHistory.add(searchTerm);
                }
            });

            // Handle favorite toggle
            const favoriteBtn = li.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(item.type, item.id, favoriteBtn);
            });

            list.appendChild(li);
        });
    };

    // Debounced input handler for performance
    const debouncedRender = debounce((value) => {
        renderList(value);
        list.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
        activeIndex = -1;
    }, 200); // 200ms delay

    input.addEventListener('input', () => {
        updateClearButton();
        debouncedRender(input.value);
    });

    input.addEventListener('focus', () => {
        renderList(input.value);
        list.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
    });
    
    input.addEventListener('keydown', e => {
        const items = list.querySelectorAll('.combobox__item:not(.combobox__item--no-results)');
        if (items.length === 0) return;

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                updateActiveItem(items);
                break;
            case 'ArrowUp':
                 e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                updateActiveItem(items);
                break;
            case 'Enter':
                 e.preventDefault();
                if (activeIndex > -1) {
                    items[activeIndex].click();
                }
                break;
            case 'Escape':
                list.style.display = 'none';
                input.setAttribute('aria-expanded', 'false');
                break;
        }
    });

    function updateActiveItem(items) {
        items.forEach(item => item.classList.remove('combobox__item--active'));
        if (activeIndex > -1) {
            items[activeIndex].classList.add('combobox__item--active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
            input.setAttribute('aria-activedescendant', items[activeIndex].id || '');
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.style.display = 'none';
            input.setAttribute('aria-expanded', 'false');
        }
    });
}

// --- CHECK COMPATIBILITY TAB ---
function setupCompatibilityChecker() {
    const resultDiv = document.getElementById('compatibility-result');
    const loadingSpinner = document.getElementById('loading-spinner');
    const checkButton = document.getElementById('check-compatibility-btn');

    const onSelectComp1 = (type, id) => { state.selected.comp1 = { type, id }; };
    const onSelectComp2 = (type, id) => { state.selected.comp2 = { type, id }; };

    createSearchableCombobox('comp1-model-search', 'comp1-model-list', allItems, onSelectComp1);
    createSearchableCombobox('comp2-model-search', 'comp2-model-list', allItems, onSelectComp2);

    checkButton.addEventListener('click', () => {
        const { comp1, comp2 } = state.selected;
        const item1 = getItem(comp1.type, comp1.id);
        const item2 = getItem(comp2.type, comp2.id);

        // Hide results and show spinner
        resultDiv.style.display = 'none';
        loadingSpinner.classList.add('active');
        loadingSpinner.setAttribute('aria-busy', 'true');
        checkButton.disabled = true;
        checkButton.setAttribute('aria-disabled', 'true');

        // Simulate brief delay for better UX
        setTimeout(() => {
            if (!item1 || !item2) {
                resultDiv.innerHTML = `<div class="result-card result--conditional">Please select two components to check.</div>`;
            } else {
                // Check cache first
                let result = getCachedCompatibility(comp1.id, comp2.id, comp1.type, comp2.type);

                if (!result) {
                    // Not in cache, compute and cache it
                    result = window.PoliTools.EquipmentCompatibility.checkCompatibility(item1, item2, comp1.type, comp2.type);
                    setCachedCompatibility(comp1.id, comp2.id, comp1.type, comp2.type, result);
                }

                displayResult(result, resultDiv);

                // Save to recent checks
                if (window.EquipStorage) {
                    window.EquipStorage.RecentChecks.add({
                        comp1Type: comp1.type,
                        comp1Id: comp1.id,
                        comp1Brand: item1.brand,
                        comp1Model: item1.model,
                        comp2Type: comp2.type,
                        comp2Id: comp2.id,
                        comp2Brand: item2.brand,
                        comp2Model: item2.model,
                        result: result.status
                    });
                }
            }

            // Hide spinner and show results
            loadingSpinner.classList.remove('active');
            loadingSpinner.setAttribute('aria-busy', 'false');
            resultDiv.style.display = 'block';
            checkButton.disabled = false;
            checkButton.removeAttribute('aria-disabled');

            // Announce result to screen readers
            const announcement = resultDiv.querySelector('.result-card-header');
            if (announcement) {
                announcement.setAttribute('role', 'status');
                announcement.setAttribute('aria-live', 'polite');
            }
        }, 600);
    });
}

function displayResult(result, element) {
    const notesHtml = result.notes.map(note => `<li>${note}</li>`).join('');
    const statusText = result.status.charAt(0).toUpperCase() + result.status.slice(1);
    const headerIcon = result.status === 'compatible' ? '✅' : result.status === 'conditional' ? '⚠️' : '❌';

    // Get alternative recommendations
    const { comp1, comp2 } = state.selected;
    const item1 = getItem(comp1.type, comp1.id);
    const item2 = getItem(comp2.type, comp2.id);
    const alternatives = getAlternativeRecommendations(item1, item2, comp1.type, comp2.type);

    let alternativesHtml = '';
    if (alternatives.length > 0) {
        alternativesHtml = `
            <div class="alternatives-section">
                <h4 class="alternatives-title">💡 Alternative Options</h4>
                <p class="alternatives-subtitle">Similar compatible equipment you might consider:</p>
                <div class="alternatives-grid">
                    ${alternatives.map(alt => `
                        <div class="alternative-card">
                            <div class="alternative-card__info">
                                <span class="alternative-card__brand">${alt.brand}</span>
                                <span class="alternative-card__model">${alt.model}${renderStatusBadges(alt)}</span>
                                ${formatPrice(alt.price_range)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    element.innerHTML = `
        <div class="result-card result--${result.status}">
            <div class="result-card-header">
                ${headerIcon} ${statusText}
            </div>
            <div class="result-card-notes">
                <ul>${notesHtml}</ul>
            </div>
            <div class="result-social-share">
                <p class="share-label">Share this result:</p>
                <div class="social-share-buttons">
                    <button class="social-share-btn social-share-btn--twitter" data-share="twitter" data-result-type="compatibility">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Twitter
                    </button>
                    <button class="social-share-btn social-share-btn--facebook" data-share="facebook" data-result-type="compatibility">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </button>
                </div>
            </div>
        </div>
        ${alternativesHtml}`;

    // Attach social share event listeners
    element.querySelectorAll('.social-share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.share;
            shareCompatibilityResult(platform, item1, item2, result);
        });
    });
}

function getAlternativeRecommendations(item1, item2, type1, type2) {
    if (!item1 || !item2) return [];

    const alternatives = [];
    const maxAlternatives = 4;

    // Find alternatives for the more expensive item
    const targetItem = (item1.price_range?.length || 0) > (item2.price_range?.length || 0) ? item1 : item2;
    const targetType = targetItem === item1 ? type1 : type2;
    const otherItem = targetItem === item1 ? item2 : item1;
    const otherType = targetItem === item1 ? type2 : type1;

    // Get all items of same type
    const sameTypeItems = window.PoliTools.EquipmentCompatibility.databases[targetType] || [];

    // Filter for compatible alternatives
    for (const candidate of sameTypeItems) {
        if (candidate.id === targetItem.id) continue;

        // Check if candidate is compatible with the other item
        const compatResult = window.PoliTools.EquipmentCompatibility.checkCompatibility(
            candidate, otherItem, targetType, otherType
        );

        if (compatResult.status === 'compatible' || compatResult.status === 'conditional') {
            alternatives.push(candidate);
        }

        if (alternatives.length >= maxAlternatives) break;
    }

    return alternatives;
}

// --- SOCIAL SHARING FUNCTIONS ---
function shareCompatibilityResult(platform, item1, item2, result) {
    const statusEmoji = result.status === 'compatible' ? '✅' : result.status === 'conditional' ? '⚠️' : '❌';
    const statusText = result.status === 'compatible' ? 'Compatible' : result.status === 'conditional' ? 'Conditionally Compatible' : 'Incompatible';

    const text = `${statusEmoji} Just checked equipment compatibility on Poli International's Equipment Checker!\n\n${item1.brand} ${item1.model} + ${item2.brand} ${item2.model} = ${statusText}\n\nCheck your equipment compatibility for free:`;
    const url = window.location.href.split('?')[0];

    if (platform === 'twitter') {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        window.showToast('Sharing to Twitter', 'Opening Twitter share dialog...', 'info');
    } else if (platform === 'facebook') {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        window.open(fbUrl, '_blank', 'width=550,height=420');
        window.showToast('Sharing to Facebook', 'Opening Facebook share dialog...', 'info');
    }
}

function shareFullSetup(platform, items, result) {
    const { machineItem, powerItem, cartridgeItem, gripItem } = items;
    const statusEmoji = result.status === 'compatible' ? '✅' : result.status === 'conditional' ? '⚠️' : '❌';
    const statusText = result.status === 'compatible' ? 'Fully Compatible' : result.status === 'conditional' ? 'Conditionally Compatible' : 'Has Compatibility Issues';

    const text = `${statusEmoji} Built my tattoo equipment setup using Poli International's Equipment Checker!\n\n🖊️ Machine: ${machineItem.brand} ${machineItem.model}\n⚡ Power: ${powerItem.brand} ${powerItem.model}\n💉 Cartridge: ${cartridgeItem.brand} ${cartridgeItem.model}\n✋ Grip: ${gripItem.brand} ${gripItem.model}\n\nStatus: ${statusText}\nCost: ${result.cost}\n\nBuild your setup for free:`;
    const url = window.location.href.split('?')[0];

    if (platform === 'twitter') {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        window.showToast('Sharing to Twitter', 'Opening Twitter share dialog...', 'info');
    } else if (platform === 'facebook') {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        window.open(fbUrl, '_blank', 'width=550,height=420');
        window.showToast('Sharing to Facebook', 'Opening Facebook share dialog...', 'info');
    }
}

// --- REVERSE LOOKUP TAB ---
function setupReverseLookup() {
    const resultDiv = document.getElementById('reverse-lookup-result');
    const matrixContainer = document.getElementById('compatibility-matrix-container');
    const listViewBtn = document.getElementById('list-view-btn');
    const matrixViewBtn = document.getElementById('matrix-view-btn');
    const brandFilter = document.getElementById('reverse-brand-filter');
    const priceFilter = document.getElementById('reverse-price-filter');
    const connectionFilter = document.getElementById('reverse-connection-filter');
    const favoritesFilter = document.getElementById('reverse-favorites-filter');

    // View toggle handlers
    listViewBtn.addEventListener('click', () => {
        listViewBtn.classList.add('view-toggle__btn--active');
        matrixViewBtn.classList.remove('view-toggle__btn--active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        matrixViewBtn.setAttribute('aria-pressed', 'false');
        resultDiv.style.display = 'block';
        matrixContainer.style.display = 'none';
        document.querySelector('.reverse-lookup-controls').style.display = 'flex';
    });

    matrixViewBtn.addEventListener('click', () => {
        matrixViewBtn.classList.add('view-toggle__btn--active');
        listViewBtn.classList.remove('view-toggle__btn--active');
        matrixViewBtn.setAttribute('aria-pressed', 'true');
        listViewBtn.setAttribute('aria-pressed', 'false');
        resultDiv.style.display = 'none';
        matrixContainer.style.display = 'block';
        document.querySelector('.reverse-lookup-controls').style.display = 'none';
        renderCompatibilityMatrix();
    });

    const onSelect = (type, id) => {
        state.selected.reverse = { type, id };
        renderReverseLookupResults();
    };

    createSearchableCombobox('reverse-lookup-search', 'reverse-lookup-list', allItems, onSelect);

    brandFilter.addEventListener('change', renderReverseLookupResults);
    priceFilter.addEventListener('change', renderReverseLookupResults);
    connectionFilter.addEventListener('change', renderReverseLookupResults);
    favoritesFilter.addEventListener('change', renderReverseLookupResults);

    function filterByPrice(item, priceRange) {
        if (!priceRange || !item.price_range) return true;
        const priceLevel = item.price_range.length;

        switch (priceRange) {
            case 'budget': return priceLevel <= 2;
            case 'mid': return priceLevel >= 3 && priceLevel <= 4;
            case 'premium': return priceLevel >= 5;
            default: return true;
        }
    }

    function filterByConnection(item, connectionType) {
        if (!connectionType) return true;

        // Only applies to machines and power supplies
        if (!item.connection_type) return true;

        const conn = item.connection_type.toLowerCase();

        switch (connectionType) {
            case 'rca': return conn.includes('rca');
            case 'clip': return conn.includes('clip');
            case 'wireless': return conn.includes('wireless') || conn.includes('battery');
            case 'both': return conn.includes('rca') && conn.includes('clip');
            default: return true;
        }
    }

    function renderReverseLookupResults() {
        const { type, id } = state.selected.reverse;
        const item = getItem(type, id);
        
        if (!item) {
            resultDiv.innerHTML = '';
            populateBrandFilter([]);
            return;
        }

        const compatibleItems = window.PoliTools.EquipmentCompatibility.findCompatible(item, type, window.PoliTools.EquipmentCompatibility.databases);
        
        let allBrands = [];
        Object.values(compatibleItems).forEach(list => {
            list.forEach(i => allBrands.push(i.brand));
        });
        populateBrandFilter([...new Set(allBrands)].sort());

        const selectedBrand = brandFilter.value;
        const selectedPrice = priceFilter.value;
        const selectedConnection = connectionFilter.value;
        const showFavoritesOnly = favoritesFilter.checked;

        const renderCategory = (category, title) => {
            let items = compatibleItems[category] || [];
            if (selectedBrand) {
                items = items.filter(i => i.brand === selectedBrand);
            }
            if (selectedPrice) {
                items = items.filter(i => filterByPrice(i, selectedPrice));
            }
            if (selectedConnection) {
                items = items.filter(i => filterByConnection(i, selectedConnection));
            }
            if (showFavoritesOnly && window.EquipStorage) {
                items = items.filter(i => window.EquipStorage.Favorites.isFavorite(i.type, i.id));
            }
            if (items.length === 0) return '';

            const itemsHtml = items.map(comp => `
                <div class="compat-item-card">
                    <div class="compat-item-card__info">
                        <span class="compat-item-card__brand">${comp.brand}</span>
                        <span class="compat-item-card__model">${comp.model}${renderStatusBadges(comp)}</span>
                        ${formatPrice(comp.price_range)}
                    </div>
                    ${comp.compatReason ? `<div class="compat-item-card__reason">✅ ${comp.compatReason}</div>` : ''}
                    ${createFavoriteButton(comp.type, comp.id, 'favorite-btn favorite-btn--card')}
                </div>
            `).join('');

            return `
                <div class="result-category">
                    <h3 class="result-category__title">${title}</h3>
                    <div class="result-grid">${itemsHtml}</div>
                </div>`;
        };
        
        resultDiv.innerHTML = `
            ${renderCategory('machine', 'Compatible Machines')}
            ${renderCategory('power', 'Compatible Power Supplies')}
            ${renderCategory('cartridge', 'Compatible Cartridges/Needles')}
            ${renderCategory('grip', 'Compatible Grips/Tubes')}
        `;

        // Attach event listeners to favorite buttons
        resultDiv.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                const id = btn.dataset.id;
                toggleFavorite(type, id, btn);
            });
        });
    }
    
    function populateBrandFilter(brands) {
        const currentVal = brandFilter.value;
        brandFilter.innerHTML = '<option value="">All Brands</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
        brandFilter.value = currentVal; // Preserve selection if possible
    }
}

// --- COMPATIBILITY MATRIX ---
const matrixCache = new Map();

function renderCompatibilityMatrix() {
    const matrixDiv = document.getElementById('compatibility-matrix');
    const categoryFilter = document.getElementById('matrix-category-filter');
    const brandFilter = document.getElementById('matrix-brand-filter');

    // Get selected category
    const category = categoryFilter.value;
    let items = window.PoliTools.EquipmentCompatibility.databases[category] || [];

    // Check if we have this matrix in cache
    const cacheKey = `${category}-${brandFilter.value}`;
    if (matrixCache.has(cacheKey)) {
        matrixDiv.innerHTML = matrixCache.get(cacheKey);
        setupMatrixTooltips([], items); // Re-attach event listeners
        return;
    }

    // Filter by brand if selected
    const selectedBrand = brandFilter.value;
    if (selectedBrand) {
        items = items.filter(item => item.brand === selectedBrand);
    }

    // Limit to first 20 items for performance
    items = items.slice(0, 20);

    // Populate brand filter
    const brands = [...new Set(window.PoliTools.EquipmentCompatibility.databases[category].map(i => i.brand))].sort();
    const currentBrand = brandFilter.value;
    brandFilter.innerHTML = '<option value="">All Brands</option>';
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandFilter.appendChild(option);
    });
    brandFilter.value = currentBrand;

    if (items.length === 0) {
        matrixDiv.innerHTML = `
            <div class="matrix-empty-state">
                <h3>No Items Available</h3>
                <p>Select a different category or clear the brand filter</p>
            </div>
        `;
        return;
    }

    // Generate matrix data
    const matrixData = [];
    items.forEach((rowItem, i) => {
        const row = {
            item: rowItem,
            cells: []
        };

        items.forEach((colItem, j) => {
            if (i === j) {
                // Same item
                row.cells.push({ status: 'na', notes: [] });
            } else {
                // Check compatibility
                const result = window.PoliTools.EquipmentCompatibility.checkCompatibility(
                    rowItem, colItem, category, category
                );
                row.cells.push({
                    status: result.status,
                    notes: result.notes,
                    item1: rowItem,
                    item2: colItem
                });
            }
        });

        matrixData.push(row);
    });

    // Render table
    const headers = items.map((item, i) => `
        <th title="${item.brand} ${item.model}">
            <div style="writing-mode: vertical-lr; transform: rotate(180deg); white-space: nowrap;">
                ${item.brand.substring(0, 8)}${item.brand.length > 8 ? '...' : ''}
            </div>
        </th>
    `).join('');

    const rows = matrixData.map((row, i) => {
        const cells = row.cells.map((cell, j) => {
            const statusClass = `matrix-cell--${cell.status}`;
            const emoji = cell.status === 'compatible' ? '✓' :
                         cell.status === 'conditional' ? '?' :
                         cell.status === 'incompatible' ? '✗' : '—';

            return `
                <td>
                    <div class="matrix-cell ${statusClass}"
                         data-row="${i}"
                         data-col="${j}"
                         data-status="${cell.status}"
                         data-item1-brand="${row.item.brand}"
                         data-item1-model="${row.item.model}"
                         data-item2-brand="${items[j].brand}"
                         data-item2-model="${items[j].model}">
                        ${emoji}
                    </div>
                </td>
            `;
        }).join('');

        return `
            <tr>
                <td title="${row.item.brand} ${row.item.model}">${row.item.brand} ${row.item.model.substring(0, 15)}${row.item.model.length > 15 ? '...' : ''}</td>
                ${cells}
            </tr>
        `;
    }).join('');

    const matrixHTML = `
        <table class="matrix-table">
            <thead>
                <tr>
                    <th></th>
                    ${headers}
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;

    matrixDiv.innerHTML = matrixHTML;

    // Cache the generated HTML
    matrixCache.set(cacheKey, matrixHTML);

    // Limit cache size
    if (matrixCache.size > 20) {
        const firstKey = matrixCache.keys().next().value;
        matrixCache.delete(firstKey);
    }

    // Add tooltip functionality
    setupMatrixTooltips(matrixData, items);

    // Add filter change handlers (only once)
    if (!categoryFilter.dataset.initialized) {
        categoryFilter.addEventListener('change', renderCompatibilityMatrix);
        brandFilter.addEventListener('change', renderCompatibilityMatrix);
        categoryFilter.dataset.initialized = 'true';
    }
}

function setupMatrixTooltips(matrixData, items) {
    const cells = document.querySelectorAll('.matrix-cell');
    let tooltip = document.querySelector('.matrix-tooltip');

    // Create tooltip if it doesn't exist
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'matrix-tooltip';
        document.body.appendChild(tooltip);
    }

    cells.forEach(cell => {
        if (cell.dataset.status === 'na') return;

        cell.addEventListener('mouseenter', (e) => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellData = matrixData[row].cells[col];

            const statusText = cellData.status.charAt(0).toUpperCase() + cellData.status.slice(1);
            const notesHtml = cellData.notes.length > 0
                ? `<ul>${cellData.notes.map(note => `<li>${note}</li>`).join('')}</ul>`
                : '<p>No additional notes</p>';

            tooltip.innerHTML = `
                <div class="matrix-tooltip__header">
                    ${cell.dataset.item1Brand} ${cell.dataset.item1Model}<br>
                    ↔<br>
                    ${cell.dataset.item2Brand} ${cell.dataset.item2Model}
                </div>
                <span class="matrix-tooltip__status matrix-tooltip__status--${cellData.status}">
                    ${statusText}
                </span>
                <div class="matrix-tooltip__notes">
                    ${notesHtml}
                </div>
            `;

            // Position tooltip
            const rect = cell.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            let left = rect.right + 10;
            let top = rect.top;

            // Keep tooltip on screen
            if (left + tooltipRect.width > window.innerWidth) {
                left = rect.left - tooltipRect.width - 10;
            }
            if (top + tooltipRect.height > window.innerHeight) {
                top = window.innerHeight - tooltipRect.height - 10;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.classList.add('visible');
        });

        cell.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });

        // Click to show full details
        cell.addEventListener('click', () => {
            if (cell.dataset.status === 'na') return;

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellData = matrixData[row].cells[col];

            window.showToast(
                `${cellData.status.charAt(0).toUpperCase() + cellData.status.slice(1)}`,
                `${cell.dataset.item1Brand} ${cell.dataset.item1Model} + ${cell.dataset.item2Brand} ${cell.dataset.item2Model}`,
                cellData.status === 'compatible' ? 'success' :
                cellData.status === 'conditional' ? 'info' : 'error'
            );
        });
    });
}


// --- UTILITY FUNCTIONS FOR FILTERING & SORTING ---
function filterByPriceRange(items, priceRange) {
    if (!priceRange) return items;

    return items.filter(item => {
        if (!item.price_range) return true;
        const priceLevel = item.price_range.length;

        switch (priceRange) {
            case 'budget': return priceLevel <= 2;
            case 'mid': return priceLevel >= 3 && priceLevel <= 4;
            case 'premium': return priceLevel >= 5;
            default: return true;
        }
    });
}

function sortItems(items, sortBy) {
    const sorted = [...items];

    switch (sortBy) {
        case 'brand':
            return sorted.sort((a, b) => a.brand.localeCompare(b.brand));
        case 'price-low':
            return sorted.sort((a, b) => {
                const aPrice = a.price_range ? a.price_range.length : 0;
                const bPrice = b.price_range ? b.price_range.length : 0;
                return aPrice - bPrice;
            });
        case 'price-high':
            return sorted.sort((a, b) => {
                const aPrice = a.price_range ? a.price_range.length : 0;
                const bPrice = b.price_range ? b.price_range.length : 0;
                return bPrice - aPrice;
            });
        default:
            return sorted;
    }
}

// --- BUILD A SETUP TAB ---
function setupBuildASetup() {
    const resultDiv = document.getElementById('build-setup-result');
    const priceFilter = document.getElementById('build-price-filter');
    const sortSelect = document.getElementById('build-sort');

    let comboboxInstances = {};

    const onSelect = (type, id, category) => {
        state.selected.build[category] = id;
    };

    function getFilteredData(data) {
        let filtered = filterByPriceRange(data, priceFilter.value);
        return sortItems(filtered, sortSelect.value);
    }

    function createFilteredCombobox(inputId, listId, data, category, type) {
        const filteredData = getFilteredData(data).map(i => ({...i, type}));
        comboboxInstances[category] = { data, inputId, listId, type };
        createSearchableCombobox(inputId, listId, filteredData, (t, id) => onSelect(t, id, category));
    }

    function refreshAllComboboxes() {
        Object.entries(comboboxInstances).forEach(([category, config]) => {
            const input = document.getElementById(config.inputId);
            const list = document.getElementById(config.listId);
            const filtered = getFilteredData(config.data).map(i => ({...i, type: config.type}));

            // Clear input and rebuild list
            input.value = '';
            state.selected.build[category] = null;

            // Trigger a re-render by updating the data
            // The combobox will automatically update when user starts typing
        });
    }

    priceFilter.addEventListener('change', refreshAllComboboxes);
    sortSelect.addEventListener('change', refreshAllComboboxes);

    createFilteredCombobox('build-machine-search', 'build-machine-list', window.PoliTools.EquipmentCompatibility.databases.machine, 'machine', 'machine');
    createFilteredCombobox('build-power-search', 'build-power-list', window.PoliTools.EquipmentCompatibility.databases.power, 'power', 'power');
    createFilteredCombobox('build-cartridge-search', 'build-cartridge-list', window.PoliTools.EquipmentCompatibility.databases.cartridge, 'cartridge', 'cartridge');
    createFilteredCombobox('build-grip-search', 'build-grip-list', window.PoliTools.EquipmentCompatibility.databases.grip, 'grip', 'grip');

    document.getElementById('check-full-setup-btn').addEventListener('click', () => {
        const { machine, power, cartridge, grip } = state.selected.build;
        const machineItem = getItem('machine', machine);
        const powerItem = getItem('power', power);
        const cartridgeItem = getItem('cartridge', cartridge);
        const gripItem = getItem('grip', grip);
        
        resultDiv.style.display = 'block';
        if (!machineItem || !powerItem || !cartridgeItem || !gripItem) {
            resultDiv.innerHTML = `<div class="result-card result--conditional">Please select all four components for a full setup check.</div>`;
            return;
        }

        const result = window.PoliTools.EquipmentCompatibility.checkFullSetup(machineItem, powerItem, cartridgeItem, gripItem);
        displayFullSetupResult(result, { machineItem, powerItem, cartridgeItem, gripItem });
    });
}

function displayFullSetupResult(result, items) {
    const { machineItem, powerItem, cartridgeItem, gripItem } = items;
    const resultDiv = document.getElementById('build-setup-result');
    const notesHtml = result.notes.length > 0 ? result.notes.map(note => `<li>${note}</li>`).join('') : '<li>✅ All components are fully compatible with no warnings.</li>';
    const statusText = result.status.charAt(0).toUpperCase() + result.status.slice(1);
    const headerIcon = result.status === 'compatible' ? '✅' : result.status === 'conditional' ? '⚠️' : '❌';
    
    resultDiv.innerHTML = `
        <div class="result-card result--${result.status}">
            <div class="result-card-header">${headerIcon} Overall Status: ${statusText}</div>
            <div class="full-setup-summary">
                <div class="summary-item">
                    <span><strong>${machineItem.brand}</strong> ${machineItem.model}</span>
                </div>
                <div class="summary-item">
                    <span><strong>${powerItem.brand}</strong> ${powerItem.model}</span>
                </div>
                <div class="summary-item">
                    <span><strong>${cartridgeItem.brand}</strong> ${cartridgeItem.model}</span>
                </div>
                <div class="summary-item">
                    <span><strong>${gripItem.brand}</strong> ${gripItem.model}</span>
                </div>
            </div>
            <div class="result-card-notes">
                <h4>Compatibility Notes:</h4>
                <ul>${notesHtml}</ul>
            </div>
            <div class="result-cost">
                Estimated Total Cost: <strong>${result.cost}</strong>
            </div>

            <!-- Connection Diagram -->
            <div class="connection-diagram-section">
                <button id="toggle-diagram-btn" class="diagram-toggle-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/>
                    </svg>
                    View Connection Diagram
                </button>
                <div id="connection-diagram-container" class="connection-diagram-container" style="display: none;"></div>
            </div>

            <div class="result-actions">
                <button id="save-setup-btn" class="action-button action-button--save">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"></path></svg>
                    Save Setup
                </button>
                <button id="download-setup-btn" class="action-button action-button--download">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>
                    Download Report
                </button>
                <button id="export-image-btn" class="action-button action-button--image">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    Export as Image
                </button>
            </div>
            <div class="result-social-share result-social-share--setup">
                <p class="share-label">Share your setup:</p>
                <div class="social-share-buttons">
                    <button class="social-share-btn social-share-btn--twitter" data-share="twitter" data-result-type="setup">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Share on Twitter
                    </button>
                    <button class="social-share-btn social-share-btn--facebook" data-share="facebook" data-result-type="setup">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Share on Facebook
                    </button>
                </div>
            </div>
        </div>`;
    
    document.getElementById('save-setup-btn').addEventListener('click', () => saveCurrentSetup(result, items));
    document.getElementById('download-setup-btn').addEventListener('click', () => downloadSetupReport(result, items));
    document.getElementById('export-image-btn').addEventListener('click', () => exportSetupAsImage(result, items));

    // Connection diagram toggle
    const toggleDiagramBtn = document.getElementById('toggle-diagram-btn');
    const diagramContainer = document.getElementById('connection-diagram-container');
    let diagramVisible = false;

    toggleDiagramBtn.addEventListener('click', () => {
        diagramVisible = !diagramVisible;
        if (diagramVisible) {
            diagramContainer.style.display = 'block';
            toggleDiagramBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
                Hide Connection Diagram
            `;
            generateConnectionDiagram(items, diagramContainer);
        } else {
            diagramContainer.style.display = 'none';
            toggleDiagramBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/>
                </svg>
                View Connection Diagram
            `;
        }
    });

    // Attach social share event listeners
    resultDiv.querySelectorAll('.social-share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.share;
            shareFullSetup(platform, items, result);
        });
    });
}

// --- CONNECTION DIAGRAM GENERATOR ---
function generateConnectionDiagram(items, container) {
    const { machineItem, powerItem, cartridgeItem, gripItem } = items;

    const isWireless = machineItem.wireless === true;
    const connectionType = machineItem.connection_type || powerItem.connection_type || 'RCA';

    const svgWidth = 1000;
    const svgHeight = 400;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" class="connection-diagram-svg">
            <defs>
                <!-- Arrow marker -->
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#FF6B35" />
                </marker>

                <!-- Gradient for power supply -->
                <linearGradient id="powerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                </linearGradient>
            </defs>

            <!-- Background -->
            <rect width="${svgWidth}" height="${svgHeight}" fill="var(--bg-color)" rx="12"/>

            ${!isWireless ? `
                <!-- Power Supply Box -->
                <g class="diagram-node" data-component="power">
                    <rect x="50" y="150" width="150" height="100" fill="url(#powerGradient)" rx="8" stroke="#5568d3" stroke-width="2"/>
                    <text x="125" y="190" text-anchor="middle" fill="white" font-size="14" font-weight="bold">Power Supply</text>
                    <text x="125" y="210" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="12">${powerItem.brand}</text>
                    <text x="125" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="11">${powerItem.model.substring(0, 18)}${powerItem.model.length > 18 ? '...' : ''}</text>
                </g>

                <!-- Connection Line 1: Power to Machine -->
                <line x1="200" y1="200" x2="300" y2="200" stroke="#FF6B35" stroke-width="4" marker-end="url(#arrowhead)"/>
                <text x="250" y="190" text-anchor="middle" fill="var(--text-primary)" font-size="12" font-weight="600">${connectionType}</text>
            ` : `
                <!-- Wireless indicator -->
                <g class="diagram-node">
                    <circle cx="125" cy="200" r="40" fill="#667eea" stroke="#5568d3" stroke-width="2"/>
                    <text x="125" y="195" text-anchor="middle" fill="white" font-size="30">📶</text>
                    <text x="125" y="220" text-anchor="middle" fill="white" font-size="11" font-weight="bold">Wireless</text>
                    <text x="125" y="260" text-anchor="middle" fill="var(--text-primary)" font-size="11">(Battery Powered)</text>
                </g>

                <!-- Dotted line for wireless -->
                <line x1="165" y1="200" x2="300" y2="200" stroke="#667eea" stroke-width="3" stroke-dasharray="8,4" marker-end="url(#arrowhead)"/>
            `}

            <!-- Machine Box -->
            <g class="diagram-node" data-component="machine">
                <rect x="310" y="150" width="160" height="100" fill="var(--surface-color)" rx="8" stroke="var(--primary-color)" stroke-width="3"/>
                <text x="390" y="175" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="bold">Machine</text>
                <text x="390" y="195" text-anchor="middle" fill="var(--text-secondary)" font-size="12">${machineItem.brand}</text>
                <text x="390" y="213" text-anchor="middle" fill="var(--text-secondary)" font-size="11">${machineItem.model.substring(0, 20)}${machineItem.model.length > 20 ? '...' : ''}</text>
                <text x="390" y="235" text-anchor="middle" fill="var(--primary-color)" font-size="10" font-weight="600">${machineItem.motor_type || 'Rotary'}</text>
            </g>

            <!-- Connection Line 2: Machine to Grip -->
            <line x1="470" y1="200" x2="560" y2="200" stroke="#FF6B35" stroke-width="4" marker-end="url(#arrowhead)"/>
            <text x="515" y="190" text-anchor="middle" fill="var(--text-primary)" font-size="12" font-weight="600">Threads</text>

            <!-- Grip Box -->
            <g class="diagram-node" data-component="grip">
                <rect x="570" y="150" width="160" height="100" fill="var(--surface-color)" rx="8" stroke="#004E89" stroke-width="3"/>
                <text x="650" y="175" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="bold">Grip/Tube</text>
                <text x="650" y="195" text-anchor="middle" fill="var(--text-secondary)" font-size="12">${gripItem.brand}</text>
                <text x="650" y="213" text-anchor="middle" fill="var(--text-secondary)" font-size="11">${gripItem.model.substring(0, 20)}${gripItem.model.length > 20 ? '...' : ''}</text>
                <text x="650" y="235" text-anchor="middle" fill="#004E89" font-size="10" font-weight="600">${gripItem.material || 'Aluminum'}</text>
            </g>

            <!-- Connection Line 3: Grip to Cartridge -->
            <line x1="730" y1="200" x2="810" y2="200" stroke="#FF6B35" stroke-width="4" marker-end="url(#arrowhead)"/>
            <text x="770" y="190" text-anchor="middle" fill="var(--text-primary)" font-size="12" font-weight="600">Inserts</text>

            <!-- Cartridge Box -->
            <g class="diagram-node" data-component="cartridge">
                <rect x="820" y="150" width="130" height="100" fill="var(--surface-color)" rx="8" stroke="#F7B801" stroke-width="3"/>
                <text x="885" y="175" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="bold">Cartridge</text>
                <text x="885" y="195" text-anchor="middle" fill="var(--text-secondary)" font-size="11">${cartridgeItem.brand}</text>
                <text x="885" y="213" text-anchor="middle" fill="var(--text-secondary)" font-size="10">${cartridgeItem.needle_config || 'Universal'}</text>
                ${cartridgeItem.membrane ? `
                    <text x="885" y="235" text-anchor="middle" fill="#00AA44" font-size="10" font-weight="600">✓ Membrane</text>
                ` : `
                    <text x="885" y="235" text-anchor="middle" fill="#DC3545" font-size="10" font-weight="600">⚠ No Membrane</text>
                `}
            </g>

            <!-- Title -->
            <text x="500" y="40" text-anchor="middle" fill="var(--text-primary)" font-size="20" font-weight="bold">Connection Flow Diagram</text>
            <text x="500" y="65" text-anchor="middle" fill="var(--text-secondary)" font-size="13">Follow this connection order for proper setup</text>

            <!-- Legend -->
            <g class="diagram-legend">
                <text x="50" y="350" fill="var(--text-secondary)" font-size="11" font-weight="600">Legend:</text>
                <line x1="110" y1="345" x2="150" y2="345" stroke="#FF6B35" stroke-width="3" marker-end="url(#arrowhead)"/>
                <text x="160" y="350" fill="var(--text-secondary)" font-size="11">Connection Flow</text>
                <rect x="280" y="337" width="20" height="14" fill="var(--surface-color)" stroke="var(--primary-color)" stroke-width="2" rx="2"/>
                <text x="310" y="350" fill="var(--text-secondary)" font-size="11">Equipment Component</text>
            </g>
        </svg>
    `;

    container.innerHTML = svg;

    // Add interactivity
    setTimeout(() => {
        const nodes = container.querySelectorAll('.diagram-node');
        nodes.forEach(node => {
            node.style.cursor = 'pointer';
            node.addEventListener('mouseenter', function() {
                this.querySelector('rect, circle').setAttribute('opacity', '0.8');
            });
            node.addEventListener('mouseleave', function() {
                this.querySelector('rect, circle').setAttribute('opacity', '1');
            });
            node.addEventListener('click', function() {
                const component = this.dataset.component;
                if (component) {
                    window.showToast('Component Info', `Click to view details for ${component}`, 'info');
                }
            });
        });
    }, 100);
}

// --- SAVE SETUP ---
function saveCurrentSetup(result, items) {
    const { machineItem, powerItem, cartridgeItem, gripItem } = items;

    if (!window.EquipStorage) {
        window.showToast('Error', 'Storage not available', 'error');
        return;
    }

    const setupData = {
        name: `Setup ${new Date().toLocaleDateString()}`,
        machine: { id: state.selected.build.machine, brand: machineItem.brand, model: machineItem.model },
        power: { id: state.selected.build.power, brand: powerItem.brand, model: powerItem.model },
        cartridge: { id: state.selected.build.cartridge, brand: cartridgeItem.brand, model: cartridgeItem.model },
        grip: { id: state.selected.build.grip, brand: gripItem.brand, model: gripItem.model },
        status: result.status,
        cost: result.cost,
        notes: result.notes
    };

    const saved = window.EquipStorage.SavedSetups.add(setupData);

    if (saved) {
        // Update button to show saved state
        const saveBtn = document.getElementById('save-setup-btn');
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path></svg>
            Saved!`;
        saveBtn.disabled = true;

        setTimeout(() => {
            saveBtn.innerHTML = originalHTML;
            saveBtn.disabled = false;
        }, 2000);
    }
}


// --- SUGGEST GEAR TAB ---
function setupSuggestGear() {
    const form = document.getElementById('suggest-gear-form');
    const successMsg = document.getElementById('suggest-success');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // In a real app, this would send data to a server.
        // Here, we just show a success message.
        successMsg.style.display = 'block';
        form.reset();
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 4000);
    });
}

// --- SHARE & DOWNLOAD ---
function generateShareableUrl() {
    const { machine, power, cartridge, grip } = state.selected.build;
    const params = new URLSearchParams();
    params.set('tab', 'build-your-setup');
    if (machine) params.set('machine', machine);
    if (power) params.set('power', power);
    if (cartridge) params.set('cartridge', cartridge);
    if (grip) params.set('grip', grip);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    navigator.clipboard.writeText(url).then(() => {
        window.showToast('Link Copied!', 'Shareable setup URL copied to clipboard', 'success');
    }).catch(() => {
        window.showToast('Copy Failed', 'Please try again', 'error');
    });
}

function downloadSetupReport(result, items) {
    window.showToast('Generating Report', 'Your setup report is being created...', 'info');

    const { machineItem, powerItem, cartridgeItem, gripItem } = items;
    const statusText = result.status.charAt(0).toUpperCase() + result.status.slice(1);
    const notesHtml = result.notes.length > 0 ? result.notes.map(note => `<li>${note}</li>`).join('') : '<li>All components are fully compatible.</li>';
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Poli International - Equipment Setup Report</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background-color: #f9f9f9; color: #121212; }
                .container { max-width: 800px; margin: auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 2rem; }
                .header { text-align: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 1rem; margin-bottom: 2rem; }
                .header h1 { margin: 0; color: #004E89; }
                .header p { margin: 0.25rem 0 0; color: #555; }
                .setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
                .item-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 8px; background-color: #f9f9f9; border: 1px solid #e0e0e0;}
                .item-card img { width: 60px; height: 60px; object-fit: contain; }
                .item-card-info { font-size: 0.9rem; }
                .item-card-info strong { display: block; font-size: 1rem; color: #333; }
                .results-section { padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
                .result--compatible { background-color: #e9f7ec; border: 1px solid #b7e4c7; }
                .result--conditional { background-color: #fff8e1; border: 1px solid #ffecb3; }
                .result--incompatible { background-color: #fdeaea; border: 1px solid #f5c6cb; }
                .results-section h2 { margin-top: 0; font-size: 1.5rem; }
                .results-section ul { padding-left: 20px; margin: 0; }
                .footer { text-align: center; font-size: 0.8rem; color: #777; margin-top: 2rem; }
                .cost { font-size: 1.5rem; font-weight: bold; text-align: center; color: #004E89; }
                @media print { body { padding: 0; background: #fff; } .container { border: none; box-shadow: none; } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Equipment Compatibility Report</h1>
                    <p>Generated by Poli International | ${reportDate}</p>
                </div>
                <h2>Your Selected Setup</h2>
                <div class="setup-grid">
                    <div class="item-card"><img src="${machineItem.image_url}" alt="${machineItem.model}"><div class="item-card-info"><strong>Machine:</strong> ${machineItem.brand} ${machineItem.model}</div></div>
                    <div class="item-card"><img src="${powerItem.image_url}" alt="${powerItem.model}"><div class="item-card-info"><strong>Power Supply:</strong> ${powerItem.brand} ${powerItem.model}</div></div>
                    <div class="item-card"><img src="${cartridgeItem.image_url}" alt="${cartridgeItem.model}"><div class="item-card-info"><strong>Cartridge:</strong> ${cartridgeItem.brand} ${cartridgeItem.model}</div></div>
                    <div class="item-card"><img src="${gripItem.image_url}" alt="${gripItem.model}"><div class="item-card-info"><strong>Grip/Tube:</strong> ${gripItem.brand} ${gripItem.model}</div></div>
                </div>
                <div class="results-section result--${result.status}">
                    <h2>Overall Status: ${statusText}</h2>
                    <ul>${notesHtml}</ul>
                </div>
                <h2>Estimated Total Cost</h2>
                <div class="cost">${result.cost}</div>
                <div class="footer">
                    <p>Disclaimer: This report is for guidance only. Always verify compatibility with manufacturers before purchase. Prices are estimates.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Poli-Equipment-Setup-Report.html';
    link.click();
    URL.revokeObjectURL(link.href);

    setTimeout(() => {
        window.showToast('Download Complete', 'Setup report downloaded successfully', 'success');
    }, 500);
}

// --- EXPORT SETUP AS IMAGE ---
function exportSetupAsImage(result, items) {
    window.showToast('Generating Image', 'Creating your setup image...', 'info');

    const { machineItem, powerItem, cartridgeItem, gripItem } = items;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size (optimized for social media: 1200x630)
    canvas.width = 1200;
    canvas.height = 630;

    // Colors matching the theme
    const colors = {
        background: '#f4f5f7',
        surface: '#ffffff',
        primary: '#FF6B35',
        secondary: '#004E89',
        text: '#121212',
        textSecondary: '#555555',
        border: '#e0e0e0',
        compatible: '#00AA44',
        conditional: '#FFB800',
        incompatible: '#DC3545'
    };

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f4f5f7');
    gradient.addColorStop(1, '#e8eaf0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header bar
    ctx.fillStyle = colors.primary;
    ctx.fillRect(0, 0, canvas.width, 80);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Equipment Compatibility Report', 40, 50);

    // Status badge
    const statusText = result.status.charAt(0).toUpperCase() + result.status.slice(1);
    const statusColor = result.status === 'compatible' ? colors.compatible :
                       result.status === 'conditional' ? colors.conditional : colors.incompatible;
    const statusIcon = result.status === 'compatible' ? '✓' :
                      result.status === 'conditional' ? '⚠' : '✗';

    ctx.fillStyle = statusColor;
    ctx.fillRect(40, 110, 200, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${statusIcon} ${statusText}`, 140, 143);

    // Cost
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 24px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Total: ${result.cost}`, canvas.width - 40, 143);

    // Equipment grid
    const startY = 190;
    const itemWidth = 260;
    const itemHeight = 340;
    const gap = 20;
    const startX = (canvas.width - (itemWidth * 4 + gap * 3)) / 2;

    const equipmentList = [
        { item: machineItem, label: 'Machine', icon: '🖊️' },
        { item: powerItem, label: 'Power Supply', icon: '⚡' },
        { item: cartridgeItem, label: 'Cartridge', icon: '💉' },
        { item: gripItem, label: 'Grip', icon: '✋' }
    ];

    // Draw equipment cards
    equipmentList.forEach((equipment, index) => {
        const x = startX + (itemWidth + gap) * index;
        const y = startY;

        // Card background
        ctx.fillStyle = colors.surface;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        roundRect(ctx, x, y, itemWidth, itemHeight, 12);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Category label
        ctx.fillStyle = colors.textSecondary;
        ctx.font = 'bold 14px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${equipment.icon} ${equipment.label}`, x + itemWidth / 2, y + 25);

        // Brand
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 18px Inter, Arial, sans-serif';
        ctx.fillText(equipment.item.brand, x + itemWidth / 2, y + 270);

        // Model (truncate if too long)
        let model = equipment.item.model;
        if (model.length > 20) {
            model = model.substring(0, 17) + '...';
        }
        ctx.fillStyle = colors.textSecondary;
        ctx.font = '14px Inter, Arial, sans-serif';
        ctx.fillText(model, x + itemWidth / 2, y + 295);

        // Price
        ctx.fillStyle = colors.primary;
        ctx.font = 'bold 16px Inter, Arial, sans-serif';
        ctx.fillText(equipment.item.price_range || 'N/A', x + itemWidth / 2, y + 320);
    });

    // Load and draw equipment images
    let imagesLoaded = 0;
    const totalImages = 4;

    equipmentList.forEach((equipment, index) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function() {
            const x = startX + (itemWidth + gap) * index;
            const y = startY;
            const imgSize = 180;
            const imgX = x + (itemWidth - imgSize) / 2;
            const imgY = y + 55;

            // Draw image
            ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                finalizeImage();
            }
        };

        img.onerror = function() {
            // Draw placeholder if image fails to load
            const x = startX + (itemWidth + gap) * index;
            const y = startY;
            const imgSize = 180;
            const imgX = x + (itemWidth - imgSize) / 2;
            const imgY = y + 55;

            ctx.fillStyle = colors.border;
            ctx.fillRect(imgX, imgY, imgSize, imgSize);
            ctx.fillStyle = colors.textSecondary;
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', imgX + imgSize / 2, imgY + imgSize / 2 + 16);

            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                finalizeImage();
            }
        };

        img.src = equipment.item.image_url;
    });

    function finalizeImage() {
        // Watermark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.font = 'bold 16px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generated by Poli International', canvas.width / 2, canvas.height - 20);
        ctx.font = '14px Inter, Arial, sans-serif';
        ctx.fillText('poliinternational.com', canvas.width / 2, canvas.height - 3);

        // Download image
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Poli-Equipment-Setup-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);

            window.showToast('Success!', 'Setup image downloaded successfully', 'success');
        }, 'image/png');
    }

    // Timeout fallback if images don't load
    setTimeout(() => {
        if (imagesLoaded < totalImages) {
            finalizeImage();
        }
    }, 5000);
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// --- URL PARSING & INITIALIZATION ---
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const machineId = params.get('machine');
    const powerId = params.get('power');
    const cartridgeId = params.get('cartridge');
    const gripId = params.get('grip');

    if (tab === 'build-your-setup' && machineId && powerId && cartridgeId && gripId) {
        document.querySelector(`.tab-nav__button[data-tab='build-your-setup']`).click();

        const machine = getItem('machine', machineId);
        const power = getItem('power', powerId);
        const cartridge = getItem('cartridge', cartridgeId);
        const grip = getItem('grip', gripId);
        
        if (machine && power && cartridge && grip) {
            document.getElementById('build-machine-search').value = `${machine.brand} - ${machine.model}`;
            document.getElementById('build-power-search').value = `${power.brand} - ${power.model}`;
            document.getElementById('build-cartridge-search').value = `${cartridge.brand} - ${cartridge.model}`;
            document.getElementById('build-grip-search').value = `${grip.brand} - ${grip.model}`;

            state.selected.build = { machine: machineId, power: powerId, cartridge: cartridgeId, grip: gripId };

            document.getElementById('check-full-setup-btn').click();
        }
    }
}

// --- COMPARE EQUIPMENT TAB ---
function setupCompareEquipment() {
    const resultDiv = document.getElementById('comparison-result');
    const compareBtn = document.getElementById('compare-items-btn');
    const clearBtn = document.getElementById('clear-comparison-btn');

    // State for comparison selections
    const compareState = {
        item1: null,
        item2: null,
        item3: null,
        item4: null
    };

    // Setup comboboxes for each comparison slot
    const onSelectItem1 = (type, id) => { compareState.item1 = { type, id }; };
    const onSelectItem2 = (type, id) => { compareState.item2 = { type, id }; };
    const onSelectItem3 = (type, id) => { compareState.item3 = { type, id }; };
    const onSelectItem4 = (type, id) => { compareState.item4 = { type, id }; };

    createSearchableCombobox('compare-item1-search', 'compare-item1-list', allItems, onSelectItem1);
    createSearchableCombobox('compare-item2-search', 'compare-item2-list', allItems, onSelectItem2);
    createSearchableCombobox('compare-item3-search', 'compare-item3-list', allItems, onSelectItem3);
    createSearchableCombobox('compare-item4-search', 'compare-item4-list', allItems, onSelectItem4);

    // Compare button handler
    compareBtn.addEventListener('click', () => {
        const items = [];

        // Collect selected items
        if (compareState.item1) {
            const item = getItem(compareState.item1.type, compareState.item1.id);
            if (item) items.push({ ...item, type: compareState.item1.type });
        }
        if (compareState.item2) {
            const item = getItem(compareState.item2.type, compareState.item2.id);
            if (item) items.push({ ...item, type: compareState.item2.type });
        }
        if (compareState.item3) {
            const item = getItem(compareState.item3.type, compareState.item3.id);
            if (item) items.push({ ...item, type: compareState.item3.type });
        }
        if (compareState.item4) {
            const item = getItem(compareState.item4.type, compareState.item4.id);
            if (item) items.push({ ...item, type: compareState.item4.type });
        }

        if (items.length < 2) {
            window.showToast('Select Items', 'Please select at least 2 items to compare', 'error');
            return;
        }

        renderComparisonTable(items);
        resultDiv.style.display = 'block';
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Clear button handler
    clearBtn.addEventListener('click', () => {
        document.getElementById('compare-item1-search').value = '';
        document.getElementById('compare-item2-search').value = '';
        document.getElementById('compare-item3-search').value = '';
        document.getElementById('compare-item4-search').value = '';

        compareState.item1 = null;
        compareState.item2 = null;
        compareState.item3 = null;
        compareState.item4 = null;

        resultDiv.style.display = 'none';
        window.showToast('Cleared', 'All selections cleared', 'success');
    });
}

function renderComparisonTable(items) {
    const resultDiv = document.getElementById('comparison-result');

    if (!items || items.length === 0) {
        resultDiv.innerHTML = `
            <div class="comparison-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                <h3>No Items Selected</h3>
                <p>Select at least 2 items above to compare their specifications</p>
            </div>
        `;
        return;
    }

    // Create table headers
    const headers = items.map(item => `
        <th>
            <div class="comparison-item-header">
                <img src="${item.image_url}" alt="${item.model}">
                <div class="comparison-item-name">
                    <span class="comparison-item-brand">${item.brand}</span>
                    <span class="comparison-item-model">${item.model}</span>
                </div>
            </div>
        </th>
    `).join('');

    // Define specifications to compare
    const specs = [
        { key: 'type', label: 'Type', formatter: (val) => val ? val.charAt(0).toUpperCase() + val.slice(1) : 'N/A' },
        { key: 'brand', label: 'Brand' },
        { key: 'model', label: 'Model' },
        { key: 'price_range', label: 'Price Range', formatter: (val) => val || 'N/A' },
        { key: 'connection_type', label: 'Connection Type', formatter: (val) => val || 'N/A' },
        { key: 'voltage_range', label: 'Voltage Range', formatter: (val) => val || 'N/A' },
        { key: 'motor_type', label: 'Motor Type', formatter: (val) => val || 'N/A' },
        { key: 'stroke_length', label: 'Stroke Length', formatter: (val) => val || 'N/A' },
        { key: 'weight', label: 'Weight', formatter: (val) => val || 'N/A' },
        { key: 'wireless', label: 'Wireless', formatter: (val) => val ? '<span class="comparison-value--check">✓ Yes</span>' : '<span class="comparison-value--cross">✗ No</span>' },
        { key: 'needle_config', label: 'Needle Configuration', formatter: (val) => val || 'N/A' },
        { key: 'membrane', label: 'Safety Membrane', formatter: (val) => val ? '<span class="comparison-value--check">✓ Yes</span>' : val === false ? '<span class="comparison-value--cross">✗ No</span>' : 'N/A' },
        { key: 'material', label: 'Material', formatter: (val) => val || 'N/A' },
        { key: 'compatibility_notes', label: 'Notes', formatter: (val) => val || 'Standard compatibility' }
    ];

    // Create table rows
    const rows = specs.map(spec => {
        // Check if any item has this property
        const hasProperty = items.some(item => item[spec.key] !== undefined && item[spec.key] !== null);
        if (!hasProperty) return ''; // Skip row if no items have this property

        const cells = items.map(item => {
            const value = item[spec.key];
            const formatted = spec.formatter ? spec.formatter(value) : (value || 'N/A');
            return `<td><span class="comparison-value">${formatted}</span></td>`;
        }).join('');

        return `
            <tr>
                <td>${spec.label}</td>
                ${cells}
            </tr>
        `;
    }).join('');

    resultDiv.innerHTML = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Specification</th>
                    ${headers}
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// --- TROUBLESHOOTING WIZARD ---
function setupTroubleshootingWizard() {
    const wizardState = {
        currentStep: 0,
        history: [],
        maxSteps: 5
    };

    const wizardQuestions = {
        start: {
            question: "What type of issue are you experiencing?",
            description: "Select the category that best describes your problem",
            options: [
                { id: 'connection', icon: '🔌', title: 'Connection Issues', description: 'Machine won\'t power on or connect' },
                { id: 'performance', icon: '⚡', title: 'Performance Problems', description: 'Machine runs but not properly' },
                { id: 'cartridge', icon: '💉', title: 'Cartridge Issues', description: 'Problems with needles or cartridges' },
                { id: 'setup', icon: '🔧', title: 'Setup Questions', description: 'Not sure if equipment will work together' }
            ]
        },
        connection: {
            question: "What specific connection problem are you having?",
            description: "Choose the issue that matches your situation",
            options: [
                { id: 'conn_nopower', icon: '⚫', title: 'No Power', description: 'Machine doesn\'t turn on at all' },
                { id: 'conn_loose', icon: '🔗', title: 'Loose Connection', description: 'Connection feels unstable or intermittent' },
                { id: 'conn_adapter', icon: '🔄', title: 'Wrong Connector Type', description: 'Plugs don\'t fit together' }
            ]
        },
        conn_nopower: {
            solution: true,
            title: '✓ Solution: No Power Troubleshooting',
            content: `
                <p><strong>Follow these steps to diagnose the issue:</strong></p>
                <ul>
                    <li><strong>Check Power Supply:</strong> Verify the power supply is plugged in and turned on. Look for an indicator light.</li>
                    <li><strong>Test Connections:</strong> Ensure RCA/clip cord is fully seated in both the machine and power supply.</li>
                    <li><strong>Try Different Cable:</strong> Test with a different RCA cord or clip cord to rule out cable failure.</li>
                    <li><strong>Voltage Settings:</strong> Make sure the power supply voltage is set correctly (typically 5-12V for rotary, 6-10V for coil).</li>
                    <li><strong>Battery Machines:</strong> If wireless, check if the battery is charged (usually 2-3 hours for full charge).</li>
                </ul>
                <div class="wizard-solution__recommendations">
                    <h5>💡 Recommendations:</h5>
                    <ul>
                        <li>Always use the manufacturer-recommended power supply</li>
                        <li>Check if your machine has a battery switch that needs to be in the "on" position</li>
                        <li>Contact the manufacturer if the machine is new and still under warranty</li>
                    </ul>
                </div>
            `
        },
        conn_loose: {
            solution: true,
            title: '✓ Solution: Loose Connection Fix',
            content: `
                <p><strong>Common causes and solutions:</strong></p>
                <ul>
                    <li><strong>Worn Connections:</strong> RCA connectors can become loose over time. Try gently bending the outer collar inward for a tighter fit.</li>
                    <li><strong>Clip Cord Issues:</strong> Ensure both prongs are making solid contact. Clean any oxidation with rubbing alcohol.</li>
                    <li><strong>Machine Jack:</strong> Some machines have adjustable connection ports. Check if yours can be tightened.</li>
                    <li><strong>Cable Quality:</strong> Cheap cables often have poor connections. Invest in quality cables from reputable brands.</li>
                </ul>
                <div class="wizard-solution__recommendations">
                    <h5>💡 Recommendations:</h5>
                    <ul>
                        <li>Consider upgrading to a higher-quality RCA cable with gold-plated connectors</li>
                        <li>Always disconnect power before adjusting connections</li>
                        <li>Keep spare cables on hand in case of failure mid-session</li>
                    </ul>
                </div>
            `
        },
        conn_adapter: {
            solution: true,
            title: '✓ Solution: Connector Type Mismatch',
            content: `
                <p><strong>Understanding connector types:</strong></p>
                <ul>
                    <li><strong>RCA:</strong> Modern single-plug connection (like audio cables). Most reliable and commonly used.</li>
                    <li><strong>Clip Cord:</strong> Older two-prong connection. Still functional but less stable than RCA.</li>
                    <li><strong>Wireless:</strong> Battery-powered machines that don't need cables at all.</li>
                </ul>
                <p><strong>Solutions:</strong></p>
                <ul>
                    <li><strong>Get an Adapter:</strong> RCA-to-Clip Cord adapters are available for about $10-20.</li>
                    <li><strong>Replace Cable:</strong> Buy the correct cable type for your setup (RCA or Clip Cord).</li>
                    <li><strong>Upgrade Power Supply:</strong> Most modern power supplies have both RCA and Clip Cord outputs.</li>
                </ul>
                <div class="wizard-solution__recommendations">
                    <h5>💡 Recommendations:</h5>
                    <ul>
                        <li>RCA is the industry standard - consider upgrading if you have clip cord equipment</li>
                        <li>Keep both cable types in your kit for maximum compatibility</li>
                        <li>Adapters work but direct connections are always more reliable</li>
                    </ul>
                </div>
            `
        },
        performance: {
            question: "What performance issue are you noticing?",
            description: "Describe what's happening with your machine",
            options: [
                { id: 'perf_weak', icon: '🐌', title: 'Weak Performance', description: 'Machine runs but feels underpowered' },
                { id: 'perf_inconsistent', icon: '📊', title: 'Inconsistent', description: 'Power fluctuates during use' },
                { id: 'perf_noise', icon: '🔊', title: 'Unusual Noise', description: 'Machine making strange sounds' }
            ]
        },
        perf_weak: {
            solution: true,
            title: '✓ Solution: Weak Machine Performance',
            content: `
                <p><strong>Common causes:</strong></p>
                <ul>
                    <li><strong>Low Voltage:</strong> Rotary machines typically need 5-12V, coil machines 6-10V. Increase voltage gradually.</li>
                    <li><strong>Power Supply Capacity:</strong> Some machines draw more power than budget supplies can deliver. Check amperage rating (2A minimum recommended).</li>
                    <li><strong>Battery Charge:</strong> For wireless machines, low battery causes weak performance. Charge fully before use.</li>
                    <li><strong>Needle/Cartridge Issue:</strong> Wrong configuration or damaged needles increase resistance. Try a fresh cartridge.</li>
                    <li><strong>Grip Fit:</strong> Too-tight grip can restrict needle movement. Ensure proper clearance.</li>
                </ul>
                <div class="wizard-solution__recommendations">
                    <h5>💡 Recommendations:</h5>
                    <ul>
                        <li>Start at manufacturer's recommended voltage and adjust up slowly</li>
                        <li>Upgrade to a higher-amperage power supply if issues persist</li>
                        <li>Match needle configuration to the work (larger configurations need more power)</li>
                    </ul>
                </div>
            `
        },
        cartridge: {
            question: "What's the issue with your cartridge?",
            description: "Select the problem you're experiencing",
            options: [
                { id: 'cart_fit', icon: '🔍', title: 'Doesn\'t Fit', description: 'Cartridge won\'t fit in the machine or grip' },
                { id: 'cart_leak', icon: '💧', title: 'Ink Leaking', description: 'Ink flowing back into machine' },
                { id: 'cart_membrane', icon: '🛡️', title: 'Membrane Questions', description: 'Confused about safety membranes' }
            ]
        },
        cart_leak: {
            solution: true,
            title: '✓ Solution: Ink Leakage Problem',
            content: `
                <p><strong>CRITICAL SAFETY ISSUE:</strong> Ink leaking into your machine can cause permanent damage and cross-contamination!</p>
                <ul>
                    <li><strong>Check for Safety Membrane:</strong> Not all cartridges have them. ALWAYS use membrane cartridges with rotary machines.</li>
                    <li><strong>Proper Installation:</strong> Ensure cartridge is fully seated and locked in place.</li>
                    <li><strong>Angle of Work:</strong> Working at extreme angles can cause leakage even with membranes.</li>
                    <li><strong>Overfilling:</strong> Don't overfill ink caps - this increases pressure and leakage risk.</li>
                    <li><strong>Damaged Cartridge:</strong> Inspect for cracks or tears in the membrane/housing.</li>
                </ul>
                <div class="wizard-solution__recommendations">
                    <h5>💡 Recommendations:</h5>
                    <ul>
                        <li><strong>STOP USING</strong> the machine immediately if you see ink inside the grip/motor housing</li>
                        <li>Clean the machine thoroughly with appropriate cleaners before continuing</li>
                        <li>Only use membrane cartridges from reputable manufacturers</li>
                        <li>Consider cartridges with integrated reservoirs for messy work</li>
                    </ul>
                </div>
            `
        },
        setup: {
            question: "What do you need help with?",
            description: "Choose your question type",
            options: [
                { id: 'setup_buying', icon: '🛒', title: 'Buying Advice', description: 'Want to know if equipment will work together' },
                { id: 'setup_upgrade', icon: '⬆️', title: 'Upgrade Path', description: 'Looking to upgrade existing equipment' },
                { id: 'setup_beginner', icon: '🌟', title: 'Beginner Setup', description: 'Building first professional kit' }
            ]
        },
        setup_buying: {
            solution: true,
            title: '✓ Using This Tool for Compatibility',
            content: `
                <p><strong>Use our compatibility checker:</strong></p>
                <ul>
                    <li><strong>"Check Compatibility" Tab:</strong> Test any two pieces of equipment to see if they work together.</li>
                    <li><strong>"Build Your Setup" Tab:</strong> Check a complete 4-piece setup (machine, power, cartridge, grip) all at once.</li>
                    <li><strong>"What Works With My Gear?" Tab:</strong> Enter one item and see all compatible options.</li>
                    <li><strong>Matrix View:</strong> Visual heatmap showing compatibility across multiple items at once.</li>
                </ul>
                <div class="wizard-solution__recommendations">
                    <h5>💡 Key Compatibility Rules:</h5>
                    <ul>
                        <li>RCA and Clip Cord connections need matching cables or adapters</li>
                        <li>Wireless machines don't need power supplies (but can be charged via USB)</li>
                        <li>Cartridge compatibility is mainly about grip size (most are universal)</li>
                        <li>Power supplies should be 2A+ capacity for reliable performance</li>
                        <li>Always check manufacturer specifications before purchasing</li>
                    </ul>
                </div>
            `
        }
    };

    function updateProgress() {
        const progress = (wizardState.currentStep / wizardState.maxSteps) * 100;
        document.getElementById('wizard-progress-fill').style.width = `${progress}%`;
        document.getElementById('wizard-step-text').textContent = `Step ${wizardState.currentStep + 1} of ${wizardState.maxSteps}`;
    }

    function renderQuestion(questionId) {
        const questionData = wizardQuestions[questionId];
        const questionDiv = document.getElementById('wizard-question');
        const optionsDiv = document.getElementById('wizard-options');
        const backBtn = document.getElementById('wizard-back-btn');

        if (questionData.solution) {
            // Render solution
            questionDiv.innerHTML = '';
            optionsDiv.innerHTML = `
                <div class="wizard-solution">
                    <h4>${questionData.title}</h4>
                    <div class="wizard-solution__content">
                        ${questionData.content}
                    </div>
                </div>
            `;
            backBtn.style.display = wizardState.history.length > 0 ? 'inline-flex' : 'none';
        } else {
            // Render question
            questionDiv.innerHTML = `
                <h4>${questionData.question}</h4>
                <p>${questionData.description}</p>
            `;

            optionsDiv.innerHTML = questionData.options.map(option => `
                <div class="wizard-option" data-next="${option.id}">
                    <span class="wizard-option__icon">${option.icon}</span>
                    <span class="wizard-option__title">${option.title}</span>
                    <span class="wizard-option__description">${option.description}</span>
                </div>
            `).join('');

            // Add click handlers to options
            optionsDiv.querySelectorAll('.wizard-option').forEach(option => {
                option.addEventListener('click', () => {
                    const nextId = option.dataset.next;
                    wizardState.history.push(questionId);
                    wizardState.currentStep++;
                    updateProgress();
                    renderQuestion(nextId);
                });
            });

            backBtn.style.display = wizardState.history.length > 0 ? 'inline-flex' : 'none';
        }
    }

    function restartWizard() {
        wizardState.currentStep = 0;
        wizardState.history = [];
        updateProgress();
        renderQuestion('start');
    }

    function goBack() {
        if (wizardState.history.length > 0) {
            const previousId = wizardState.history.pop();
            wizardState.currentStep--;
            updateProgress();
            renderQuestion(previousId);
        }
    }

    // Initialize wizard
    document.getElementById('wizard-restart-btn').addEventListener('click', restartWizard);
    document.getElementById('wizard-back-btn').addEventListener('click', goBack);
    restartWizard();
}

// --- APP INITIALIZATION ---
setupTabs();
setupCompatibilityChecker();
setupReverseLookup();
setupBuildASetup();
setupCompareEquipment();
setupSuggestGear();
setupTroubleshootingWizard();
parseUrlParams();

// Enable performance optimizations
enableLazyLoading();

// Log cache statistics (development only)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        console.log(`Performance Stats:
- Compatibility Cache: ${compatibilityCache.size} entries
- Matrix Cache: ${matrixCache.size} entries
- Lazy Loading: ${document.querySelectorAll('img[data-src]').length} images queued`);
    }, 2000);
}