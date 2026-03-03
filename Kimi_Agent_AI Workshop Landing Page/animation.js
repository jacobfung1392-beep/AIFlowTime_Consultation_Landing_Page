/**
 * Scroll-Triggered Animation System
 * Uses Intersection Observer for performant scroll animations
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1,
        revealClass: 'is-visible',
        selector: '.scroll-reveal'
    };

    /**
     * Initialize scroll animations
     */
    function initScrollAnimations() {
        const elements = document.querySelectorAll(CONFIG.selector);
        
        if (elements.length === 0) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Show all elements immediately without animation
            elements.forEach(el => el.classList.add(CONFIG.revealClass));
            return;
        }

        // Create Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add visible class with a small delay for natural feel
                    requestAnimationFrame(() => {
                        entry.target.classList.add(CONFIG.revealClass);
                    });
                    
                    // Stop observing this element (animate once)
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: CONFIG.rootMargin,
            threshold: CONFIG.threshold
        });

        // Observe all scroll-reveal elements
        elements.forEach(el => observer.observe(el));
    }

    /**
     * Refresh animations (useful for dynamically added content)
     */
    function refreshAnimations() {
        // Remove visible class from all elements
        const elements = document.querySelectorAll(CONFIG.selector);
        elements.forEach(el => el.classList.remove(CONFIG.revealClass));
        
        // Re-initialize
        initScrollAnimations();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollAnimations);
    } else {
        initScrollAnimations();
    }

    // Expose API for external use
    window.ScrollAnimations = {
        init: initScrollAnimations,
        refresh: refreshAnimations,
        config: CONFIG
    };

})();
