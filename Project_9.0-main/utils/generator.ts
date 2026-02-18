import { CanvasElement, ElementType, CustomComponentDefinition, SavedNodeGroup, Page } from '../types';
import { evaluateNodeGraph } from './evaluate';
import { GOOGLE_FONTS } from '../constants';

const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const generateHTML = (
    elements: CanvasElement[], 
    pages: Page[],
    width: number, 
    height: number, 
    customComponents: CustomComponentDefinition[] = [],
    scripts: SavedNodeGroup[] = []
): string => {
  
  const pxToVw = (px: number) => `${(px / width) * 100}vw`;

  // FIX: Default static context for initial evaluation
  const defaultContext = { isHovered: false, isClicked: false, time: 0 };

  const getTailwindClasses = (type: ElementType, style: any): string => {
    switch (type) {
      case ElementType.BUTTON:
      case ElementType.BADGE:
        let justifyClass = 'justify-center';
        if (style.textAlign === 'left') justifyClass = 'justify-start px-4';
        if (style.textAlign === 'right') justifyClass = 'justify-end px-4';
        return `w-full h-full flex items-center ${justifyClass} transition-opacity hover:opacity-90 overflow-hidden`;
      case ElementType.HEADING:
        return "w-full h-full overflow-hidden leading-tight flex flex-col justify-center";
      case ElementType.PARAGRAPH:
        return "w-full h-full overflow-hidden leading-relaxed";
      case ElementType.CARD:
        return "w-full h-full bg-white";
      case ElementType.INPUT:
        return "w-full h-full px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent";
      case ElementType.IMAGE_PLACEHOLDER:
      case ElementType.VIDEO_PLACEHOLDER:
      case ElementType.AVATAR:
        return "w-full h-full overflow-hidden";
      case ElementType.DIVIDER:
        return "w-full h-full flex items-center";
      case ElementType.CONTAINER:
      case ElementType.CUSTOM:
        return "w-full h-full"; 
      default:
        return "w-full h-full";
    }
  };

  const getElementCSS = (style: any, elemWidth: number, elemHeight: number, content: string): string => {
    let css = '';
    
    if (style.backgroundColor) css += `background-color: ${style.backgroundColor}; `;
    if (style.backgroundImage) css += `background-image: ${style.backgroundImage}; `;
    if (style.color) css += `color: ${style.color}; `;
    if (style.fontWeight) css += `font-weight: ${style.fontWeight}; `;
    if (style.fontFamily) css += `font-family: '${style.fontFamily}', sans-serif; `;
    if (style.opacity !== undefined) css += `opacity: ${style.opacity}; `;
    if (style.display) css += `display: ${style.display}; `;
    if (style.alignItems) css += `align-items: ${style.alignItems}; `;
    if (style.justifyContent) css += `justify-content: ${style.justifyContent}; `;
    if (style.transform) css += `transform: ${style.transform}; `;
    if (style.textAlign) css += `text-align: ${style.textAlign}; `;
    if (style.transition) css += `transition: ${style.transition}; `;
    
    // FIX: Apply animation from style (this is the initial inline animation)
    if (style.animation) css += `animation: ${style.animation}; `;

    if (style.flexDirection) css += `flex-direction: ${style.flexDirection}; `;
    if (style.lineHeight) css += `line-height: ${style.lineHeight}; `;
    if (style.letterSpacing) css += `letter-spacing: ${style.letterSpacing}; `;
    if (style.marginTop) css += `margin-top: ${pxToVw(style.marginTop)}; `;
    if (style.marginLeft) css += `margin-left: ${pxToVw(style.marginLeft)}; `;
    if (style.gap) css += `gap: ${pxToVw(style.gap)}; `;
    if (style.textShadow) css += `text-shadow: ${style.textShadow}; `;
    if (style.objectFit) css += `object-fit: ${style.objectFit}; `;

    if (style.borderRadius) css += `border-radius: ${pxToVw(style.borderRadius)}; `;
    if (style.padding) css += `padding: ${pxToVw(style.padding)}; `;
    
    if (style.borderWidth || style.borderBottomWidth || style.borderTopWidth) {
        if (style.borderWidth) css += `border-width: ${pxToVw(style.borderWidth)}; `;
        if (style.borderBottomWidth) css += `border-bottom-width: ${pxToVw(style.borderBottomWidth)}; `;
        if (style.borderTopWidth) css += `border-top-width: ${pxToVw(style.borderTopWidth)}; `;
        css += `border-style: solid; `;
        if (style.borderColor) css += `border-color: ${style.borderColor}; `;
    }

    if (style.boxShadow) {
         const scaledShadow = style.boxShadow.replace(/(-?\d+(\.\d+)?)px/g, (match: string, num: string) => {
             return pxToVw(parseFloat(num));
         });
         css += `box-shadow: ${scaledShadow}; `;
    }
    
    let fontSize = style.fontSize;
    if (style.autoFontSize) {
        const heightConstraint = Math.round(elemHeight * 0.6);
        const charCount = Math.max(1, content?.length || 1);
        const widthConstraint = Math.round((elemWidth / charCount) * 1.8);
        fontSize = Math.max(10, Math.min(heightConstraint, widthConstraint));
        
        css += `line-height: 1; `;
        css += `white-space: nowrap; `;
        css += `text-overflow: ellipsis; `;
    }
    
    if (fontSize) {
        css += `font-size: ${pxToVw(fontSize)}; `;
    }
    
    return css;
  };

  const renderElement = (el: CanvasElement, parentWidth: number, parentHeight: number): string => {
    const children = elements.filter(child => child.parentId === el.id);
    const innerHTML = children.map(child => renderElement(child, el.width, el.height)).join('');
    
    const leftPercent = (el.x / parentWidth) * 100;
    const topPercent = (el.y / parentHeight) * 100;
    const widthPercent = (el.width / parentWidth) * 100;
    const heightPercent = (el.height / parentHeight) * 100;
    
    const wrapperStyle = `
        position: absolute; 
        left: ${leftPercent.toFixed(4)}%; 
        top: ${topPercent.toFixed(4)}%; 
        width: ${widthPercent.toFixed(4)}%; 
        height: ${heightPercent.toFixed(4)}%;
    `;
    
    let computedData = { style: {} as Record<string, any>, content: '' };
    
    // FIX: Pass defaultContext to all evaluateNodeGraph calls
    if (el.type === ElementType.CUSTOM) {
        let def: CustomComponentDefinition | undefined;
        if (el.isDetached && el.customNodeGroup) {
            def = el.customNodeGroup;
        } else if (el.customComponentId) {
            def = customComponents.find(c => c.id === el.customComponentId);
        }
        if (def) computedData = evaluateNodeGraph(def, el.propOverrides, defaultContext);
    }

    if (el.scripts && el.scripts.length > 0) {
        el.scripts.forEach(scriptId => {
            const scriptDef = scripts.find(s => s.id === scriptId);
            if (scriptDef) {
                const res = evaluateNodeGraph(scriptDef, el.propOverrides, defaultContext);
                computedData.style = { ...computedData.style, ...res.style };
                if (res.content !== undefined) computedData.content = res.content;
            }
        });
    }

    const effectiveStyle = { ...el.style, ...computedData.style };
    const finalContent = computedData.content || el.content || '';
    
    const contentStyleCSS = getElementCSS(effectiveStyle, el.width, el.height, finalContent);
    const tailwindClass = getTailwindClasses(el.type, effectiveStyle);

    let tag = 'div';
    let innerContentHTML = '';
    const textWrapper = (text: string) => effectiveStyle.autoFontSize ? `<span class="truncate max-w-full block">${text}</span>` : text;

    if (el.type === ElementType.BUTTON || el.type === ElementType.BADGE) {
        tag = el.type === ElementType.BUTTON ? 'button' : 'div';
        innerContentHTML = textWrapper(finalContent);
    } else if (el.type === ElementType.IMAGE_PLACEHOLDER) {
        if (el.src) {
            tag = 'img';
        } else {
             innerContentHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af; height:100%;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
             </div>`;
        }
    } else if (el.type === ElementType.VIDEO_PLACEHOLDER) {
         if (el.src) {
             const ytId = getYoutubeId(el.src);
             if (ytId) {
                 innerContentHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?autoplay=${el.videoOptions?.autoplay ? 1 : 0}&controls=${el.videoOptions?.controls === false ? 0 : 1}&loop=${el.videoOptions?.loop ? 1 : 0}&playlist=${el.videoOptions?.loop ? ytId : ''}&mute=${el.videoOptions?.muted ? 1 : 0}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="border-radius: inherit; pointer-events: auto;"></iframe>`;
             } else {
                 tag = 'video';
             }
         } else {
            innerContentHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af; height:100%;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            </div>`;
         }
    } else if (el.type === ElementType.AVATAR) {
         if (el.src) {
             tag = 'img';
         } else {
             innerContentHTML = `<svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
         }
    } else if (el.type === ElementType.DIVIDER) {
        innerContentHTML = `<div style="width:100%; height:1px; background-color:${effectiveStyle.backgroundColor || '#d1d5db'};"></div>`;
    } else if (el.type === ElementType.INPUT) {
        return `
        <div id="${el.id}-wrapper" style="${wrapperStyle}">
             <input data-el-id="${el.id}" type="text" value="${finalContent}" class="${tailwindClass}" style="${contentStyleCSS}" readonly />
             ${innerHTML}
        </div>`;
    } else {
        innerContentHTML = textWrapper(finalContent);
    }

    let srcAttr = '';
    let extraAttrs = '';
    if (tag === 'img') {
        srcAttr = `src="${el.src}" alt="${el.alt || ''}"`;
    } else if (tag === 'video') {
        srcAttr = `src="${el.src}"`;
        if (el.videoOptions?.autoplay) extraAttrs += ' autoplay';
        if (el.videoOptions?.loop) extraAttrs += ' loop';
        if (el.videoOptions?.muted) extraAttrs += ' muted';
        if (el.videoOptions?.controls !== false) extraAttrs += ' controls';
        extraAttrs += ' playsinline';
    }

    return `
      <div id="${el.id}-wrapper" style="${wrapperStyle}">
        <${tag} data-el-id="${el.id}" class="${tailwindClass}" style="${contentStyleCSS}" ${srcAttr} ${extraAttrs}>
           ${innerContentHTML}
           ${innerHTML}
        </${tag}>
      </div>
    `;
  };

  const pagesHTML = pages.map((page, index) => {
      const pageElements = elements.filter(el => el.pageId === page.id && !el.parentId);
      const content = pageElements.map(el => renderElement(el, width, height)).join('\n');
      const hiddenClass = index === 0 ? '' : 'hidden';
      return `
        <div id="page-${page.id}" class="page-container absolute inset-0 w-full h-full ${hiddenClass}">
            ${content}
        </div>
      `;
  }).join('\n');

  const serializedData = JSON.stringify({
      elements: elements.map(e => ({
          id: e.id,
          scripts: e.scripts || [],
          propOverrides: e.propOverrides || {},
          customComponentId: e.customComponentId,
          customNodeGroup: e.customNodeGroup,
          isDetached: e.isDetached,
          type: e.type,
          pageId: e.pageId
      })),
      components: customComponents,
      scripts: scripts,
      pages: pages
  });

  const containerHeightVw = (height / width) * 100;

  const fontsToLoad = new Set<string>();
  elements.forEach(el => {
      if (el.style.fontFamily && GOOGLE_FONTS.includes(el.style.fontFamily)) {
          fontsToLoad.add(el.style.fontFamily);
      }
  });
  let fontLink = '';
  if (fontsToLoad.size > 0) {
      const query = Array.from(fontsToLoad).map(f => `family=${f.replace(/ /g, '+')}:wght@400;700`).join('&');
      fontLink = `<link href="https://fonts.googleapis.com/css2?${query}&display=swap" rel="stylesheet">`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>Exported Project</title>
    <script src="https://cdn.tailwindcss.com"></script>
    ${fontLink}
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow-x: hidden; background-color: #ffffff; font-family: sans-serif; }
        #app-root { position: relative; width: 100vw; max-width: 100%; height: ${containerHeightVw}vw; min-height: 100vh; overflow-x: hidden; overflow-y: auto; }
        .hidden { display: none !important; }
        
        @media (max-width: 1024px) and (min-width: 769px) {
            #app-root { height: auto; min-height: 100vh; }
        }
        @media (max-width: 768px) {
            #app-root { height: auto; min-height: 100vh; width: 100%; }
            button[data-el-id] { min-height: 44px; min-width: 44px; }
        }
        @media (max-width: 768px) and (orientation: landscape) {
            #app-root { height: auto; min-height: 100vh; }
        }
        img, video, iframe { max-width: 100%; height: auto; object-fit: contain; }
        .page-container { max-width: 100%; overflow-x: hidden; }
        
        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideInUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes zoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.5); opacity: 0; } }
        @keyframes bounce { 
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 
            40% { transform: translateY(-20px); } 
            60% { transform: translateY(-10px); } 
        }
        @keyframes pulse { 
            0% { transform: scale(1); } 
            50% { transform: scale(1.05); } 
            100% { transform: scale(1); } 
        }
        @keyframes shake { 
            0%, 100% { transform: translateX(0); } 
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 
            20%, 40%, 60%, 80% { transform: translateX(5px); } 
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="app-root">
        ${pagesHTML}
    </div>

    <script>
        const PROJECT_DATA = ${serializedData};
        const RUNTIME = {
            startTime: Date.now(),
            activePageId: PROJECT_DATA.pages[0]?.id,
            state: { hovers: {}, clicks: {}, time: 0, triggerStates: {} },
            animationStates: {},
            
            init: function() {
                const self = this;
                document.querySelectorAll('[data-el-id]').forEach(function(el) {
                    const id = el.getAttribute('data-el-id');
                    el.addEventListener('mouseenter', function() { self.state.hovers[id] = true; });
                    el.addEventListener('mouseleave', function() { self.state.hovers[id] = false; });
                    el.addEventListener('click', function(e) { 
                        if (['A','INPUT','BUTTON'].includes(e.target.tagName)) return;
                        e.stopPropagation();
                        self.state.clicks[id] = !self.state.clicks[id]; 
                    });
                    
                    // FIX: Track existing inline animations so the loop won't restart them
                    var inlineAnim = el.style.animation;
                    if (inlineAnim && inlineAnim !== 'none' && inlineAnim.trim() !== '') {
                        self.animationStates[id] = inlineAnim;
                    }
                });
                this.loop();
            },

            navigateTo: function(pageId) {
                if (this.activePageId === pageId) return;

                var leavingElements = PROJECT_DATA.elements.filter(function(el) { return el.pageId === RUNTIME.activePageId; });
                leavingElements.forEach(function(el) {
                   RUNTIME.state.clicks[el.id] = false;
                   RUNTIME.state.hovers[el.id] = false;
                   // FIX: Clear animation states for leaving page so they restart on return
                   delete RUNTIME.animationStates[el.id];
                });

                document.getElementById('page-' + this.activePageId)?.classList.add('hidden');
                document.getElementById('page-' + pageId)?.classList.remove('hidden');
                this.activePageId = pageId;
                
                // FIX: Restart inline animations on newly visible page
                var newPageElements = PROJECT_DATA.elements.filter(function(el) { return el.pageId === pageId; });
                newPageElements.forEach(function(el) {
                    var domEl = document.querySelector('[data-el-id="' + el.id + '"]');
                    if (domEl && domEl.style.animation && domEl.style.animation !== 'none') {
                        var anim = domEl.style.animation;
                        domEl.style.animation = 'none';
                        void domEl.offsetHeight;
                        domEl.style.animation = anim;
                        RUNTIME.animationStates[el.id] = anim;
                    }
                });
            },

            evaluateNodeGraph: function(def, overrides, context) {
                var self = this;
                var outputNode = def.nodes.find(function(n) { return n.type === 'OUTPUT'; });
                var memo = new Map();
                var visited = new Set();
                
                var evaluateNode = function(nodeId) {
                    if (memo.has(nodeId)) return memo.get(nodeId);
                    if (visited.has(nodeId)) return null;
                    visited.add(nodeId);
                    if (overrides && overrides[nodeId] !== undefined) return overrides[nodeId];
                    var node = def.nodes.find(function(n) { return n.id === nodeId; });
                    if (!node) return null;
                    
                    var getVal = function(inputSocketId) {
                        var conn = def.connections.find(function(c) { return c.targetNodeId === nodeId && c.targetSocketId === inputSocketId; });
                        return conn ? evaluateNode(conn.sourceNodeId) : null;
                    };
                    
                    var res = null;
                    var val = node.data ? node.data.value : undefined;

                    switch (node.type) {
                        case 'NAVIGATE': {
                             var trigger = getVal('in-trigger');
                             var prevTrigger = self.state.triggerStates[nodeId];
                             if (trigger === true && !prevTrigger && val) {
                                 self.navigateTo(val);
                             }
                             self.state.triggerStates[nodeId] = trigger;
                             break;
                        }
                        case 'LINK': {
                             var trigger = getVal('in-trigger');
                             var prevTrigger = self.state.triggerStates[nodeId];
                             var url = getVal('in-url') || val;
                             var newTab = getVal('in-new-tab') !== null ? getVal('in-new-tab') : (node.data && node.data.newTab);
                             if (trigger === true && !prevTrigger && url) {
                                 if (newTab) { window.open(url, '_blank'); }
                                 else { window.location.href = url; }
                             }
                             self.state.triggerStates[nodeId] = trigger;
                             break;
                        }
                        case 'ALERT': {
                             var trigger = getVal('in-trigger');
                             var prevTrigger = self.state.triggerStates[nodeId];
                             var msg = getVal('in-message') || val;
                             if (trigger === true && !prevTrigger && msg) {
                                 setTimeout(function() { alert(msg); }, 0);
                             }
                             self.state.triggerStates[nodeId] = trigger;
                             break;
                        }
                        case 'INTERACTION_HOVER': res = context ? context.isHovered : false; break;
                        case 'INTERACTION_CLICK': res = context ? context.isClicked : false; break;
                        case 'TIMER': res = (context ? context.time : 0) * Number(getVal('in-speed') || 1); break;
                        
                        case 'IF_ELSE': res = getVal('in-condition') ? getVal('in-true') : getVal('in-false'); break;
                        case 'EQUAL': res = getVal('in-a') == getVal('in-b'); break;
                        case 'NOT_EQUAL': res = getVal('in-a') != getVal('in-b'); break;
                        case 'GREATER_THAN': res = Number(getVal('in-a')) > Number(getVal('in-b')); break;
                        case 'LESS_THAN': res = Number(getVal('in-a')) < Number(getVal('in-b')); break;
                        case 'GREATER_EQUAL': res = Number(getVal('in-a')) >= Number(getVal('in-b')); break;
                        case 'LESS_EQUAL': res = Number(getVal('in-a')) <= Number(getVal('in-b')); break;
                        case 'AND': res = !!(getVal('in-a') && getVal('in-b')); break;
                        case 'OR': res = !!(getVal('in-a') || getVal('in-b')); break;
                        case 'NOT': res = !getVal('in-a'); break;
                        
                        case 'ADD': res = Number(getVal('in-a') || 0) + Number(getVal('in-b') || 0); break;
                        case 'SUBTRACT': res = Number(getVal('in-a') || 0) - Number(getVal('in-b') || 0); break;
                        case 'MULTIPLY': res = Number(getVal('in-a') || 0) * Number(getVal('in-b') || 0); break;
                        case 'DIVIDE': {
                            var divisor = Number(getVal('in-b') || 1);
                            res = divisor !== 0 ? Number(getVal('in-a') || 0) / divisor : 0;
                            break;
                        }
                        case 'MODULO': {
                            var mod = Number(getVal('in-b') || 1);
                            res = mod !== 0 ? Number(getVal('in-a') || 0) % mod : 0;
                            break;
                        }
                        case 'POWER': res = Math.pow(Number(getVal('in-a') || 0), Number(getVal('in-b') || 1)); break;
                        case 'NEGATE': res = -Number(getVal('in-a') || 0); break;
                        case 'ABS': res = Math.abs(Number(getVal('in-a') || 0)); break;
                        case 'ROUND': res = Math.round(Number(getVal('in-a') || 0)); break;
                        case 'FLOOR': res = Math.floor(Number(getVal('in-a') || 0)); break;
                        case 'CEIL': res = Math.ceil(Number(getVal('in-a') || 0)); break;
                        case 'MIN': res = Math.min(Number(getVal('in-a') || 0), Number(getVal('in-b') || 0)); break;
                        case 'MAX': res = Math.max(Number(getVal('in-a') || 0), Number(getVal('in-b') || 0)); break;
                        case 'CLAMP': {
                            var v = Number(getVal('in-value') || 0);
                            var lo = Number(getVal('in-min') || 0);
                            var hi = Number(getVal('in-max') || 1);
                            res = Math.min(Math.max(v, lo), hi);
                            break;
                        }
                        case 'MAP_RANGE': {
                            var input = Number(getVal('in-value') || 0);
                            var inMin = Number(getVal('in-in-min') || 0);
                            var inMax = Number(getVal('in-in-max') || 1);
                            var outMin = Number(getVal('in-out-min') || 0);
                            var outMax = Number(getVal('in-out-max') || 1);
                            var range = inMax - inMin;
                            res = range !== 0 ? outMin + ((input - inMin) / range) * (outMax - outMin) : outMin;
                            break;
                        }
                        case 'RANDOM': res = Math.random(); break;
                        case 'SIN': res = Math.sin(Number(getVal('in-a') || 0)); break;
                        case 'COS': res = Math.cos(Number(getVal('in-a') || 0)); break;
                        case 'CONCAT': {
                            var strA = String(getVal('in-a') || '');
                            var strB = String(getVal('in-b') || '');
                            res = strA + strB;
                            break;
                        }
                        
                        case 'TEXT': case 'COLOR': case 'NUMBER': case 'TOGGLE': res = val; break;
                        
                        case 'STYLE': {
                            var styleObj = {};
                            var bg = getVal('in-bg');
                            var color = getVal('in-text');
                            var size = getVal('in-size');
                            if (bg !== null && bg !== undefined) styleObj.backgroundColor = bg;
                            if (color !== null && color !== undefined) styleObj.color = color;
                            if (size !== null && size !== undefined) styleObj.fontSize = size;
                            res = styleObj;
                            break;
                        }
                        
                        case 'ANIMATION': {
                            var triggerConn = def.connections.find(function(c) {
                                return c.targetNodeId === nodeId && c.targetSocketId === 'in-trigger';
                            });
                            var shouldRun = true;
                            
                            if (triggerConn) {
                                shouldRun = !!getVal('in-trigger');
                            }

                            if (!shouldRun) {
                                res = { animation: 'none' };
                            } else {
                                var type = val || 'fadeIn';
                                var dur = Number(getVal('in-duration') || 1);
                                var delay = Number(getVal('in-delay') || 0);
                                
                                var iter = '1';
                                if (type === 'spin' || type === 'pulse' || type === 'shake' || type === 'bounce') iter = 'infinite';

                                res = {
                                    animation: type + ' ' + dur + 's ease-in-out ' + delay + 's ' + iter + ' both'
                                };
                            }
                            break;
                        }
                        case 'TRANSITION': {
                            var dur = Number(getVal('in-duration') || 0.3);
                            var delay = Number(getVal('in-delay') || 0);
                            res = {
                                transition: 'all ' + dur + 's ease-in-out ' + delay + 's'
                            };
                            break;
                        }
                        case 'MERGE': {
                            var styleA = getVal('in-style-a') || {};
                            var styleB = getVal('in-style-b') || {};
                            res = Object.assign({}, styleA, styleB);
                            break;
                        }
                        case 'OUTPUT': {
                            // OUTPUT node — handled separately below
                            res = null;
                            break;
                        }
                        default: res = val;
                    }
                    visited.delete(nodeId);
                    memo.set(nodeId, res);
                    return res;
                };

                // Trigger action nodes
                def.nodes.forEach(function(n) {
                    if (['NAVIGATE', 'LINK', 'ALERT'].includes(n.type)) {
                        evaluateNode(n.id);
                    }
                });

                // Standard Output
                if (!outputNode) return { style: {}, content: '' };
                var styleConn = def.connections.find(function(c) { return c.targetNodeId === outputNode.id && c.targetSocketId === 'in-style'; });
                var finalStyle = styleConn ? (evaluateNode(styleConn.sourceNodeId) || {}) : {};
                var contentConn = def.connections.find(function(c) { return c.targetNodeId === outputNode.id && c.targetSocketId === 'in-content'; });
                var finalContent = contentConn ? String(evaluateNode(contentConn.sourceNodeId) || '') : undefined;
                return { style: finalStyle, content: finalContent };
            },

            loop: function() {
                var self = this;
                this.state.time = (Date.now() - this.startTime) / 1000;
                
                var activeElements = PROJECT_DATA.elements.filter(function(el) { return el.pageId === self.activePageId; });

                activeElements.forEach(function(el) {
                    var domEl = document.querySelector('[data-el-id="' + el.id + '"]');
                    if (!domEl || !domEl.parentNode) return;

                    var context = {
                        isHovered: !!self.state.hovers[el.id],
                        isClicked: !!self.state.clicks[el.id],
                        time: self.state.time
                    };

                    var computedStyle = {};
                    var computedContent = undefined;
                    var hasDynamicStyles = false;

                    if (el.type === 'CUSTOM') {
                        var def = el.isDetached ? el.customNodeGroup : PROJECT_DATA.components.find(function(c) { return c.id === el.customComponentId; });
                        if (def) {
                            var res = self.evaluateNodeGraph(def, el.propOverrides, context);
                            Object.assign(computedStyle, res.style);
                            if (res.content !== undefined) computedContent = res.content;
                            hasDynamicStyles = true;
                        }
                    }

                    if (el.scripts && el.scripts.length > 0) {
                        el.scripts.forEach(function(sid) {
                            var def = PROJECT_DATA.scripts.find(function(s) { return s.id === sid; });
                            if (def) {
                                var res = self.evaluateNodeGraph(def, el.propOverrides, context);
                                Object.assign(computedStyle, res.style);
                                if (res.content !== undefined) computedContent = res.content;
                                hasDynamicStyles = true;
                            }
                        });
                    }

                    if (!hasDynamicStyles && computedContent === undefined) return;

                    // Apply computed content
                    if (computedContent !== undefined && domEl.innerText !== String(computedContent)) {
                         if(['BUTTON','HEADING','PARAGRAPH','BADGE','CUSTOM'].includes(el.type)) {
                             domEl.innerText = String(computedContent);
                         }
                    }
                    
                    // Apply simple style properties
                    if (computedStyle.backgroundColor !== undefined) domEl.style.backgroundColor = computedStyle.backgroundColor;
                    if (computedStyle.color !== undefined) domEl.style.color = computedStyle.color;
                    if (computedStyle.fontSize !== undefined) domEl.style.fontSize = typeof computedStyle.fontSize === 'number' ? computedStyle.fontSize + 'px' : computedStyle.fontSize;
                    if (computedStyle.transform !== undefined) domEl.style.transform = computedStyle.transform;
                    if (computedStyle.opacity !== undefined) domEl.style.opacity = computedStyle.opacity;
                    if (computedStyle.transition !== undefined) domEl.style.transition = computedStyle.transition;
                    
                    // FIX: Simplified animation handling — only change when desired animation differs from tracked
                    if (computedStyle.animation !== undefined) {
                        var desiredAnim = computedStyle.animation;
                        var trackedAnim = self.animationStates[el.id];
                        
                        if (trackedAnim !== desiredAnim) {
                            // Update tracking immediately to prevent re-triggering
                            self.animationStates[el.id] = desiredAnim;
                            
                            if (!desiredAnim || desiredAnim === 'none') {
                                domEl.style.animation = 'none';
                            } else {
                                // Force restart: remove → reflow → apply
                                domEl.style.animation = 'none';
                                void domEl.offsetHeight;
                                domEl.style.animation = desiredAnim;
                            }
                        }
                    }
                });
                
                requestAnimationFrame(function() { self.loop(); });
            }
        };
        RUNTIME.init();
    </script>
</body>
</html>`;
}