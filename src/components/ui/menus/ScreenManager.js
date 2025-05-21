/**
 * ScreenManager.js
 * Handles screen transitions, modal overlays, and focus management
 */

import UIComponent from '../UIComponent.js';
import EventManager from '../../../core/EventManager.js';
import DOMFactory from '../../../utils/DOMFactory.js';
import UIConfig from '../../../core/UIConfig.js';

export default class ScreenManager extends UIComponent {
    constructor(options = {}) {
        super({
            id: 'screen-manager',
            className: 'rift-screen-manager',
            ...options
        });
        
        // Configuration
        this.config = UIConfig.menus.screens;
        
        // State tracking
        this.currentScreen = null;
        this.previousScreen = null;
        this.activeModal = null;
        this.screenHistory = [];
        this.screens = new Map();
        this.modals = new Map();
        this.isTransitioning = false;
        
        // Focus management
        this.lastFocusedElement = null;
        this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        
        // Bind methods
        this._bindMethods();
    }
    
    /**
     * Initialize the screen manager
     */
    init() {
        this._createScreenManagerElements();
        this._setupEventListeners();
        
        // Register this component with UIManager
        if (this.uiManager) {
            this.uiManager.registerSystem('screenManager', this);
        }
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Register a screen with the screen manager
     * @param {string} id - Screen identifier
     * @param {Object} options - Screen options
     * @param {string} options.title - Screen title
     * @param {Function} options.onShow - Callback when screen is shown
     * @param {Function} options.onHide - Callback when screen is hidden
     * @param {string} options.className - Additional class name
     * @param {string} options.template - HTML template for the screen content
     * @param {boolean} options.allowBackNav - Whether back navigation is allowed
     * @returns {HTMLElement} The screen element
     */
    registerScreen(id, options = {}) {
        if (this.screens.has(id)) {
            console.warn(`Screen "${id}" is already registered`);
            return this.screens.get(id).element;
        }
        
        const screenContainer = DOMFactory.createElement('div', {
            id: `screen-${id}`,
            className: `rift-screen ${options.className || ''}`,
            parent: this.screenContainer
        });
        
        // Create backdrop element
        const backdrop = DOMFactory.createElement('div', {
            className: 'rift-screen__backdrop',
            parent: screenContainer
        });
        
        // Create content container
        const content = DOMFactory.createElement('div', {
            className: 'rift-screen__content',
            parent: screenContainer
        });
        
        // Create navigation if back is allowed
        if (options.allowBackNav) {
            const nav = DOMFactory.createElement('div', {
                className: 'rift-screen__nav',
                parent: content
            });
            
            const backButton = DOMFactory.createElement('button', {
                className: 'rift-screen__back-button',
                textContent: 'Back',
                parent: nav,
                attributes: {
                    'aria-label': 'Go back',
                    'tabindex': '0'
                }
            });
            
            backButton.addEventListener('click', () => this.goBack());
        }
        
        // Add title if provided
        if (options.title) {
            DOMFactory.createElement('h2', {
                className: 'rift-screen__title',
                textContent: options.title,
                parent: content
            });
        }
        
        // Create screen content area
        const screenContent = DOMFactory.createElement('div', {
            className: 'rift-screen__body',
            parent: content
        });
        
        // Add HTML template if provided
        if (options.template) {
            screenContent.innerHTML = options.template;
        }
        
        // Store screen information
        this.screens.set(id, {
            element: screenContainer,
            content: screenContent,
            backdrop: backdrop,
            options: options,
            id: id
        });
        
        return screenContainer;
    }
    
    /**
     * Register a modal with the screen manager
     * @param {string} id - Modal identifier
     * @param {Object} options - Modal options
     * @param {string} options.title - Modal title
     * @param {Function} options.onShow - Callback when modal is shown
     * @param {Function} options.onHide - Callback when modal is hidden
     * @param {string} options.className - Additional class name
     * @param {string} options.template - HTML template for the modal content
     * @returns {HTMLElement} The modal element
     */
    registerModal(id, options = {}) {
        if (this.modals.has(id)) {
            console.warn(`Modal "${id}" is already registered`);
            return this.modals.get(id).element;
        }
        
        // Create backdrop
        const backdrop = DOMFactory.createElement('div', {
            id: `modal-backdrop-${id}`,
            className: 'rift-modal__backdrop',
            parent: document.body
        });
        
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop && options.closeOnBackdropClick !== false) {
                this.hideModal(id);
            }
        });
        
        // Create modal
        const modal = DOMFactory.createElement('div', {
            id: `modal-${id}`,
            className: `rift-modal ${options.className || ''}`,
            parent: document.body
        });
        
        // Add title if provided
        if (options.title) {
            DOMFactory.createElement('h3', {
                className: 'rift-modal__title',
                textContent: options.title,
                parent: modal
            });
        }
        
        // Add close button
        const closeButton = DOMFactory.createElement('button', {
            className: 'rift-modal__close',
            textContent: '×',
            parent: modal,
            attributes: {
                'aria-label': 'Close modal',
                'tabindex': '0'
            }
        });
        
        closeButton.addEventListener('click', () => this.hideModal(id));
        
        // Create modal content area
        const modalContent = DOMFactory.createElement('div', {
            className: 'rift-modal__content',
            parent: modal
        });
        
        // Add HTML template if provided
        if (options.template) {
            modalContent.innerHTML = options.template;
        }
        
        // Store modal information
        this.modals.set(id, {
            element: modal,
            backdrop: backdrop,
            content: modalContent,
            options: options,
            id: id
        });
        
        return modal;
    }
    
    /**
     * Show a screen with transition
     * @param {string} id - Screen identifier
     * @param {Object} options - Show options
     * @param {string} options.transition - Transition type (fade, slide-left, slide-right, scale)
     * @param {boolean} options.addToHistory - Whether to add to navigation history
     * @param {Object} options.data - Data to pass to the screen's onShow callback
     */
    showScreen(id, options = {}) {
        if (!this.screens.has(id)) {
            console.error(`Screen "${id}" is not registered`);
            return this;
        }
        
        if (this.isTransitioning) {
            // Queue this transition or cancel current, depending on implementation
            console.warn('Transition already in progress, aborting');
            return this;
        }
        
        this.isTransitioning = true;
        
        const screen = this.screens.get(id);
        const previousScreen = this.currentScreen ? this.screens.get(this.currentScreen) : null;
        const transitionType = options.transition || this.config.defaultTransition;
        
        // Set previous screen for back navigation
        if (this.currentScreen && options.addToHistory !== false) {
            this.previousScreen = this.currentScreen;
            this.screenHistory.push(this.currentScreen);
        }
        
        // Store new current screen
        this.currentScreen = id;
        
        // Save current focused element
        this.lastFocusedElement = document.activeElement;
        
        // Apply transition classes
        if (previousScreen) {
            switch (transitionType) {
                case 'fade':
                    previousScreen.element.classList.add('rift-screen--fade-out');
                    screen.element.classList.add('rift-screen--fade-in');
                    break;
                    
                case 'slide-left':
                    previousScreen.element.classList.add('rift-screen--slide-out-left');
                    screen.element.classList.add('rift-screen--slide-in-right');
                    break;
                    
                case 'slide-right':
                    previousScreen.element.classList.add('rift-screen--slide-out-right');
                    screen.element.classList.add('rift-screen--slide-in-left');
                    break;
                    
                case 'scale':
                    previousScreen.element.classList.add('rift-screen--scale-out');
                    screen.element.classList.add('rift-screen--scale-in');
                    break;
            }
            
            // Remove active class from previous screen
            previousScreen.element.classList.remove('rift-screen--active');
            
            // Call onHide callback if defined
            if (previousScreen.options.onHide) {
                previousScreen.options.onHide();
            }
        }
        
        // Add active class to new screen immediately
        screen.element.classList.add('rift-screen--active');
        
        // Emit event
        EventManager.emit('screen:show', { 
            id: id, 
            element: screen.element,
            data: options.data || {}
        });
        
        // Call onShow callback if defined
        if (screen.options.onShow) {
            screen.options.onShow(options.data || {});
        }
        
        // Set up focus management for the screen
        this._trapFocus(screen.element);
        
        // Set up transition end handling
        const transitionEndHandler = () => {
            this._handleTransitionEnd(screen, previousScreen);
        };
        
        screen.element.addEventListener('transitionend', transitionEndHandler, { once: true });
        
        // If no transition happens, ensure we still complete the process
        setTimeout(transitionEndHandler, this.config.transitionDuration * 1000 + 50);
        
        return this;
    }
    
    /**
     * Hide the current screen
     * @param {Object} options - Hide options
     * @param {string} options.transition - Transition type
     * @returns {ScreenManager} this instance for chaining
     */
    hideScreen(options = {}) {
        if (!this.currentScreen) {
            return this;
        }
        
        const screen = this.screens.get(this.currentScreen);
        const transitionType = options.transition || this.config.defaultTransition;
        
        this.isTransitioning = true;
        
        // Apply transition class
        switch (transitionType) {
            case 'fade':
                screen.element.classList.add('rift-screen--fade-out');
                break;
                
            case 'slide-left':
                screen.element.classList.add('rift-screen--slide-out-left');
                break;
                
            case 'slide-right':
                screen.element.classList.add('rift-screen--slide-out-right');
                break;
                
            case 'scale':
                screen.element.classList.add('rift-screen--scale-out');
                break;
        }
        
        // Remove active class
        screen.element.classList.remove('rift-screen--active');
        
        // Restore focus
        this._restoreFocus();
        
        // Call onHide callback if defined
        if (screen.options.onHide) {
            screen.options.onHide();
        }
        
        // Emit event
        EventManager.emit('screen:hide', { 
            id: this.currentScreen, 
            element: screen.element 
        });
        
        const previousScreen = this.currentScreen;
        this.currentScreen = null;
        
        // Set up transition end handling
        const transitionEndHandler = () => {
            // Clean up animation classes
            if (screen && screen.element) {
                this._cleanupTransitionClasses(screen.element);
            }
            
            this.isTransitioning = false;
            
            // Emit completion event
            EventManager.emit('screen:hidden', { id: previousScreen });
        };
        
        screen.element.addEventListener('transitionend', transitionEndHandler, { once: true });
        
        // Ensure cleanup even if transition fails
        setTimeout(transitionEndHandler, this.config.transitionDuration * 1000 + 50);
        
        return this;
    }
    
    /**
     * Navigate back to the previous screen
     * @param {Object} options - Navigation options
     * @returns {ScreenManager} this instance for chaining
     */
    goBack(options = {}) {
        if (this.screenHistory.length === 0) {
            return this;
        }
        
        // Pop the current screen from history (it's already displayed)
        const previousScreen = this.screenHistory.pop();
        
        // Show the previous screen with a right-to-left transition
        return this.showScreen(previousScreen, {
            transition: 'slide-right',
            addToHistory: false,
            ...options
        });
    }
    
    /**
     * Show a modal dialog
     * @param {string} id - Modal identifier
     * @param {Object} options - Show options
     * @param {Object} options.data - Data to pass to the modal's onShow callback
     * @returns {ScreenManager} this instance for chaining
     */
    showModal(id, options = {}) {
        if (!this.modals.has(id)) {
            console.error(`Modal "${id}" is not registered`);
            return this;
        }
        
        const modal = this.modals.get(id);
        
        // Hide any currently active modal
        if (this.activeModal) {
            this.hideModal(this.activeModal);
        }
        
        // Save active modal
        this.activeModal = id;
        
        // Save currently focused element
        this.lastFocusedElement = document.activeElement;
        
        // Show backdrop and modal
        modal.backdrop.classList.add('rift-modal__backdrop--active');
        modal.element.classList.add('rift-modal--active');
        
        // Trap focus within modal
        this._trapFocus(modal.element);
        
        // Call onShow callback if defined
        if (modal.options.onShow) {
            modal.options.onShow(options.data || {});
        }
        
        // Emit event
        EventManager.emit('modal:show', { 
            id: id, 
            element: modal.element,
            data: options.data || {}
        });
        
        return this;
    }
    
    /**
     * Hide a modal dialog
     * @param {string} id - Modal identifier
     * @returns {ScreenManager} this instance for chaining
     */
    hideModal(id) {
        if (!this.modals.has(id)) {
            console.error(`Modal "${id}" is not registered`);
            return this;
        }
        
        const modal = this.modals.get(id);
        
        // Hide backdrop and modal
        modal.backdrop.classList.remove('rift-modal__backdrop--active');
        modal.element.classList.remove('rift-modal--active');
        
        // Clear active modal reference
        this.activeModal = null;
        
        // Restore focus
        this._restoreFocus();
        
        // Call onHide callback if defined
        if (modal.options.onHide) {
            modal.options.onHide();
        }
        
        // Emit event
        EventManager.emit('modal:hide', { 
            id: id, 
            element: modal.element 
        });
        
        return this;
    }
    
    /**
     * Update the screen manager (called each frame)
     * @param {number} delta - Time elapsed since last update in seconds
     * @returns {ScreenManager} this instance for chaining
     */
    update(delta) {
        // No continuous updates required for this component
        return this;
    }
    
    /**
     * Clean up resources when component is disposed
     */
    dispose() {
        // Remove event listeners
        window.removeEventListener('keydown', this._handleKeyDown);
        
        // Clean up screens
        this.screens.forEach(screen => {
            if (screen.element && screen.element.parentNode) {
                screen.element.parentNode.removeChild(screen.element);
            }
        });
        
        // Clean up modals
        this.modals.forEach(modal => {
            if (modal.element && modal.element.parentNode) {
                modal.element.parentNode.removeChild(modal.element);
            }
            if (modal.backdrop && modal.backdrop.parentNode) {
                modal.backdrop.parentNode.removeChild(modal.backdrop);
            }
        });
        
        // Call parent dispose method to handle common cleanup
        super.dispose();
    }
    
    /**
     * Handle transition end events
     * @private
     * @param {Object} screen - The screen that was shown
     * @param {Object} previousScreen - The screen that was hidden
     */
    _handleTransitionEnd(screen, previousScreen) {
        // Clean up animation classes
        this._cleanupTransitionClasses(screen.element);
        
        if (previousScreen && previousScreen.element) {
            this._cleanupTransitionClasses(previousScreen.element);
        }
        
        // End transition state
        this.isTransitioning = false;
        
        // Emit completion event
        EventManager.emit('screen:shown', { 
            id: this.currentScreen, 
            element: screen.element 
        });
    }
    
    /**
     * Clean up transition classes from an element
     * @private
     * @param {HTMLElement} element - The element to clean up
     */
    _cleanupTransitionClasses(element) {
        element.classList.remove(
            'rift-screen--fade-in',
            'rift-screen--fade-out',
            'rift-screen--slide-in-left',
            'rift-screen--slide-out-left',
            'rift-screen--slide-in-right',
            'rift-screen--slide-out-right',
            'rift-screen--scale-in',
            'rift-screen--scale-out'
        );
    }
    
    /**
     * Create DOM elements for the screen manager
     * @private
     */
    _createScreenManagerElements() {
        // Create screen container
        this.screenContainer = DOMFactory.createElement('div', {
            className: 'rift-screen-manager__container',
            parent: this.element
        });
    }
    
    /**
     * Bind class methods to the instance
     * @private
     */
    _bindMethods() {
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._trapFocus = this._trapFocus.bind(this);
        this._restoreFocus = this._restoreFocus.bind(this);
        this.showScreen = this.showScreen.bind(this);
        this.hideScreen = this.hideScreen.bind(this);
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);
        this.goBack = this.goBack.bind(this);
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Handle escape key for modals
        window.addEventListener('keydown', this._handleKeyDown);
        
        // Register events
        this.registerEvents({
            'ui:showScreen': ({ id, options }) => this.showScreen(id, options),
            'ui:hideScreen': (options) => this.hideScreen(options),
            'ui:showModal': ({ id, options }) => this.showModal(id, options),
            'ui:hideModal': ({ id }) => this.hideModal(id),
            'ui:goBack': (options) => this.goBack(options)
        });
    }
    
    /**
     * Handle keyboard events
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    _handleKeyDown(event) {
        // Handle escape key
        if (event.key === 'Escape' || event.keyCode === 27) {
            // Close any active modal first
            if (this.activeModal) {
                this.hideModal(this.activeModal);
                event.preventDefault();
                return;
            }
            
            // Otherwise, try to go back
            if (this.currentScreen && this.screenHistory.length > 0) {
                this.goBack();
                event.preventDefault();
            }
        }
        
        // Handle tab key for focus trapping
        if (event.key === 'Tab' || event.keyCode === 9) {
            const container = this.activeModal 
                ? this.modals.get(this.activeModal).element
                : this.currentScreen 
                    ? this.screens.get(this.currentScreen).element 
                    : null;
                    
            if (container) {
                const focusableElements = 
                    container.querySelectorAll(this.focusableElements);
                
                if (focusableElements.length > 0) {
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    // Trap focus in the container
                    if (event.shiftKey && document.activeElement === firstElement) {
                        lastElement.focus();
                        event.preventDefault();
                    } else if (!event.shiftKey && document.activeElement === lastElement) {
                        firstElement.focus();
                        event.preventDefault();
                    }
                }
            }
        }
    }
    
    /**
     * Set up focus management for a container
     * @private
     * @param {HTMLElement} container - The container to trap focus within
     */
    _trapFocus(container) {
        if (!container) return;
        
        // Find all focusable elements
        const focusableElements = container.querySelectorAll(this.focusableElements);
        
        // Focus the first element after a short delay (allow transitions to start)
        if (focusableElements.length > 0) {
            setTimeout(() => {
                focusableElements[0].focus();
            }, 50);
        } else {
            // If no focusable elements, focus the container itself
            container.setAttribute('tabindex', '-1');
            container.focus();
        }
        
        // Add class to indicate keyboard focus
        container.addEventListener('focusin', (event) => {
            const target = event.target;
            // Add focus outline class to the focused element
            if (target.classList && !target.classList.contains('rift-focus-outline')) {
                target.classList.add('rift-focus-outline');
            }
        });
        
        container.addEventListener('focusout', (event) => {
            const target = event.target;
            // Remove focus outline class
            if (target.classList && target.classList.contains('rift-focus-outline')) {
                target.classList.remove('rift-focus-outline');
            }
        });
    }
    
    /**
     * Restore focus to the previously focused element
     * @private
     */
    _restoreFocus() {
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
    }
}
