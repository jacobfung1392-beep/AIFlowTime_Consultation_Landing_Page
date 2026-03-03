/**
 * Shared Animation System - JavaScript
 * Dark, modern, minimalist landing page animations
 * 
 * Features:
 * - Intersection Observer for scroll-triggered reveals
 * - Magnetic button effects
 * - Ripple effects
 * - Smooth scroll utilities
 * - Parallax effects
 * - GSAP integration (optional)
 * 
 * Design Reference:
 * - Background: Dark charcoal (#0a0a0f)
 * - Accent: Rusty terracotta (#D97757)
 * - Text: Off-white/cream (#f5f5f0)
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Intersection Observer settings
    observer: {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    },
    
    // Animation settings
    animation: {
      duration: 600,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      staggerDelay: 100
    },
    
    // Magnetic button settings
    magnetic: {
      strength: 0.3,
      maxDistance: 100
    },
    
    // Parallax settings
    parallax: {
      slowFactor: 0.1,
      mediumFactor: 0.3,
      fastFactor: 0.5
    },
    
    // Reduced motion check
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  /**
   * Check if user prefers reduced motion
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Debounce function for performance
   */
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

  /**
   * Throttle function for scroll events
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Get element offset from viewport
   */
  function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + window.pageYOffset,
      left: rect.left + window.pageXOffset,
      width: rect.width,
      height: rect.height
    };
  }

  // ============================================
  // SCROLL REVEAL SYSTEM (Intersection Observer)
  // ============================================
  
  class ScrollReveal {
    constructor(options = {}) {
      this.options = {
        selector: '.reveal-element',
        visibleClass: 'is-visible',
        once: true,
        ...CONFIG.observer,
        ...options
      };
      
      this.observer = null;
      this.elements = [];
      
      if (!prefersReducedMotion()) {
        this.init();
      } else {
        // Show all elements immediately if reduced motion is preferred
        this.showAllElements();
      }
    }

    init() {
      this.elements = document.querySelectorAll(this.options.selector);
      
      if (this.elements.length === 0) return;

      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          root: this.options.root,
          rootMargin: this.options.rootMargin,
          threshold: this.options.threshold
        }
      );

      this.elements.forEach(el => {
        this.observer.observe(el);
      });
    }

    handleIntersection(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.revealElement(entry.target);
          
          if (this.options.once) {
            this.observer.unobserve(entry.target);
          }
        } else if (!this.options.once) {
          this.hideElement(entry.target);
        }
      });
    }

    revealElement(element) {
      // Add stagger delay based on element index within parent
      const parent = element.parentElement;
      if (parent && parent.classList.contains('reveal-stagger')) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element);
        element.style.transitionDelay = `${index * 0.1}s`;
      }
      
      requestAnimationFrame(() => {
        element.classList.add(this.options.visibleClass);
      });

      // Dispatch custom event
      element.dispatchEvent(new CustomEvent('revealed', {
        bubbles: true,
        detail: { element }
      }));
    }

    hideElement(element) {
      element.classList.remove(this.options.visibleClass);
    }

    showAllElements() {
      const elements = document.querySelectorAll(this.options.selector);
      elements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.classList.add(this.options.visibleClass);
      });
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }

    refresh() {
      this.destroy();
      this.init();
    }
  }

  // ============================================
  // MAGNETIC BUTTON EFFECT
  // ============================================
  
  class MagneticButton {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        strength: CONFIG.magnetic.strength,
        maxDistance: CONFIG.magnetic.maxDistance,
        ...options
      };
      
      this.bounds = null;
      this.isHovering = false;
      
      if (!prefersReducedMotion()) {
        this.init();
      }
    }

    init() {
      this.element.addEventListener('mouseenter', this.onMouseEnter.bind(this));
      this.element.addEventListener('mouseleave', this.onMouseLeave.bind(this));
      this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
      
      // Update bounds on resize
      window.addEventListener('resize', debounce(() => {
        if (this.isHovering) {
          this.bounds = getOffset(this.element);
        }
      }, 250));
    }

    onMouseEnter(e) {
      this.isHovering = true;
      this.bounds = getOffset(this.element);
    }

    onMouseLeave(e) {
      this.isHovering = false;
      this.resetPosition();
    }

    onMouseMove(e) {
      if (!this.isHovering || !this.bounds) return;

      const centerX = this.bounds.left + this.bounds.width / 2;
      const centerY = this.bounds.top + this.bounds.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance < this.options.maxDistance) {
        const strength = this.options.strength * (1 - distance / this.options.maxDistance);
        const moveX = deltaX * strength;
        const moveY = deltaY * strength;
        
        requestAnimationFrame(() => {
          this.element.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
      }
    }

    resetPosition() {
      requestAnimationFrame(() => {
        this.element.style.transform = 'translate(0, 0)';
      });
    }

    destroy() {
      this.element.removeEventListener('mouseenter', this.onMouseEnter);
      this.element.removeEventListener('mouseleave', this.onMouseLeave);
      this.element.removeEventListener('mousemove', this.onMouseMove);
    }
  }

  // ============================================
  // RIPPLE EFFECT
  // ============================================
  
  class RippleEffect {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        color: 'rgba(255, 255, 255, 0.4)',
        duration: 600,
        ...options
      };
      
      this.init();
    }

    init() {
      this.element.addEventListener('click', this.createRipple.bind(this));
    }

    createRipple(e) {
      const rect = this.element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: ${this.options.color};
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        transform: scale(0);
        animation: ripple-animation ${this.options.duration}ms linear;
        pointer-events: none;
      `;

      this.element.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, this.options.duration);
    }

    destroy() {
      this.element.removeEventListener('click', this.createRipple);
    }
  }

  // ============================================
  // PARALLAX EFFECT
  // ============================================
  
  class ParallaxEffect {
    constructor(options = {}) {
      this.options = {
        selector: '[data-parallax]',
        ...options
      };
      
      this.elements = [];
      this.ticking = false;
      
      if (!prefersReducedMotion()) {
        this.init();
      }
    }

    init() {
      this.elements = Array.from(document.querySelectorAll(this.options.selector));
      
      if (this.elements.length === 0) return;

      window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
      this.updatePositions();
    }

    onScroll() {
      if (!this.ticking) {
        requestAnimationFrame(() => {
          this.updatePositions();
          this.ticking = false;
        });
        this.ticking = true;
      }
    }

    updatePositions() {
      const scrollY = window.pageYOffset;
      const windowHeight = window.innerHeight;

      this.elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        const elementVisible = rect.top < windowHeight && rect.bottom > 0;

        if (elementVisible) {
          const speed = parseFloat(el.dataset.parallax) || 0.3;
          const direction = el.dataset.parallaxDirection || 'vertical';
          const offset = (scrollY - elementTop + windowHeight) * speed;

          if (direction === 'horizontal') {
            el.style.transform = `translateX(${offset}px)`;
          } else {
            el.style.transform = `translateY(${offset}px)`;
          }
        }
      });
    }

    destroy() {
      window.removeEventListener('scroll', this.onScroll);
    }
  }

  // ============================================
  // SMOOTH SCROLL UTILITY
  // ============================================
  
  const SmoothScroll = {
    /**
     * Scroll to element smoothly
     */
    to(target, options = {}) {
      const config = {
        offset: 0,
        duration: 800,
        easing: 'easeInOutCubic',
        ...options
      };

      let element;
      if (typeof target === 'string') {
        element = document.querySelector(target);
      } else {
        element = target;
      }

      if (!element) return;

      const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - config.offset;

      if (prefersReducedMotion()) {
        window.scrollTo(0, targetPosition);
        return;
      }

      // Use native smooth scroll if available and no custom duration
      if (config.duration === 'auto' && 'scrollBehavior' in document.documentElement.style) {
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        return;
      }

      // Custom smooth scroll animation
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const startTime = performance.now();

      const easings = {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
      };

      const easing = easings[config.easing] || easings.easeInOutCubic;

      function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / config.duration, 1);
        const easedProgress = easing(progress);

        window.scrollTo(0, startPosition + distance * easedProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
    },

    /**
     * Initialize anchor link smooth scrolling
     */
    initAnchors(options = {}) {
      const config = {
        selector: 'a[href^="#"]',
        offset: 80, // Account for fixed header
        ...options
      };

      document.querySelectorAll(config.selector).forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href === '#') return;

          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            this.to(target, { offset: config.offset });
            
            // Update URL without jumping
            history.pushState(null, null, href);
          }
        });
      });
    }
  };

  // ============================================
  // TEXT ANIMATIONS
  // ============================================
  
  const TextAnimations = {
    /**
     * Split text into characters for stagger animation
     */
    splitChars(element) {
      const text = element.textContent;
      element.innerHTML = '';
      element.classList.add('char-stagger');

      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.classList.add('char');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.transitionDelay = `${index * 0.03}s`;
        element.appendChild(span);
      });
    },

    /**
     * Split text into words for stagger animation
     */
    splitWords(element) {
      const text = element.textContent;
      element.innerHTML = '';
      
      text.split(' ').forEach((word, index) => {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        span.style.overflow = 'hidden';
        span.style.marginRight = '0.25em';
        
        const inner = document.createElement('span');
        inner.textContent = word;
        inner.style.display = 'inline-block';
        inner.style.transform = 'translateY(100%)';
        inner.style.transition = `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`;
        
        span.appendChild(inner);
        element.appendChild(span);
      });

      // Trigger animation
      requestAnimationFrame(() => {
        element.querySelectorAll('span span').forEach(span => {
          span.style.transform = 'translateY(0)';
        });
      });
    },

    /**
     * Typewriter effect
     */
    typewriter(element, options = {}) {
      const config = {
        speed: 50,
        delay: 0,
        ...options
      };

      const text = element.textContent;
      element.textContent = '';
      element.style.opacity = '1';

      setTimeout(() => {
        let index = 0;
        const type = () => {
          if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, config.speed);
          }
        };
        type();
      }, config.delay);
    }
  };

  // ============================================
  // GSAP INTEGRATION (Optional)
  // ============================================
  
  const GSAPIntegration = {
    /**
     * Initialize GSAP animations if GSAP is available
     */
    init() {
      if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded. GSAP animations will not be available.');
        return false;
      }

      // Register ScrollTrigger if available
      if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
      }

      this.setupDefaults();
      return true;
    },

    setupDefaults() {
      gsap.defaults({
        ease: 'power2.out',
        duration: 0.6
      });
    },

    /**
     * Create scroll-triggered animation
     */
    scrollReveal(selector, options = {}) {
      if (typeof gsap === 'undefined') return;

      const config = {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        start: 'top 80%',
        ...options
      };

      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) return;

      gsap.from(elements, {
        y: config.y,
        opacity: config.opacity,
        duration: config.duration,
        stagger: config.stagger,
        scrollTrigger: {
          trigger: elements[0],
          start: config.start,
          toggleActions: 'play none none none'
        }
      });
    },

    /**
     * Create parallax effect with GSAP
     */
    parallax(selector, options = {}) {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

      const config = {
        speed: 0.5,
        ...options
      };

      gsap.utils.toArray(selector).forEach(element => {
        gsap.to(element, {
          yPercent: config.speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
      });
    }
  };

  // ============================================
  // ANIMATION CONTROLLER
  // ============================================
  
  class AnimationController {
    constructor() {
      this.scrollReveal = null;
      this.parallax = null;
      this.magneticButtons = [];
      this.rippleButtons = [];
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;

      // Initialize scroll reveal
      this.scrollReveal = new ScrollReveal();

      // Initialize parallax
      this.parallax = new ParallaxEffect();

      // Initialize magnetic buttons
      this.initMagneticButtons();

      // Initialize ripple effects
      this.initRippleEffects();

      // Initialize smooth scroll anchors
      SmoothScroll.initAnchors();

      // Initialize GSAP if available
      GSAPIntegration.init();

      this.initialized = true;

      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('animationsReady'));
    }

    initMagneticButtons() {
      document.querySelectorAll('.btn-magnetic').forEach(btn => {
        this.magneticButtons.push(new MagneticButton(btn));
      });
    }

    initRippleEffects() {
      document.querySelectorAll('.btn-ripple').forEach(btn => {
        this.rippleButtons.push(new RippleEffect(btn));
      });
    }

    refresh() {
      if (this.scrollReveal) {
        this.scrollReveal.refresh();
      }
    }

    destroy() {
      if (this.scrollReveal) {
        this.scrollReveal.destroy();
      }
      if (this.parallax) {
        this.parallax.destroy();
      }
      this.magneticButtons.forEach(btn => btn.destroy());
      this.rippleButtons.forEach(btn => btn.destroy());
      this.initialized = false;
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================
  
  const Animations = {
    // Configuration
    config: CONFIG,
    
    // Classes
    ScrollReveal,
    MagneticButton,
    RippleEffect,
    ParallaxEffect,
    AnimationController,
    
    // Utilities
    SmoothScroll,
    TextAnimations,
    GSAPIntegration,
    
    // Helper functions
    prefersReducedMotion,
    debounce,
    throttle,
    
    // Initialize all animations
    init() {
      const controller = new AnimationController();
      controller.init();
      return controller;
    }
  };

  // ============================================
  // AUTO-INITIALIZE
  // ============================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Animations.init();
    });
  } else {
    Animations.init();
  }

  // Expose to global scope
  window.Animations = Animations;

})();
