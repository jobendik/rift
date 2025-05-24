/**
 * ElementPool - A utility class for DOM element pooling
 * 
 * Provides efficient reuse of DOM elements to reduce creation/destruction overhead.
 * Particularly useful for frequently created elements like damage numbers, hit markers,
 * notifications, etc.
 * 
 * @author Cline
 */

import { DOMFactory } from './DOMFactory.js';
import { UIConfig } from '../core/UIConfig.js';

class ElementPool {
    /**
     * Create a new element pool
     * 
     * @param {Object} options - Pool configuration options
     * @param {string} options.elementType - The type of element to create ('div', 'span', etc.)
     * @param {function} [options.createFn] - Custom function to create elements (override default creation)
     * @param {function} [options.resetFn] - Custom function to reset elements (override default reset)
     * @param {HTMLElement} [options.container] - Parent container to attach elements to
     * @param {string} [options.className] - Base class name to apply to all elements
     * @param {number} [options.initialSize=10] - Initial number of elements to pre-create
     * @param {number} [options.growSize=5] - Number of elements to create when pool is empty
     * @param {number} [options.maxSize=100] - Maximum number of elements the pool can grow to
     * @param {boolean} [options.useBlocks=true] - Whether to use "block" system for DOM insertion optimization
     * @param {number} [options.blockSize=10] - Number of elements per container block when using blocks
     */
    constructor(options) {
        if (!options || !options.elementType) {
            throw new Error('ElementPool requires at least an elementType option');
        }

        // Core options
        this.elementType = options.elementType;
        this.createFn = options.createFn || this._defaultCreateFn.bind(this);
        this.resetFn = options.resetFn || this._defaultResetFn.bind(this);
        this.container = options.container || document.body;
        this.className = options.className || '';

        // Sizing options
        this.initialSize = options.initialSize || 10;
        this.growSize = options.growSize || 5;
        this.maxSize = options.maxSize || 100;
        
        // Block system for more efficient DOM operations
        this.useBlocks = options.useBlocks !== false; // Default to true
        this.blockSize = options.blockSize || 10;
        
        // State tracking
        this.pool = []; // Available elements
        this.inUse = new Set(); // Currently active elements
        this.blocks = []; // Container blocks when using block system
        
        // Stats
        this.stats = {
            created: 0,
            acquired: 0,
            released: 0,
            maxUsed: 0,
            outOfPoolCount: 0
        };
        
        // Initialize the pool
        this._initialize();
    }

    /**
     * Initialize the element pool by creating the initial set of elements
     * @private
     */
    _initialize() {
        if (this.useBlocks) {
            // Create the first block container
            this._createBlock();
        }
        
        // Create initial elements
        this._growPool(this.initialSize);
    }
    
    /**
     * Create a new block container for elements
     * @private
     * @returns {HTMLElement} The created block element
     */
    _createBlock() {
        const block = document.createElement('div');
        block.className = 'rift-element-pool-block';
        block.style.display = 'contents'; // Ensures no visual impact
        this.container.appendChild(block);
        this.blocks.push(block);
        return block;
    }

    /**
     * Acquire an element from the pool
     * 
     * @param {Object} [options] - Options for this specific element
     * @returns {Object} An object containing the element and a release method
     */
    acquire(options = {}) {
        this.stats.acquired++;
        
        // Track maximum used
        const currentlyUsed = this.inUse.size + 1;
        if (currentlyUsed > this.stats.maxUsed) {
            this.stats.maxUsed = currentlyUsed;
        }
        
        // Check if we need to grow the pool
        if (this.pool.length === 0) {
            // Only grow if we haven't hit the max size
            if (this.inUse.size < this.maxSize) {
                this._growPool(this.growSize);
            } else {
                this.stats.outOfPoolCount++;
                console.warn(`ElementPool warning: Pool exhausted (${this.inUse.size} elements in use)`);
                
                // Return a temporary element that won't be tracked
                // This prevents critical failures at the cost of some performance
                const tempElement = this.createFn(options);
                return {
                    element: tempElement,
                    isTemporary: true,
                    release: () => {
                        if (tempElement.parentNode) {
                            tempElement.parentNode.removeChild(tempElement);
                        }
                    }
                };
            }
        }
        
        // Get an element from the pool
        const element = this.pool.pop();
        
        // Track its usage
        this.inUse.add(element);
        
        // Create release function bound to this element
        const release = () => this.release(element);
        
        // Return element with its release method
        return { element, release };
    }

    /**
     * Release an element back to the pool
     * 
     * @param {HTMLElement} element - The element to return to the pool
     * @returns {boolean} True if the element was successfully released
     */
    release(element) {
        // Skip if this element is not tracked by this pool
        if (!this.inUse.has(element)) {
            return false;
        }
        
        this.stats.released++;
        
        // Remove from in-use set
        this.inUse.delete(element);
        
        // Reset to clean state
        this.resetFn(element);
        
        // Return to pool
        this.pool.push(element);
        
        return true;
    }

    /**
     * Release all elements currently in use
     * 
     * @returns {number} The number of elements released
     */
    releaseAll() {
        const count = this.inUse.size;
        
        // Convert set to array to avoid modification during iteration
        const elementsToRelease = Array.from(this.inUse);
        
        // Release each element
        elementsToRelease.forEach(element => {
            this.release(element);
        });
        
        return count;
    }

    /**
     * Grow the pool by creating additional elements
     * 
     * @private
     * @param {number} count - Number of elements to add
     */
    _growPool(count) {
        // Calculate how many we can actually add (respect maxSize)
        const actualCount = Math.min(count, this.maxSize - (this.pool.length + this.inUse.size));
        
        if (actualCount <= 0) return;
        
        // If using blocks, determine which block to add to or create new block
        let targetBlock;
        if (this.useBlocks) {
            // Find the last block that isn't full
            const lastBlock = this.blocks[this.blocks.length - 1];
            if (!lastBlock || lastBlock.childNodes.length >= this.blockSize) {
                targetBlock = this._createBlock();
            } else {
                targetBlock = lastBlock;
            }
        }
        
        // Create elements
        for (let i = 0; i < actualCount; i++) {
            const element = this.createFn();
            this.stats.created++;
            
            // Add to appropriate container
            if (this.useBlocks) {
                // Add to the current target block
                targetBlock.appendChild(element);
                
                // Check if this block is full and we need a new one
                if (targetBlock.childNodes.length >= this.blockSize && i < actualCount - 1) {
                    targetBlock = this._createBlock();
                }
            } else {
                // Add directly to the main container
                this.container.appendChild(element);
            }
            
            // Add to available pool
            this.pool.push(element);
        }
    }

    /**
     * Default function to create a new element
     * 
     * @private
     * @param {Object} [options] - Options for element creation
     * @returns {HTMLElement} The created element
     */
    _defaultCreateFn(options = {}) {
        // Use DOMFactory with the correct signature
        return DOMFactory.createElement(this.elementType, {
            className: this.className,
            ...options
        });
    }

    /**
     * Default function to reset an element to its clean state
     * 
     * @private
     * @param {HTMLElement} element - The element to reset
     */
    _defaultResetFn(element) {
        // Reset basic properties
        element.textContent = '';
        element.className = this.className || '';
        
        // Remove inline styles but preserve display:none to keep invisible
        const displayValue = element.style.display;
        element.style = '';
        if (displayValue === 'none') {
            element.style.display = 'none';
        }
        
        // Remove all attributes except class
        Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'class') {
                element.removeAttribute(attr.name);
            }
        });
        
        // Clear all children if any remain
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        
        // Ensure the element is detached from any non-pool parent
        if (element.parentNode && !this.blocks.includes(element.parentNode) && element.parentNode !== this.container) {
            element.parentNode.removeChild(element);
            
            // Re-attach to the appropriate container
            if (this.useBlocks) {
                // Find a block with space or create a new one
                let targetBlock = this.blocks.find(block => block.childNodes.length < this.blockSize);
                if (!targetBlock) {
                    targetBlock = this._createBlock();
                }
                targetBlock.appendChild(element);
            } else {
                this.container.appendChild(element);
            }
        }
    }

    /**
     * Get statistics about this element pool
     * 
     * @returns {Object} Pool statistics
     */
    getStats() {
        return {
            ...this.stats,
            available: this.pool.length,
            inUse: this.inUse.size,
            total: this.pool.length + this.inUse.size,
            maxSize: this.maxSize,
            utilization: this.stats.maxUsed / this.maxSize
        };
    }

    /**
     * Dispose the element pool, removing all elements
     * 
     * @param {boolean} [removeElements=true] - Whether to remove elements from the DOM
     */
    dispose(removeElements = true) {
        // Release all elements first
        this.releaseAll();
        
        if (removeElements) {
            // Remove all elements
            this.pool.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Remove block containers
            this.blocks.forEach(block => {
                if (block.parentNode) {
                    block.parentNode.removeChild(block);
                }
            });
        }
        
        // Clear all tracking collections
        this.pool = [];
        this.inUse.clear();
        this.blocks = [];
    }
}

export { ElementPool };
