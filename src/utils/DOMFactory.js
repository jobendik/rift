/**
 * Factory class for creating DOM elements with consistent styling and structure.
 * Implements the Factory pattern for standardized element creation across the UI.
 * Uses BEM methodology with the "rift-" prefix for CSS class names.
 * 
 * @author Cline
 */
class DOMFactory {
    /**
     * Create a DOM element with the specified options
     * @param {String} type - The type of DOM element to create
     * @param {Object} options - Options for creating the element
     * @param {String|Array} [options.className] - CSS class names
     * @param {String} [options.id] - Element ID
     * @param {String} [options.text] - Text content
     * @param {String} [options.html] - HTML content
     * @param {Object} [options.attributes] - HTML attributes
     * @param {Object} [options.styles] - CSS styles
     * @param {HTMLElement} [options.parent] - Parent element to append to
     * @param {Boolean} [options.appendToBody] - Whether to append to document body
     * @return {HTMLElement} The created element
     */    static createElement(type, options = {}) {
        // Handle the case where the first argument is an options object with a type property
        if (typeof type === 'object' && type !== null && type.type) {
            options = type;
            type = options.type;
        }
        
        const element = document.createElement(type);
        
        if (options.className && typeof options.className === 'string') {
            const classNames = Array.isArray(options.className) 
                ? options.className 
                : options.className.split(' ');
            
            // Filter out empty strings to prevent "empty token" error
            const validClassNames = classNames.filter(name => name && name.trim().length > 0);
            
            if (validClassNames.length > 0) {
                element.classList.add(...validClassNames);
            }
        }
        
        // Handle classes property as well (alternative to className)
        if (options.classes) {
            const classNames = Array.isArray(options.classes) 
                ? options.classes 
                : options.classes.split(' ');
            
            const validClassNames = classNames.filter(name => name && name.trim().length > 0);
            
            if (validClassNames.length > 0) {
                element.classList.add(...validClassNames);
            }
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.text) {
            element.textContent = options.text;
        }
        
        if (options.html) {
            element.innerHTML = options.html;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.styles) {
            Object.entries(options.styles).forEach(([prop, value]) => {
                element.style[prop] = value;
            });
        }
        
        if (options.parent) {
            options.parent.appendChild(element);
        } else if (options.appendToBody) {
            document.body.appendChild(element);
        }
        
        return element;
    }
    
    /**
     * Create a container div with the RIFT BEM convention
     * @param {String} blockName - The BEM block name (without the "rift-" prefix)
     * @param {Object} options - Options for creating the container
     * @return {HTMLElement} The created container
     */
    static createContainer(blockName, options = {}) {
        return this.createElement('div', {
            className: `rift-${blockName}`,
            ...options
        });
    }
    
    /**
     * Create a BEM element within a block
     * @param {String} blockName - The BEM block name (without the "rift-" prefix)
     * @param {String} elementName - The BEM element name
     * @param {Object} options - Options for creating the element
     * @return {HTMLElement} The created element
     */
    static createBEMElement(blockName, elementName, options = {}) {
        const bemClassName = `rift-${blockName}__${elementName}`;
        const classNames = options.className ? 
            `${bemClassName} ${options.className}` :
            bemClassName;
            
        return this.createElement('div', {
            ...options,
            className: classNames
        });
    }
    
    /**
     * Create a HUD section element
     * @param {String} id - The element ID
     * @param {String} initialText - Initial text content
     * @param {Object} options - Options for creating the element
     * @return {HTMLElement} The created HUD element
     */
    static createHUDElement(id, initialText = '', options = {}) {
        const section = this.createElement('section', {
            id,
            className: `rift-hud-element ${options.className || ''}`.trim(),
            appendToBody: options.appendToBody !== false
        });
        
        if (initialText) {
            this.createElement('div', {
                text: initialText,
                parent: section
            });
        }
        
        return section;
    }
    
    /**
     * Create a button with standard styling
     * @param {String} text - Button text
     * @param {Function} onClick - Click handler
     * @param {Object} options - Additional options
     * @return {HTMLElement} The created button
     */
    static createButton(text, onClick, options = {}) {
        const button = this.createElement('button', {
            text,
            className: `rift-button ${options.className || ''}`.trim(),
            ...options
        });
        
        if (typeof onClick === 'function') {
            button.addEventListener('click', onClick);
        }
        
        return button;
    }
    
    /**
     * Create an icon element
     * @param {String} iconName - The icon name/type
     * @param {Object} options - Additional options
     * @return {HTMLElement} The created icon element
     */
    static createIcon(iconName, options = {}) {
        return this.createElement('span', {
            className: `rift-icon rift-icon--${iconName} ${options.className || ''}`.trim(),
            ...options
        });
    }
    
    /**
     * Create a notification element
     * @param {String} text - Notification text
     * @param {String} type - Notification type (info, warning, error, success)
     * @param {Object} options - Additional options
     * @return {HTMLElement} The created notification
     */
    static createNotification(text, type = 'info', options = {}) {
        const notification = this.createElement('div', {
            className: `rift-notification rift-notification--${type} ${options.className || ''}`.trim(),
            ...options
        });
        
        // Create icon based on type
        let iconContent = '';
        switch (type) {
            case 'info': iconContent = 'ℹ️'; break;
            case 'warning': iconContent = '⚠️'; break;
            case 'error': iconContent = '❌'; break;
            case 'success': iconContent = '✅'; break;
            case 'objective': iconContent = '🎯'; break;
            case 'weapon': iconContent = '🔫'; break;
            case 'powerup': iconContent = '⚡'; break;
            default: iconContent = 'ℹ️';
        }
        
        this.createElement('span', {
            className: 'rift-notification__icon',
            text: iconContent,
            parent: notification
        });
        
        this.createElement('span', {
            className: 'rift-notification__text',
            text: text,
            parent: notification
        });
        
        return notification;
    }
    
    /**
     * Create a progress bar
     * @param {Number} value - Initial value (0-100)
     * @param {Object} options - Additional options
     * @return {Object} Object containing container and fill elements
     */
    static createProgressBar(value = 100, options = {}) {
        const container = this.createElement('div', {
            className: `rift-progress ${options.className || ''}`.trim(),
            ...options
        });
        
        const fill = this.createElement('div', {
            className: 'rift-progress__fill',
            styles: { width: `${Math.max(0, Math.min(100, value))}%` },
            parent: container
        });
        
        return { container, fill };
    }
    
    /**
     * Create a modal dialog
     * @param {String} title - Modal title
     * @param {String|HTMLElement} content - Modal content (HTML string or element)
     * @param {Object} options - Additional options
     * @return {Object} Object containing modal elements and methods
     */
    static createModal(title, content, options = {}) {
        const overlay = this.createElement('div', {
            className: 'rift-modal-overlay',
            appendToBody: true
        });
        
        const modal = this.createElement('div', {
            className: `rift-modal ${options.className || ''}`.trim(),
            parent: overlay
        });
        
        const header = this.createElement('div', {
            className: 'rift-modal__header',
            parent: modal
        });
        
        const titleElement = this.createElement('h2', {
            className: 'rift-modal__title',
            text: title,
            parent: header
        });
        
        const closeButton = this.createElement('button', {
            className: 'rift-modal__close',
            text: '×',
            parent: header
        });
        
        const body = this.createElement('div', {
            className: 'rift-modal__body',
            parent: modal
        });
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        
        const footer = this.createElement('div', {
            className: 'rift-modal__footer',
            parent: modal
        });
        
        const close = () => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        };
        
        closeButton.addEventListener('click', close);
        
        if (options.closeOnOverlayClick !== false) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    close();
                }
            });
        }
        
        // Optional duration after which to auto-close
        if (options.duration) {
            setTimeout(close, options.duration);
        }
        
        return {
            overlay,
            modal,
            header,
            title: titleElement,
            body,
            footer,
            close
        };
    }
}

// Add default export while maintaining named export for backward compatibility
export { DOMFactory };
export default DOMFactory;
