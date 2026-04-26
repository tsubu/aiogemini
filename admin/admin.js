(function( $ ) {
    'use strict';
 //     console.log('Picot AIO Optimizer: admin.js loaded');

    // Ensure the localized object exists
    window.picot_aio_optimizer = window.picot_aio_optimizer || { strings: {} };
    var picot_aio_optimizer = window.picot_aio_optimizer;

    /**
     * Centralized AJAX error handler
     * Logs detailed error to console and shows user-friendly message
     */
    function handleAjaxError(xhr, context) {
        var errorMsg = (picot_aio_optimizer.strings && picot_aio_optimizer.strings.error) ? picot_aio_optimizer.strings.error : 'An error occurred.';
        var detailedError = {
            context: context,
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
        };
        
        // Log detailed error to console for debugging
 //         console.error('Picot AIO Optimizer AJAX Error:', detailedError);
        
        // Try to extract user-friendly message
        if (xhr.responseJSON && xhr.responseJSON.message) {
            errorMsg = xhr.responseJSON.message;
        } else if (xhr.status === 403) {
            errorMsg = picot_aio_optimizer.strings.permission_error || 'Permission denied. Please refresh the page and try again.';
        } else if (xhr.status === 500) {
            errorMsg = picot_aio_optimizer.strings.server_error || 'Server error. Please check the error log.';
        } else if (xhr.status === 0) {
            errorMsg = picot_aio_optimizer.strings.network_error || 'Network error. Please check your connection.';
        }
        
        return errorMsg;
    }

    /**
     * Centralized logging helper
     * Only logs in debug mode (checks for WP_DEBUG via localized script)
     */
    function debugLog(message, level) {
        // level = level || 'log';
        // var prefix = 'Picot AIO Optimizer: ';
        // if (level === 'error' || (window.picot_aio_optimizer && picot_aio_optimizer.debug_mode)) {
        //     console[level](prefix + message);
        // }
    }

    /**
     * Returns a jQuery set of ALL active result containers.
     * Covers: Gutenberg document panel, Gutenberg sidebar panel, Classic Editor fallback.
     */
    function getAllResultPanels() {
        var panels = $();
        var docPanel     = $('#picot_aio_optimizer-result-panel');
        var sidebarPanel = $('#picot_aio_optimizer-result-panel-sidebar');
        var classicPanel = $('#picot_aio_optimizer-classic-results');
        if (docPanel.length)     panels = panels.add(docPanel);
        if (sidebarPanel.length) panels = panels.add(sidebarPanel);
        if (classicPanel.length) panels = panels.add(classicPanel);
        return panels;
    }

    /**
     * REGISTER PLUGIN SIDEBAR (React/Gutenberg Native)
     * This avoids the PHP add_meta_box 500 error.
     */
    var domReady = (typeof wp !== 'undefined' && wp.domReady) ? wp.domReady : $;
    
    domReady(function() {
        if (typeof wp !== 'undefined' && wp.plugins && (wp.editPost || wp.editor) && wp.element && wp.components) {
 //             console.log('Picot AIO Optimizer: Registering sidebar plugin...');
        
        var el = wp.element.createElement;
        var Fragment = wp.element.Fragment;
        var useState = wp.element.useState;
        
        // Use wp.editor (WP 6.6+), fallback to wp.editPost for legacy
        var editorNamespace = (typeof wp.editor !== 'undefined') ? wp.editor : wp.editPost;
        
        // Handle specific components that might have moved or exist in different namespaces
        var PluginSidebar                = editorNamespace.PluginSidebar || wp.editPost.PluginSidebar;
        var PluginSidebarMoreMenuItem    = editorNamespace.PluginSidebarMoreMenuItem || wp.editPost.PluginSidebarMoreMenuItem;
        var PluginDocumentSettingPanel   = editorNamespace.PluginDocumentSettingPanel || wp.editPost.PluginDocumentSettingPanel;
        
        var Button          = wp.components.Button;
        var PanelBody       = wp.components.PanelBody;
        var TextareaControl = wp.components.TextareaControl;

        /**
         * Shared content builder — used by both PluginDocumentSettingPanel and PluginSidebar.
         * resultPanelId differentiates the two result containers.
         */
        var buildPanelContent = function(rewriteInstructions, setRewriteInstructions, resultPanelId) {
            return el(
                Fragment,
                {},
                // Row 1: Analyze
                el('div', { style: { marginBottom: '15px' } },
                    el(Button, {
                        id: 'picot_aio_optimizer-analysis-btn',
                        isPrimary: true, isLarge: true,
                        style: { width: '100%', justifyContent: 'center' },
                        onClick: function() { analyzeContent(); }
                    }, picot_aio_optimizer.strings.analyze_btn || 'Gemini Analyze')
                ),
                // Row 2: Rewrite
                el('div', { style: { marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' } },
                    el(TextareaControl, {
                        label: picot_aio_optimizer.strings.rewrite_instructions_label || 'Rewrite Instructions',
                        value: rewriteInstructions,
                        placeholder: picot_aio_optimizer.strings.rewrite_instructions_placeholder || 'e.g. Make it more professional...',
                        onChange: function(val) { setRewriteInstructions(val); }
                    }),
                    el(Button, {
                        id: 'picot_aio_optimizer-rewrite-btn',
                        isSecondary: true, isLarge: true,
                        style: { width: '100%', justifyContent: 'center' },
                        onClick: function() { triggerRewrite(rewriteInstructions); }
                    }, picot_aio_optimizer.strings.rewrite_btn || 'AI Rewrite')
                ),
                // Row 3: Discover Images
                el('div', { style: { marginBottom: '15px' } },
                    el(Button, {
                        id: 'picot_aio_optimizer-discover-btn',
                        isSecondary: true, isLarge: true,
                        style: { width: '100%', justifyContent: 'center' },
                        onClick: function() { discoverImagePrompts(); }
                    }, picot_aio_optimizer.strings.discover_images_btn || 'Suggest Images')
                ),
                // Row 4: Results container
                el('div', { id: resultPanelId, style: { marginTop: '10px' } }),
                // Row 5: History
                el('div', { style: { marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '10px' } },
                    el(Button, {
                        isTertiary: true,
                        style: { width: '100%', justifyContent: 'center' },
                        onClick: function() { fetchPostHistory(); }
                    }, picot_aio_optimizer.strings.label_history || 'View History')
                )
            );
        };

        var PicotAioOptimizerSidebar = function() {
            // State for Document Setting Panel
            var docState = useState('');
            var docInstructions = docState[0];
            var setDocInstructions = docState[1];

            // State for Sidebar Panel (independent)
            var sideState = useState('');
            var sideInstructions = sideState[0];
            var setSideInstructions = sideState[1];

            return el(
                Fragment,
                {},
                // ── 1. Document Settings Panel (always visible in "Post" tab) ──
                el(
                    PluginDocumentSettingPanel,
                    {
                        name: 'picot-aio-doc-panel',
                        title: (picot_aio_optimizer.strings.plugin_title || 'Picot AIO Optimizer'),
                        icon: 'admin-site',
                        className: 'picot-aio-doc-panel'
                    },
                    buildPanelContent(docInstructions, setDocInstructions, 'picot_aio_optimizer-result-panel')
                ),
                // ── 2. More-menu item (globe icon) ──
                el(
                    PluginSidebarMoreMenuItem,
                    { target: 'picot-aio-optimizer-sidebar', icon: 'admin-site' },
                    (picot_aio_optimizer.strings.plugin_title || 'Picot AIO Optimizer')
                ),
                // ── 3. Plugin Sidebar (opened via globe icon) ──
                el(
                    PluginSidebar,
                    {
                        name: 'picot-aio-optimizer-sidebar',
                        title: (picot_aio_optimizer.strings.plugin_title || 'Picot AIO AI Content Optimizer'),
                        icon: 'admin-site'
                    },
                    el(
                        PanelBody,
                        { title: (picot_aio_optimizer.strings.controls_title || 'Optimizer Controls'), initialOpen: true },
                        buildPanelContent(sideInstructions, setSideInstructions, 'picot_aio_optimizer-result-panel-sidebar')
                    )
                )
            );
        };


        wp.plugins.registerPlugin('picot-aio-optimizer-sidebar-plugin', {
            render: PicotAioOptimizerSidebar
        });

        // Wait for the React sidebar panel to be rendered before initializing
        // Polls every 500ms, up to 10 times (5 seconds total)
        // NOTE: Must use var (function expression) inside an if-block in strict mode
        var waitForResultDiv = function(callback, maxRetries, interval) {
            maxRetries = maxRetries || 10;
            interval   = interval   || 500;
            var attempts = 0;

            var tryFind = function() {
                // Check all possible result containers (doc panel, sidebar panel, classic editor)
                var docPanel     = $('#picot_aio_optimizer-result-panel');
                var sidePanel    = $('#picot_aio_optimizer-result-panel-sidebar');
                var classicPanel = $('#picot_aio_optimizer-classic-results');

                if (docPanel.length > 0 || sidePanel.length > 0 || classicPanel.length > 0) {
                    callback();
                    return;
                }

                attempts++;
                if (attempts < maxRetries) {
                    setTimeout(tryFind, interval);
                } else {
                    debugLog('Result div not available after ' + maxRetries + ' retries — skipping auto-init', 'warn');
                }
            };

            setTimeout(tryFind, interval);
        };

        waitForResultDiv(function() {
            requestAnimationFrame(function() {
                $('#picot_aio_optimizer-result-panel').empty();
                $('#picot_aio_optimizer-classic-results').html('<p style="color:#666; font-style:italic;">' + (picot_aio_optimizer.strings.results_placeholder || 'Analysis results will appear here.') + '</p>');
                loadSavedImageSuggestions();
                fetchPostHistory(true);
            });
        });

        setTimeout(function() {
            setupPanelObserver();
        }, 1500);
        } // Close the if (wp.plugins...) block
    }); // Close the domReady callback

    // Global initialization for all admin pages (Settings and Post)
    $(function() {
        initSettingsPage();
    });

    // Setup observer to detect when panel content is cleared and re-render
    function setupPanelObserver() {
        // Observe for panel being emptied by React re-renders
        var checkInterval = setInterval(function() {
            var panel = document.getElementById('picot_aio_optimizer-result-panel');
            if (panel && panel.innerHTML === '' && window.PicotAioOptimizer && window.PicotAioOptimizer.imageSuggestions && window.PicotAioOptimizer.imageSuggestions.length > 0) {
                // Re-render the suggestions
                var title = '';
                if (wp.data && wp.data.select('core/editor')) {
                    title = wp.data.select('core/editor').getEditedPostAttribute('title') || '';
                }
                // Get the raw suggestions (without featured item which will be added by displayImageSuggestions)
                var rawSuggestions = window.PicotAioOptimizer.imageSuggestions.filter(function(item) {
                    return !item.isFeatured;
                });
                if (rawSuggestions.length > 0) {
                    displayImageSuggestions(rawSuggestions, title, window.PicotAioOptimizer.lastUpdated);
                }
            }
        }, 500);
        
        // Store interval ID to allow cleanup if needed
        window.PicotAioOptimizer.panelObserverInterval = checkInterval;
    }

    // ==========================================
    // LOGIC FUNCTIONS (Adapted from existing)
    // ==========================================

    function triggerRewrite(instructions) {
        if (!confirm(picot_aio_optimizer.strings.confirm_rewrite)) return;
        rewrite_article(instructions);
    }

    function rewrite_article(instructions) {
 //         console.log('Picot AIO Optimizer: rewrite_article() called');
        var title = '';
        var content = '';

        if (typeof wp !== 'undefined' && wp.data && typeof wp.data.select === 'function' && wp.data.select('core/editor')) {
 //             console.log('Picot AIO Optimizer: Using Gutenberg for rewrite content');
            title = wp.data.select('core/editor').getEditedPostAttribute('title');
            content = wp.data.select('core/editor').getEditedPostContent();
        } else {
 //             console.log('Picot AIO Optimizer: Using Classic Editor for rewrite content');
            title = $('#title').val() || '';
            content = getClassicEditorContent();
        }

        if (!content) {
 //             console.warn('Picot AIO Optimizer: No content found for rewrite');
            alert(picot_aio_optimizer.strings.no_content);
            return;
        }

        var payload = {
            title: title || '',
            content: content || '',
            instructions: instructions || ''
        };

        var btn = $('#picot_aio_optimizer-rewrite-btn');
        var originalText = btn.text();
        
        showOverlay(picot_aio_optimizer.strings.rewriting || 'Rewriting article...');
        btn.text(picot_aio_optimizer.strings.rewriting || 'Rewriting...').prop('disabled', true);

        $.ajax({
            url: picot_aio_optimizer.rest_url_rewrite,
            type: 'POST',
            contentType: 'application/json; charset=UTF-8', 
            beforeSend: function ( xhr ) {
                xhr.setRequestHeader( 'X-WP-Nonce', picot_aio_optimizer.rest_nonce );
            },
            data: JSON.stringify(payload),
            success: function(response) {
                var success = response.success || (response.data && response.data.title);
                var data = response.data || response;

                if (success) {
                    // Update Title
                    wp.data.dispatch('core/editor').editPost({ title: data.title });

                    // Convert HTML content to Gutenberg blocks
                    if (wp.blocks && wp.blocks.rawHandler) {
                        var parsedBlocks = wp.blocks.rawHandler({ HTML: data.content });
                        if (parsedBlocks && parsedBlocks.length > 0) {
                            wp.data.dispatch('core/block-editor').resetBlocks(parsedBlocks);
                        } else {
                            // Fallback if parsing fails
                            wp.data.dispatch('core/editor').editPost({ content: data.content });
                        }
                    } else {
                        // Fallback for older environments
                        wp.data.dispatch('core/editor').editPost({ content: data.content });
                    }
                    
                    alert(picot_aio_optimizer.strings.success_rewrite);
                } else {
                    var errorMsg = picot_aio_optimizer.strings.error;
                    if (response.message) errorMsg += "\nServer Message: " + response.message;
                    alert(errorMsg);
                }
            },
            error: function(xhr) {
                // Robustness check: if status 200 but error triggered, it's likely "dirty" JSON (PHP notices at end)
                if (xhr.status === 200 && xhr.responseText) {
                    var responseText = xhr.responseText;
                    var jsonStart = responseText.indexOf('{');
                    var jsonEnd = responseText.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                        try {
                            var cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
                            var response = JSON.parse(cleanJson);
                            // Call success manually with cleaned data
                            this.success(response);
                            return;
                        } catch(e) {
                            debugLog('Failed to recover from dirty JSON in Rewrite: ' + e.message, 'error');
                        }
                    }
                }
                alert(handleAjaxError(xhr, 'Rewrite'));
            },
            complete: function() {
                btn.text(originalText).prop('disabled', false);
                hideOverlay();
            }
        });
    }

    // NEW: Discover Image Prompt Opportunities
    function discoverImagePrompts() {
 //         console.log('Picot AIO Optimizer: discoverImagePrompts() called');
        var title = '';
        var content = '';

        if (typeof wp !== 'undefined' && wp.data && typeof wp.data.select === 'function' && wp.data.select('core/editor')) {
 //             console.log('Picot AIO Optimizer: Using Gutenberg for image discovery');
            title = wp.data.select('core/editor').getEditedPostAttribute('title');
            content = wp.data.select('core/editor').getEditedPostContent();
        } else {
 //             console.log('Picot AIO Optimizer: Using Classic Editor for image discovery');
            title = $('#title').val() || '';
            content = getClassicEditorContent();
        }

        if (!content) {
 //             console.warn('Picot AIO Optimizer: No content found for image discovery');
            alert(picot_aio_optimizer.strings.no_content || 'No content found.');
            return;
        }

        var updatePanels = function(htmlStr) { getAllResultPanels().html(htmlStr); };

        var postId = $('#post_ID').val();

        showOverlay(picot_aio_optimizer.strings.discovering || 'Discovering image opportunities...');
        updatePanels('<div class="picot_aio_optimizer-loading"><p>' + (picot_aio_optimizer.strings.processing || 'Processing...') + '</p></div>');

        var payload = {
            title: title || '',
            content: content || ''
        };

        $.ajax({
            url: picot_aio_optimizer.rest_url_suggest_images,
            type: 'POST',
            contentType: 'application/json; charset=UTF-8', 
            beforeSend: function ( xhr ) {
                xhr.setRequestHeader( 'X-WP-Nonce', picot_aio_optimizer.rest_nonce );
            },
            data: JSON.stringify(payload),
            success: function(response) {
                if (response.success && response.data) {
                    var suggestions = [];
                    var featuredText = '';
                    
                    // Handle new structure { featured_text: "...", suggestions: [...] }
                    if (response.data.suggestions) {
                        suggestions = response.data.suggestions;
                        featuredText = response.data.featured_text || '';
                    } else if (Array.isArray(response.data)) {
                        suggestions = response.data;
                    }

                    if (suggestions.length > 0) {
                        // Filter suggestions to avoid locations near existing images
                        var filteredSuggestions = filterSuggestionsNearImages(suggestions, true);
                        
                        if (filteredSuggestions.length > 0) {
                            // Save suggestions to post meta
                            saveImageSuggestions(filteredSuggestions, featuredText, response.data.featured_prompt);
                            
                            // Prepended list for UI (Featured + Suggestions)
                            var title = wp.data.select('core/editor').getEditedPostAttribute('title');
                            // Pass featuredText as 3rd arg, updatedDate as 4th (undefined here), featuredPrompt as 5th
                            displayImageSuggestions(filteredSuggestions, title, featuredText, null, response.data.featured_prompt); 
    
                            // Distribute individual hidden markers at suggested locations
                            autoEmbedSuggestionsAtLocations(window.PicotAioOptimizer.imageSuggestions);
                        } else {
                            updatePanels('<div class="notice notice-warning"><p>' + (picot_aio_optimizer.strings.no_suggestions_near || 'No placement opportunities found') + '</p></div>');
                        }
                    } else {
                        updatePanels('<div class="notice notice-warning"><p>' + (picot_aio_optimizer.strings.no_suggestions || 'No suggestions found') + '</p></div>');
                    }
                } else {
                    updatePanels('<div class="notice notice-warning"><p>' + (picot_aio_optimizer.strings.no_suggestions || 'No suggestions found') + '</p></div>');
                }
            },
            error: function(xhr) {
                // Robustness check: if status 200 but error triggered, it's likely "dirty" JSON (PHP notices at end)
                if (xhr.status === 200 && xhr.responseText) {
                    var responseText = xhr.responseText;
                    var jsonStart = responseText.indexOf('{');
                    var jsonEnd = responseText.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                        try {
                            var cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
                            var response = JSON.parse(cleanJson);
                            // Call success manually with cleaned data
                            this.success(response);
                            return;
                        } catch(e) {
                            debugLog('Failed to recover from dirty JSON in Discover: ' + e.message, 'error');
                        }
                    }
                }
                updatePanels('<div class="notice notice-error"><p>' + handleAjaxError(xhr, 'Discover Images') + '</p></div>');
            },
            complete: function() {
                hideOverlay();
            }
        });
    }

    /**
     * Find the index and offset of a block containing specific text
     */
    function findBlockIndexByText(blocks, targetText) {
        if (!targetText) return null;

        var cleanTarget = targetText.toLowerCase().replace(/[.,!?;:()\[\]「」""'' \n\t]/g, '').trim();
        if (cleanTarget.length < 5) return null;

        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            
            if (block.name === 'core/paragraph' || block.name === 'core/freeform' || block.name === 'core/heading') {
                var rawContent = block.attributes.content || '';
                var text = stripHtml(rawContent).toLowerCase().replace(/[.,!?;:()\[\]「」""'' \n\t]/g, '');
                
                var matchPos = text.indexOf(cleanTarget);
                if (matchPos !== -1) {
                    return { 
                        clientId: block.clientId, 
                        index: i,
                        offset: matchPos
                    };
                }
            }

            if (block.innerBlocks && block.innerBlocks.length > 0) {
                var nestedMatch = findBlockIndexByText(block.innerBlocks, targetText);
                if (nestedMatch) {
                    return {
                        clientId: nestedMatch.clientId,
                        index: i,
                        rootClientId: block.clientId,
                        offset: nestedMatch.offset
                    };
                }
            }
        }
        return null;
    }

    /**
     * Filter suggestions to exclude locations near existing images and limit density
     */
    function filterSuggestionsNearImages(suggestions, includeFeatured) {
        try {
            var blocks = (typeof wp !== 'undefined' && wp.data && wp.data.select('core/block-editor')) ? wp.data.select('core/block-editor').getBlocks() : [];
            var imageBlockIndices = [];
            
            blocks.forEach(function(block, index) {
                if (block.name === 'core/image' || block.name === 'core/gallery' || block.name === 'core/media-text') {
                    imageBlockIndices.push(index);
                }
            });

            var finalSuggestions = [];
            
            // Add a virtual featured image at the top if requested to ensure distance
            if (includeFeatured) {
                finalSuggestions.push({
                    isFeatured: true,
                    targetIdx: 0,
                    targetOffset: 0,
                    location: 'Featured Image'
                });
            }

            suggestions.forEach(function(suggestion) {
                if (suggestion.isFeatured) return;

                var matchInfo = findBlockIndexByText(blocks, suggestion.location || suggestion.description);
                if (!matchInfo) return;

                var targetIdx = matchInfo.index;
                var targetOffset = matchInfo.offset || 0;

                var isTooClose = false;
                
                // 1. Distance from EXISTING images (at least 2 blocks)
                for (var i = 0; i < imageBlockIndices.length; i++) {
                    if (Math.abs(imageBlockIndices[i] - targetIdx) <= 2) {
                        isTooClose = true; 
                        break;
                    }
                }
                
                // 2. Distance from OTHER new suggestions (including Featured Image at index 0)
                if (!isTooClose) {
                    for (var i = 0; i < finalSuggestions.length; i++) {
                        var other = finalSuggestions[i];
                        if (other.targetIdx === undefined) continue;
                        
                        if (other.targetIdx === targetIdx) {
                            if (Math.abs(other.targetOffset - targetOffset) < 400) { // Increased distance
                                isTooClose = true;
                                break;
                            }
                        } else if (Math.abs(other.targetIdx - targetIdx) <= 2) {
                            isTooClose = true;
                            break;
                        }
                    }
                }
                
                if (!isTooClose && finalSuggestions.length < 9) { // 1 featured + max 8 suggestions
                    suggestion.targetIdx = targetIdx;
                    suggestion.targetOffset = targetOffset;
                    finalSuggestions.push(suggestion);
                }
            });

            // Return only the suggestions (exclude the virtual featured item if added)
            return finalSuggestions.filter(function(s) { return !s.isFeatured; });
        } catch (e) {
            debugLog('Error filtering suggestions: ' + e.message, 'warn');
            return suggestions;
        }
    }

    /**
     * Show a full-screen loading overlay to prevent interaction
     */
    function showOverlay(message) {
 //         console.log('Picot AIO Optimizer: showOverlay() called with message: ' + message);
        // Remove existing overlay if any
        $('#picot_aio_optimizer-overlay').remove();
        
        var msg = message || (picot_aio_optimizer.strings.processing || 'Processing...');
        var overlayHtml = '<div id="picot_aio_optimizer-overlay">' +
                          '<div class="picot-spinner-container" style="position:relative; width:100px; height:100px; margin-bottom:30px;">' +
                          '<div class="picot-spinner-outer" style="position:absolute; top:0; left:0; width:100%; height:100%; border:4px solid transparent; border-top-color:#3b82f6; border-radius:50%; animation:picot-spin 1.5s linear infinite;"></div>' +
                          '<div class="picot-spinner-inner" style="position:absolute; top:15px; left:15px; width:70px; height:70px; border:4px solid transparent; border-top-color:#60a5fa; border-radius:50%; animation:picot-spin-reverse 1s linear infinite;"></div>' +
                          '<div class="picot-spinner-center" style="position:absolute; top:35px; left:35px; width:30px; height:30px; background:#3b82f6; border-radius:50%; box-shadow:0 0 20px #3b82f6; animation:picot-pulse 2s ease-in-out infinite;"></div>' +
                          '</div>' +
                          '<div style="font-size:24px; font-weight:600; letter-spacing:-0.025em; margin-bottom:10px; text-align:center;">' + msg + '</div>' +
                          '<div style="font-size:14px; color:rgba(255,255,255,0.6); font-weight:400;">Please wait while AI processes your content...</div>' +
                          '</div>';
        
        var $overlay = $(overlayHtml);
        $('body').append($overlay);
        
        // Force reflow and add active class
        $overlay[0].offsetHeight;
        $overlay.addClass('active');
        
        // Add a class to body to prevent scrolling
        $('body').css('overflow', 'hidden');
    }

    /**
     * Hide the loading overlay
     */
    function hideOverlay() {
        var $overlay = $('#picot_aio_optimizer-overlay');
        $overlay.css('opacity', '0');
        setTimeout(function() {
            $overlay.remove();
            $('body').css('overflow', '');
        }, 300);
    }

    // Save image suggestions for later use
    function saveImageSuggestions(suggestions, featuredText, featuredPrompt) {
        var postId = $('#post_ID').val();
        if (!postId) return;

        var payload = {
            suggestions: suggestions,
            featured_text: featuredText || '',
            featured_prompt: featuredPrompt || ''
        };

        $.ajax({
            url: picot_aio_optimizer.rest_url_save_suggestions,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: {
                post_id: postId,
                suggestions: JSON.stringify(payload)
            }
        });
    }

    /**
     * Remove all existing suggestion markers from the editor content
     */
    function removeAllMarkers() {
        debugLog('Cleaning up existing markers...');
        
        try {
            // Gutenberg
            if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/block-editor')) {
                var editor = wp.data.dispatch('core/block-editor');
                var select = wp.data.select('core/block-editor');
                var blocks = select.getBlocks();
                var changed = false;

                blocks.forEach(function(block) {
                    if (block.name === 'core/freeform') {
                        var html = block.attributes.content || '';
                        if (html.indexOf('picot_aio_optimizer-suggestion-marker') !== -1) {
                            var newHtml = html.replace(/<div[^>]*class="picot_aio_optimizer-suggestion-marker"[^>]*><\/div>/g, '');
                            if (newHtml !== html) {
                                editor.updateBlockAttributes(block.clientId, { content: newHtml });
                                changed = true;
                            }
                        }
                    } else if (block.name === 'core/html') {
                        var html = block.attributes.content || '';
                        if (html.indexOf('picot_aio_optimizer-suggestion-marker') !== -1) {
                            editor.removeBlock(block.clientId);
                            changed = true;
                        }
                    }
                });
            }

            // Classic Editor (TinyMCE)
            if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
                var content = tinymce.activeEditor.getContent();
                if (content.indexOf('picot_aio_optimizer-suggestion-marker') !== -1) {
                    var newContent = content.replace(/<div[^>]*class="picot_aio_optimizer-suggestion-marker"[^>]*><\/div>/g, '');
                    tinymce.activeEditor.setContent(newContent);
                }
            }
        } catch (e) {
            debugLog('Failed to clean markers: ' + e.message, 'warn');
        }
    }

    /**
     * Remove the Featured Image Prompt box generated during rewrite
     */
    function removeFeaturedImagePrompt() {
        debugLog('Cleaning up Featured Image Prompt...');
        try {
            // Gutenberg
            if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/block-editor')) {
                var editor = wp.data.dispatch('core/block-editor');
                var select = wp.data.select('core/block-editor');
                var blocks = select.getBlocks();
                
                blocks.forEach(function(block) {
                    // It's usually a Custom HTML block or Classic block
                    if (block.name === 'core/html' || block.name === 'core/freeform') {
                        var html = block.attributes.content || '';
                        // Look for the specific div style used for the thumbnail prompt
                        if (html.indexOf('background:#e6eeff') !== -1 && html.indexOf('border:2px solid #4d4dff') !== -1) {
                            if (block.name === 'core/html') {
                                editor.removeBlock(block.clientId);
                            } else {
                                // If inside Classic block, remove the div
                                var newHtml = html.replace(/<div[^>]*style="[^"]*background:#e6eeff[^>]*>[\s\S]*?<\/div>/i, '');
                                editor.updateBlockAttributes(block.clientId, { content: newHtml });
                            }
                        }
                    }
                });
            }

            // Classic Editor (TinyMCE)
            if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
                var content = tinymce.activeEditor.getContent();
                if (content.indexOf('background:#e6eeff') !== -1 && content.indexOf('border:2px solid #4d4dff') !== -1) {
                    var newContent = content.replace(/<div[^>]*style="[^"]*background:#e6eeff[^>]*>[\s\S]*?<\/div>/i, '');
                    tinymce.activeEditor.setContent(newContent);
                }
            }
        } catch (e) {
            debugLog('Failed to clean Featured Image Prompt: ' + e.message, 'warn');
        }
    }

    // Automatically embed suggestions as individual hidden markers at specific locations
    function autoEmbedSuggestionsAtLocations(suggestions) {
        if (!suggestions || suggestions.length === 0) return;

        // Clean up first!
        removeAllMarkers();
        
        try {
            var createBlock = wp.blocks.createBlock;
            var editor = wp.data.dispatch('core/block-editor');
            var select = wp.data.select('core/block-editor');
            var embeddedCount = 0;

            // 1. Gutenberg Case
            if (editor && select) {
                var blocks = select.getBlocks();
                // Remove any existing markers first
                var existingMarkers = blocks.filter(function(b) {
                    return b.name === 'core/html' && b.attributes.content && b.attributes.content.indexOf('picot_aio_optimizer-suggestion-marker') !== -1;
                });
                if (existingMarkers.length > 0) {
                    editor.removeBlocks(existingMarkers.map(function(b) { return b.clientId; }));
                }

                suggestions.forEach(function(suggestion, index) {
                    if (suggestion.isFeatured) return;

                    var matchInfo = findBlockIndexByText(blocks, suggestion.location || suggestion.description);
                    if (matchInfo) {
                        var markerHtml = '<div class="picot_aio_optimizer-suggestion-marker" data-index="' + index + '" style="display:none; visibility:hidden; height:0; overflow:hidden;"><!-- PICOT_AIO_OPTIMIZER_MARKER:' + index + ' --></div>';
                        var targetBlock = select.getBlock(matchInfo.clientId);

                        if (targetBlock && targetBlock.name === 'core/freeform') {
                            // CLASSIC BLOCK: Inject marker into HTML
                            debugLog('Injecting marker ' + index + ' into Classic Block HTML');
                            var oldHtml = targetBlock.attributes.content || '';
                            var newHtml = insertMarkerIntoHtmlString(oldHtml, suggestion.location || suggestion.description, markerHtml);
                            editor.updateBlockAttributes(matchInfo.clientId, { content: newHtml });
                        } else {
                            // NORMAL BLOCK: Insert after block
                            var markerBlock = createBlock('core/html', { content: markerHtml });
                            var currentIndex = select.getBlockIndex(matchInfo.clientId, matchInfo.rootClientId);
                            editor.insertBlock(markerBlock, currentIndex + 1, matchInfo.rootClientId, false);
                        }
                        
                        if (window.PicotAioOptimizer.imageSuggestions[index]) {
                            window.PicotAioOptimizer.imageSuggestions[index].hasPlaceholder = true;
                        }
                        embeddedCount++;
                    }
                });
            } 
            // 2. Classic Editor Case
            else if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
                var content = tinymce.activeEditor.getContent();
                suggestions.forEach(function(suggestion, index) {
                    if (suggestion.isFeatured) return;
                    var markerHtml = '<div class="picot_aio_optimizer-suggestion-marker" data-index="' + index + '" style="display:none;"><!-- PICOT_AIO_OPTIMIZER_MARKER:' + index + ' --></div>';
                    content = insertMarkerIntoHtmlString(content, suggestion.location || suggestion.description, markerHtml);
                    if (window.PicotAioOptimizer.imageSuggestions[index]) {
                        window.PicotAioOptimizer.imageSuggestions[index].hasPlaceholder = true;
                    }
                    embeddedCount++;
                });
                tinymce.activeEditor.setContent(content);
            }

            debugLog('Auto-embedded ' + embeddedCount + ' markers');
        } catch (e) {
            debugLog('Failed to auto-embed suggestions: ' + e.message, 'error');
        }
    }

    // Helper to inject a marker string into a raw HTML string
    function insertMarkerIntoHtmlString(html, targetText, markerHtml) {
        var cleanTarget = stripHtml(targetText).trim();
        if (cleanTarget.length < 3) return html + markerHtml;

        var pos = html.indexOf(cleanTarget);
        if (pos === -1) {
            pos = html.indexOf(cleanTarget.substring(0, 10));
        }

        if (pos !== -1) {
            var endTag = html.indexOf('</p>', pos);
            if (endTag === -1) endTag = html.indexOf('</div>', pos);
            if (endTag === -1) endTag = html.indexOf('\n', pos);

            if (endTag !== -1) {
                var offset = (html.substr(endTag, 4) === '</p>') ? 4 : 0;
                if (offset === 0 && html.substr(endTag, 6) === '</div>') offset = 6;
                var splitAt = endTag + offset;
                return html.substring(0, splitAt) + markerHtml + html.substring(splitAt);
            }
        }
        return html + markerHtml;
    }

    // Utility to strip HTML tags from a string
    function stripHtml(html) {
        if (!html) return '';
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // Helper to find block index by matching text content (robust smart matching)
    function findBlockIndexByText(blocks, searchText) {
        if (!searchText || !blocks || blocks.length === 0) return null;
        
        debugLog('--- Starting Block Search ---');
        debugLog('Search Text: ' + searchText);

        // 1. Extract core target text: Try to find text within quotes first
        var coreTarget = '';
        var quoteMatch = searchText.match(/[「"'](.+?)[」"']/);
        if (quoteMatch && quoteMatch[1]) {
            coreTarget = quoteMatch[1];
        } else {
            coreTarget = searchText.replace(/(の(段落|セクション|リスト|テーブル|最後|直前|後|部分|メッセージ|テキスト|見出し)).*$/, '');
        }

        // 2. Normalize target
        var cleanTarget = stripHtml(coreTarget).toLowerCase().replace(/[.,!?;:()\[\]「」""'' \n\t　、。！？」]/g, '').trim();
        debugLog('Clean Target: ' + cleanTarget);
        
        if (cleanTarget.length < 2) return null;

        // Try fuzzy snippets
        var snippets = [
            cleanTarget, // Full
            cleanTarget.substring(0, 8), // Start
            cleanTarget.length > 8 ? cleanTarget.substring(cleanTarget.length - 8) : cleanTarget // End
        ];

        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            
            // Get content from common attributes
            var contentParts = [];
            if (block.attributes) {
                var a = block.attributes;
                if (a.content) contentParts.push(a.content);
                if (a.values) contentParts.push(Array.isArray(a.values) ? a.values.join('') : a.values);
                if (a.value) contentParts.push(a.value);
                if (a.text) contentParts.push(a.text);
            }
            
            var rawContent = contentParts.join(' ');
            var cleanContent = stripHtml(rawContent).toLowerCase().replace(/[.,!?;:()\[\]「」""'' \n\t　、。！？」]/g, '').trim();
            
            // LOG ALL BLOCKS (to identify why it fails)
            if (cleanContent.length > 0) {
                debugLog('Checking Block ' + i + ' (' + block.name + '): ' + cleanContent.substring(0, 30) + '...');
            }

            // 3-way fuzzy match
            var isMatch = false;
            for (var s = 0; s < snippets.length; s++) {
                if (snippets[s].length >= 3 && (cleanContent.indexOf(snippets[s]) !== -1 || snippets[s].indexOf(cleanContent) !== -1)) {
                    isMatch = true;
                    debugLog('>>> MATCH FOUND! Snippet: ' + snippets[s]);
                    break;
                }
            }

            if (isMatch) {
                return {
                    clientId: block.clientId,
                    index: i,
                    rootClientId: wp.data.select('core/block-editor').getBlockRootClientId(block.clientId)
                };
            }

            // Recurse
            if (block.innerBlocks && block.innerBlocks.length > 0) {
                var found = findBlockIndexByText(block.innerBlocks, searchText);
                if (found) return found;
            }
        }
        
        debugLog('--- Search Finished: No Match ---');
        return null;
    }

    // Load saved image suggestions on post load
    function loadSavedImageSuggestions() {
        var postId = $('#post_ID').val();
        if (!postId) return;

        var separator = picot_aio_optimizer.rest_url_load_suggestions.indexOf('?') !== -1 ? '&' : '?';
        $.ajax({
            url: picot_aio_optimizer.rest_url_load_suggestions + separator + 'post_id=' + postId,
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            success: function(response) {
                if (response.success && response.data) {
                    var data = response.data;
                    
                    // Handle if data is a string (JSON encoded)
                    if (typeof data === 'string' && data.length > 0) {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            debugLog('Failed to parse saved suggestions: ' + e.message, 'warn');
                            return;
                        }
                    }
                    
                    if (data && data.suggestions) {
                        var title = wp.data.select('core/editor').getEditedPostAttribute('title');
                        displayImageSuggestions(data.suggestions, title, data.featured_text, response.updated, data.featured_prompt);
                    } else if (Array.isArray(data) && data.length > 0) {
                        // Compatibility for old format
                        var title = wp.data.select('core/editor').getEditedPostAttribute('title');
                        displayImageSuggestions(data, title, null, response.updated);
                    }
                }
            }
        });
    }

    function displayImageSuggestions(suggestions, postTitle, featuredText, updatedDate, featuredPrompt) {
        var updatePanels = function(htmlStr) { getAllResultPanels().html(htmlStr); };
        
        // Always add Featured Image as first item
        var featuredPromptText = featuredText ? featuredText : (postTitle || 'Blog Post');
        
        var finalFeaturedPrompt = featuredPrompt ? featuredPrompt : 
                                  'A professional blog featured image (thumbnail). STYLE: Modern Typography Design, Poster Art. ACTION: Render the text "' + featuredPromptText + '" in large, clear, bold characters that EXACTLY MATCH THE LANGUAGE of the article title. Use the same script and language as the title text - do not translate or convert. BACKGROUND: Clean, minimal, high contrast. No garbage characters.';

        var featuredItem = {
            location: picot_aio_optimizer.strings.featured_image || 'Featured Image',
            prompt: finalFeaturedPrompt,
            description: picot_aio_optimizer.strings.featured_image_prompt || 'Generate featured image',
            isFeatured: true
        };

        var allSuggestions = [featuredItem].concat(suggestions);
        window.PicotAioOptimizer.imageSuggestions = allSuggestions;
        window.PicotAioOptimizer.lastUpdated = updatedDate || null;

        var html = '<div style="font-size:13px; color:#1d2327;">';
        html += '<h3 style="margin-top:0; margin-bottom:15px; padding-bottom:8px; border-bottom:1px solid #ccd0d4; font-size:14px;">🖼️ ' + (picot_aio_optimizer.strings.discover_images_btn || 'Image Opportunities') + '</h3>';
        
        // Show saved date if available
        if (updatedDate) {
            html += '<p style="font-size:11px; color:#646970; margin-top:-5px; margin-bottom:15px;">' + (picot_aio_optimizer.strings.save_date || 'Saved: ') + updatedDate + '</p>';
        }

        allSuggestions.forEach(function(item, index) {
            var borderColor = item.isFeatured ? '#f56e28' : '#2271b1';
            html += '<div style="margin-bottom:20px; padding-left:10px; border-left:3px solid ' + borderColor + ';">';
            html += '<strong style="display:block; margin-bottom:5px; font-size:13px; color:' + borderColor + ';">' + (item.isFeatured ? '⭐ ' : '📍 ') + escapeHtml(item.location || item.description) + '</strong>';
            html += '<div style="line-height:1.5; margin-bottom:8px;">' + escapeHtml(item.description || '') + '</div>';
            html += '<div style="display:flex; gap:8px; flex-wrap:wrap;">';
            
            // Single combined button: Generate and Place
            html += '<button type="button" class="button button-primary picot_aio_optimizer-gen-single-btn" data-index="' + index + '">' + (picot_aio_optimizer.strings.gen_and_place || 'Generate and Place') + '</button>';
            
            html += '</div>';
            html += '</div>';
        });

        // Add batch generation buttons
        html += '<div style="margin-top:20px; padding-top:15px; border-top:1px solid #ccd0d4;">';
        html += '<button type="button" class="button button-primary" id="picot_aio_optimizer-generate-all" style="width:100%;">' + (picot_aio_optimizer.strings.gen_all || 'Batch Generate and Place') + '</button>';
        html += '</div>';

        html += '</div>';
        updatePanels(html);

        // Bind event handlers
        $(document).off('click', '.picot_aio_optimizer-gen-single-btn').on('click', '.picot_aio_optimizer-gen-single-btn', function() {
            var idx = $(this).data('index');
            generateSingleImage(idx, $(this));
        });

        // Generate all images button handler
        $(document).off('click', '#picot_aio_optimizer-generate-all').on('click', '#picot_aio_optimizer-generate-all', function() {
            generateAllImages();
        });
    }

    // Generate a single image from suggestion
    function generateSingleImage(index, $btn) {
        var suggestion = window.PicotAioOptimizer.imageSuggestions[index];
        if (!suggestion) return;

        var originalText = $btn.text();
        showOverlay(picot_aio_optimizer.strings.generating || 'Generating image...');
        $btn.text(picot_aio_optimizer.strings.generating || 'Generating...').prop('disabled', true);

        var fullPrompt = suggestion.prompt;
        if (picot_aio_optimizer.image_style_desc) {
            fullPrompt += ". Style: " + picot_aio_optimizer.image_style_desc;
        }

        $.ajax({
            url: picot_aio_optimizer.rest_url_generate_image,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: {
                prompt: fullPrompt
            },
            success: function(response) {
                if (response.success && response.data) {
                    var imageUrl = response.data.url;
                    var attachmentId = response.data.attachment_id || response.data.id;

                    if (suggestion.isFeatured && attachmentId) {
                        // 1. Set as WordPress Featured Media
                        wp.data.dispatch('core/editor').editPost({ featured_media: attachmentId });
                        // 2. ALSO insert into content at the top
                        insertImageBlockAtCursor(attachmentId, imageUrl, suggestion.description || '', 'START_OF_POST');
                        removeFeaturedImagePrompt();
                    } else {
                        // First try to replace a placeholder, then fall back to smart insertion
                        var replaced = replacePlaceholderWithImage(index, attachmentId, imageUrl, suggestion.description || '');
                        if (!replaced) {
                            var targetText = suggestion.location || suggestion.description || '';
                            insertImageBlockAtCursor(attachmentId, imageUrl, suggestion.description || '', targetText);
                        }
                    }

                    // Remove from suggestions array and refresh UI
                    window.PicotAioOptimizer.imageSuggestions.splice(index, 1);
                    
                    var cleanSuggestions = window.PicotAioOptimizer.imageSuggestions.filter(function(s) { return !s.isFeatured; });
                    var feat = window.PicotAioOptimizer.imageSuggestions.find(function(s) { return s.isFeatured; });
                    saveImageSuggestions(cleanSuggestions, feat ? feat.featured_text : null, feat ? feat.prompt : null);
                    
                    var title = wp.data.select('core/editor').getEditedPostAttribute('title');
                    displayImageSuggestions(cleanSuggestions, title, feat ? feat.featured_text : null, null, feat ? feat.prompt : null);
                } else {
                    alert('Generation failed: ' + (response.message || 'Unknown error'));
                }
            },
            error: function(xhr) {
                var errorMsg = 'Generation failed';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                alert(errorMsg);
            },
            complete: function() {
                $btn.text(originalText).prop('disabled', false);
                hideOverlay();
            }
        });
    }

    // Insert image block or HTML at specific location
    function insertImageBlockAtCursor(attachmentId, imageUrl, altText, targetText) {
        var imgHtml = '\n<figure class="wp-block-image size-large"><img src="' + imageUrl + '" alt="' + (altText || '') + '" class="wp-image-' + attachmentId + '"/></figure>\n';
        
        try {
            // --- CASE 1: Gutenberg (Block Editor) ---
            if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/block-editor')) {
                var editor = wp.data.dispatch('core/block-editor');
                var select = wp.data.select('core/block-editor');
                var blocks = select.getBlocks();
                
                if (targetText === 'START_OF_POST') {
                    debugLog('Checking for existing image at start of post...');
                    if (blocks.length > 0 && (blocks[0].name === 'core/image' || blocks[0].name === 'core/cover')) {
                        debugLog('Image already exists at the start of post. Skipping insertion to avoid duplication.');
                        return;
                    }
                    
                    debugLog('Inserting image at the start of post.');
                    var imageBlock = wp.blocks.createBlock('core/image', {
                        id: attachmentId,
                        url: imageUrl,
                        alt: altText || ''
                    });
                    editor.insertBlock(imageBlock, 0, undefined, false);
                    return;
                }

                debugLog('Gutenberg detected. Searching for: ' + targetText);
                var matchInfo = findBlockIndexByText(blocks, targetText);
                
                if (matchInfo) {
                    var targetBlock = select.getBlock(matchInfo.clientId);
                    
                    // IF CLASSIC BLOCK: Insert INSIDE the block HTML
                    if (targetBlock && targetBlock.name === 'core/freeform') {
                        debugLog('Target is a Classic Block. Injecting into HTML content.');
                        var oldHtml = targetBlock.attributes.content || '';
                        var newHtml = insertImageIntoHtmlString(oldHtml, targetText, imageUrl, altText, attachmentId);
                        editor.updateBlockAttributes(matchInfo.clientId, { content: newHtml });
                        return;
                    }

                    // NORMAL BLOCK: Insert after the block
                    var currentIndex = select.getBlockIndex(matchInfo.clientId);
                    var imageBlock = wp.blocks.createBlock('core/image', {
                        id: attachmentId,
                        url: imageUrl,
                        alt: altText || ''
                    });
                    editor.insertBlock(imageBlock, currentIndex + 1, matchInfo.rootClientId, false);
                    return;
                }
            }

            // --- CASE 2: Classic Editor (TinyMCE) ---
            if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
                debugLog('Classic Editor detected. Injecting into TinyMCE.');
                var content = tinymce.activeEditor.getContent();
                var updatedContent = '';
                if (targetText === 'START_OF_POST') {
                    var trimmed = content.trim();
                    if (trimmed.indexOf('<img') === 0 || trimmed.indexOf('<figure') === 0 || trimmed.indexOf('<div class="wp-block-image') === 0) {
                        debugLog('Image already exists at the start of post (Classic). Skipping.');
                        return;
                    }
                    updatedContent = imgHtml + content;
                } else {
                    updatedContent = insertImageIntoHtmlString(content, targetText, imageUrl, altText, attachmentId);
                }
                tinymce.activeEditor.setContent(updatedContent);
                return;
            }

            // --- FALLBACK: Just append or insert at cursor if possible ---
            if (typeof wp !== 'undefined' && wp.data && wp.data.dispatch('core/block-editor')) {
                wp.data.dispatch('core/block-editor').insertBlock(wp.blocks.createBlock('core/image', { id: attachmentId, url: imageUrl, alt: altText }), undefined, undefined, false);
            } else if (window.send_to_editor) {
                window.send_to_editor(imgHtml);
            }

        } catch (e) {
            debugLog('Insertion failed: ' + e.message, 'error');
        }
    }

    // Helper to inject image HTML into a raw HTML string based on text matching
    function insertImageIntoHtmlString(html, targetText, imageUrl, altText, attachmentId) {
        if (!targetText) return html + '\n<img src="' + imageUrl + '" alt="' + (altText || '') + '" class="aligncenter" />\n';

        var cleanTarget = stripHtml(targetText).trim();
        if (cleanTarget.length < 3) return html + '\n<img src="' + imageUrl + '" alt="' + (altText || '') + '" class="aligncenter" />\n';

        var imgHtml = '\n<figure class="wp-block-image aligncenter size-large"><img src="' + imageUrl + '" alt="' + (altText || '') + '" class="wp-image-' + attachmentId + '"/></figure>\n';

        // Try to find target text position
        var pos = html.indexOf(cleanTarget);
        if (pos === -1) {
            // Try very fuzzy (first 10 chars)
            pos = html.indexOf(cleanTarget.substring(0, 10));
        }

        if (pos !== -1) {
            // Find end of paragraph or current tag
            var endTag = html.indexOf('</p>', pos);
            if (endTag === -1) endTag = html.indexOf('</div>', pos);
            if (endTag === -1) endTag = html.indexOf('\n', pos);

            if (endTag !== -1) {
                var offset = (html.substr(endTag, 4) === '</p>') ? 4 : 0;
                if (offset === 0 && html.substr(endTag, 6) === '</div>') offset = 6;
                
                var splitAt = endTag + offset;
                return html.substring(0, splitAt) + imgHtml + html.substring(splitAt);
            }
        }

        return html + imgHtml; // Append if not found
    }

    // Find and replace a hidden marker with an image
    function replacePlaceholderWithImage(index, attachmentId, imageUrl, altText) {
        try {
            var blocks = wp.data.select('core/block-editor').getBlocks();
            var regexMarker = new RegExp('<!--\\s*PICOT_AIO_OPTIMIZER_MARKER:' + index + '\\s*-->', 'i');
            var regexDataIndex = new RegExp('data-index=["\']' + index + '["\']', 'i');
            
            return findAndReplaceBlockRecursively(blocks, regexMarker, regexDataIndex, attachmentId, imageUrl, altText);
        } catch (e) {
            debugLog('Failed to replace marker: ' + e.message, 'error');
            return false;
        }
    }

    // Recursive helper to find and replace the marker block
    function findAndReplaceBlockRecursively(blocks, regexMarker, regexDataIndex, attachmentId, imageUrl, altText) {
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            
            if (block.name === 'core/html' && block.attributes && block.attributes.content) {
                var content = block.attributes.content;
                if (regexMarker.test(content) || regexDataIndex.test(content)) {
                    var createBlock = wp.blocks.createBlock;
                    var replaceBlock = wp.data.dispatch('core/block-editor').replaceBlock;
                    
                    var imageBlock = createBlock('core/image', {
                        id: attachmentId,
                        url: imageUrl,
                        alt: altText || '',
                        caption: ''
                    });
                    
                    // replaceBlock auto-selects the new block; use remove+insert with updateSelection=false instead
                    var blockIndex = wp.data.select('core/block-editor').getBlockIndex(block.clientId);
                    var rootClientId = wp.data.select('core/block-editor').getBlockRootClientId(block.clientId);
                    wp.data.dispatch('core/block-editor').removeBlock(block.clientId, false);
                    wp.data.dispatch('core/block-editor').insertBlock(imageBlock, blockIndex, rootClientId, false);
                    return true;
                }
            }

            if (block.innerBlocks && block.innerBlocks.length > 0) {
                if (findAndReplaceBlockRecursively(block.innerBlocks, regexMarker, regexDataIndex, attachmentId, imageUrl, altText)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Sequential generation for all images
    function generateAllImages() {
        var suggestions = window.PicotAioOptimizer.imageSuggestions || [];
        var indicesToProcess = [];

        suggestions.forEach(function(suggestion, index) {
            indicesToProcess.push(index);
        });

        if (indicesToProcess.length === 0) {
            alert(picot_aio_optimizer.strings.no_suggestions || 'No suggestions found.');
            return;
        }

        var totalCount = indicesToProcess.length;
        var currentIndex = 0;
        var $btn = $('#picot_aio_optimizer-generate-all');
        var originalBtnText = $btn.text();
        
        showOverlay((picot_aio_optimizer.strings.batch_progress || 'Generating... ') + '(0/' + totalCount + ')');
        $btn.text((picot_aio_optimizer.strings.batch_progress || 'Generating... ') + '(0/' + totalCount + ')').prop('disabled', true);

        function processNext() {
            var idx = indicesToProcess[currentIndex];
            var suggestion = suggestions[idx];
            var progressText = (picot_aio_optimizer.strings.batch_progress || 'Generating... ') + '(' + (currentIndex + 1) + '/' + totalCount + ')';
            $btn.text(progressText);
            showOverlay(progressText); // Update overlay message

            var fullPrompt = suggestion.prompt;
            if (picot_aio_optimizer.image_style_desc) {
                fullPrompt += ". Style: " + picot_aio_optimizer.image_style_desc;
            }

            $.ajax({
                url: picot_aio_optimizer.rest_url_generate_image,
                type: 'POST',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
                },
                data: { prompt: fullPrompt },
                success: function(response) {
                    if (response.success && response.data) {
                        var attachmentId = response.data.attachment_id || response.data.id;
                        var imageUrl = response.data.url;
                        
                        if (suggestion.isFeatured && attachmentId) {
                            // Set as featured media AND insert at top
                            wp.data.dispatch('core/editor').editPost({ featured_media: attachmentId });
                            insertImageBlockAtCursor(attachmentId, imageUrl, suggestion.description || '', 'START_OF_POST');
                            removeFeaturedImagePrompt();
                        } else {
                            // Try to replace placeholder first
                            var replaced = replacePlaceholderWithImage(idx, attachmentId, imageUrl, suggestion.description);
                            if (!replaced) {
                                // Fallback to smart insertion
                                var targetText = suggestion.location || suggestion.description || '';
                                insertImageBlockAtCursor(attachmentId, imageUrl, suggestion.description || '', targetText);
                            }
                        }
                    }
                },
                complete: function() {
                    currentIndex++;
                    if (currentIndex >= indicesToProcess.length) {
                        // FINISHED ALL
                        $btn.text(originalBtnText).prop('disabled', false);
                        hideOverlay();
                        clearImageSuggestions(); // Clear meta and UI
                    } else {
                        // Continue
                        setTimeout(processNext, 500);
                    }
                }
            });
        }
        processNext();
    }

    // Clear saved suggestions from DB and UI
    function clearImageSuggestions() {
        var postId = $('#post_ID').val();
        if (!postId) return;

        $.ajax({
            url: picot_aio_optimizer.rest_url_save_suggestions,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: {
                post_id: postId,
                suggestions: '' // Empty string clears the meta
            },
            success: function() {
                window.PicotAioOptimizer.imageSuggestions = [];
                var html = '<div class="notice notice-success"><p>' + (picot_aio_optimizer.strings.batch_complete || 'Batch generation complete! All suggestions cleared.') + '</p></div>';
                getAllResultPanels().html(html);
            }
        });
    }

    function fetchPostHistory(autoLoadLatest) {
        var postId = wp.data.select("core/editor") ? wp.data.select("core/editor").getCurrentPostId() : 0;
        if (!postId) return;
        
        autoLoadLatest = (autoLoadLatest === true);

        // Collect ALL active result containers (doc panel, sidebar panel, classic editor)
        var getAllPanels = function() {
            var panels = $();
            var docPanel     = $('#picot_aio_optimizer-result-panel');
            var sidebarPanel = $('#picot_aio_optimizer-result-panel-sidebar');
            var classicPanel = $('#picot_aio_optimizer-classic-results');
            if (docPanel.length)     panels = panels.add(docPanel);
            if (sidebarPanel.length) panels = panels.add(sidebarPanel);
            if (classicPanel.length) panels = panels.add(classicPanel);
            return panels;
        };

        var allPanels = getAllPanels();
        if (allPanels.length === 0) {
            debugLog('Result div not found', 'warn');
            return;
        }

        allPanels.html('<div class="notice notice-info"><p>' + (picot_aio_optimizer.strings.loading_history || 'Loading history...') + '</p></div>');

        $.ajax({
            url: picot_aio_optimizer.rest_url_history,
            type: "GET",
            data: { post_id: postId, limit: 10 },
            beforeSend: function ( xhr ) {
                xhr.setRequestHeader( 'X-WP-Nonce', picot_aio_optimizer.rest_nonce );
            },
            success: function ( response ) {
                if (response.success && response.data && response.data.length > 0) {
                    window.PicotAioOptimizer.currentHistory = response.data;
                    
                    if (autoLoadLatest) {
                        // Automatically show the most recent result
                        window.PicotAioOptimizer.restoreHistoryItem(response.data[0].id);
                    } else {
                        // User clicked the button, show the list in all panels
                        var html = '<h4>' + (picot_aio_optimizer.strings.history_title || 'History') + '</h4><ul style="border-top:1px solid #eee; padding-top:10px;">';
                        response.data.forEach(function(log) {
                             html += '<li style="margin-bottom:10px; font-size:12px;">';
                             html += '<strong>[' + log.created_at + ']</strong><br>';
                             html += '<button type="button" class="button button-small" onclick="window.PicotAioOptimizer.restoreHistoryItem(' + log.id + ')">' + (picot_aio_optimizer.strings.show_btn || 'Show') + '</button>';
                             html += '</li>';
                        });
                        html += '</ul>';
                        // Re-collect panels at write time (React may have re-rendered)
                        getAllPanels().html(html);
                    }
                } else {
                    if (!autoLoadLatest) {
                        getAllPanels().html('<div class="notice notice-warning"><p>' + (picot_aio_optimizer.strings.no_history || 'No history found.') + '</p></div>');
                    }
                }
            },
            error: function(xhr) {
                getAllPanels().html('<div class="notice notice-error"><p>' + (picot_aio_optimizer.strings.load_history_error || 'Failed to load history.') + '</p></div>');
            }
        });
    }

    // Expose helper to global window for onclick handlers
    window.PicotAioOptimizer = window.PicotAioOptimizer || {};
    window.PicotAioOptimizer.restoreHistoryItem = function(id, isClassic) {
        if (!window.PicotAioOptimizer.currentHistory) return;
        var item = window.PicotAioOptimizer.currentHistory.find(function(h) { return h.id == id; });
        if (item) {
            try {
                var advice = item.advice_result;
                if (typeof advice === 'string') {
                    // Strip potential Markdown wrapping before checking content
                    var cleanAdvice = advice.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
                    
                    if (cleanAdvice.startsWith('{') || cleanAdvice.startsWith('[')) {
                        try {
                            var parsed = JSON.parse(cleanAdvice);
                            displayResultsInternal(parsed, isClassic ? $('#picot_aio_optimizer-classic-results') : undefined);
                            return;
                        } catch(e) {
                            // Fall through to raw display
                        }
                    }
                    displayResultsInternal(advice, isClassic ? $('#picot_aio_optimizer-classic-results') : undefined);
                } else {
                    displayResultsInternal(advice, isClassic ? $('#picot_aio_optimizer-classic-results') : undefined);
                }
            } catch(e) {
                debugLog('Failed to restore history item: ' + e.message, 'error');
            }
        }
    };

    // Clipboard helper
    window.PicotAioOptimizer.copyToClipboard = function(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function() {
                alert(picot_aio_optimizer.strings.copied || 'Copied!');
            }).catch(function(err) {
                debugLog('Copy failed: ' + err.message, 'error');
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = 0;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('Copied!');
        } catch (err) {
            alert('Copy failed. Please copy manually.');
        }
        document.body.removeChild(textarea);
    }

    function analyzeContent() {
 //         console.log('Picot AIO Optimizer: analyzeContent() called');
        var postContent = '';
        var postId = 0;

        if (typeof wp !== 'undefined' && wp.data && typeof wp.data.select === 'function' && wp.data.select("core/editor")) {
 //             console.log('Picot AIO Optimizer: Using Gutenberg to get content');
            postContent = wp.data.select("core/editor").getEditedPostContent();
            postId = wp.data.select("core/editor").getCurrentPostId();
            
            // DOM Fallback if Gutenberg API returns empty (iframe editor / page builders)
            if (!postContent) {
 //                 console.log('Picot AIO Optimizer: Gutenberg API returned empty, falling back to DOM extraction...');
                var editorCanvas = document.querySelector('iframe[name="editor-canvas"]');
                if (editorCanvas && editorCanvas.contentDocument) {
                    postContent = editorCanvas.contentDocument.body.innerText || '';
                } else {
                    var wrapper = document.querySelector('.editor-styles-wrapper') || document.querySelector('.block-editor-block-list__layout');
                    if (wrapper) {
                        postContent = wrapper.innerText || '';
                    }
                }
            }
        } else {
 //             console.log('Picot AIO Optimizer: Falling back to Classic Editor content');
            postContent = getClassicEditorContent();
            postId = $('#post_ID').val() || 0;
        }

        if (!postContent) {
             var diagMsg = 'Diagnostics:\n';
             diagMsg += '- Gutenberg available: ' + (wp.data && wp.data.select("core/editor") ? 'Yes' : 'No') + '\n';
             diagMsg += '- Classic Editor available: ' + (typeof tinymce !== 'undefined' && tinymce.activeEditor ? 'Yes' : 'No') + '\n';
             diagMsg += 'If you have text in the editor, your page builder might not be supported.';
             
             alert(picot_aio_optimizer.strings.no_content + '\n\n' + diagMsg);
             return;
        }

        var updatePanels = function(htmlStr) { getAllResultPanels().html(htmlStr); };

        updatePanels('<div class="notice notice-info"><p>' + picot_aio_optimizer.strings.analyzing + '</p></div>');

        var formData = "content=" + encodeURIComponent(postContent || '') + "&post_id=" + postId;

        showOverlay(picot_aio_optimizer.strings.analyzing || 'Analyzing...');
        
        $.ajax({
            url: picot_aio_optimizer.rest_url_analyze,
            type: "POST",
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            beforeSend: function ( xhr ) {
                xhr.setRequestHeader( 'X-WP-Nonce', picot_aio_optimizer.rest_nonce );
            },
            data: formData,
            success: function (response) {
                if (response.success) {
                    displayResultsInternal(response.data);
                } else {
                     var msg = response.data || picot_aio_optimizer.strings.error;
                     updatePanels('<div class="notice notice-error"><p>' + msg + '</p></div>');
                }
            },
            error: function (xhr) {
                updatePanels('<div class="notice notice-error"><p>' + handleAjaxError(xhr, 'Analysis') + '</p></div>');
            },
            complete: function() {
                hideOverlay();
            }
        });
    }

    function displayResultsInternal(response, targetDiv) {
        // Render to both panels if a specific target isn't explicitly provided
        var renderTargets = [];
        if (targetDiv) {
            renderTargets.push(targetDiv);
        } else {
            getAllResultPanels().each(function() { renderTargets.push($(this)); });
        }
        
        if (!response) {
             renderTargets.forEach(function(target) {
                 target.html('<div class="notice notice-error"><p>' + (picot_aio_optimizer.strings.error || 'No analysis data found.') + '</p></div>');
             });
            return;
        }

        // Handle raw string responses (Markdown)
        if (typeof response === 'string' || !response.summary) {
            var rawText = (typeof response === 'string') ? response : JSON.stringify(response, null, 2);
            var htmlFallback = '<div class="notice notice-warning" style="padding:15px;">';
            htmlFallback += '<h3 style="margin-top:0;">' + (picot_aio_optimizer.strings.analysis_result_title || 'Analysis Result') + '</h3>';
            htmlFallback += '<p><strong>⚠️ ' + (picot_aio_optimizer.strings.format_warning || 'AI response format was unexpected. Displaying as text.') + '</strong></p>';
            htmlFallback += '<div style="background:#fff; padding:15px; border:1px solid #ddd; border-radius:4px;">' + renderMarkdown(rawText) + '</div>';
            htmlFallback += '<div style="margin-top:15px; border-top:1px solid #ccd0d4; padding-top:10px;">';
            htmlFallback += '<button type="button" class="button button-secondary" onclick="window.location.reload();">' + (picot_aio_optimizer.strings.clear_results_btn || 'Clear Results') + '</button>';
            htmlFallback += '</div></div>';
            renderTargets.forEach(function(target) {
                target.html(htmlFallback);
            });
            return;
        }

        var html = '<div style="font-size:13px; color:#1d2327;">';
        html += '<h3 style="margin-top:0; margin-bottom:15px; padding-bottom:8px; border-bottom:1px solid #ccd0d4; font-size:14px;">' + (picot_aio_optimizer.strings.analysis_result_title || 'Analysis Result') + '</h3>';
        
        // Summary
        html += '<div style="margin-bottom:20px;">';
        html += '<strong style="display:block; margin-bottom:5px; font-size:13px;">' + (picot_aio_optimizer.strings.label_summary || 'Summary') + '</strong>';
        html += '<div style="line-height:1.5;">' + renderMarkdown(response.summary) + '</div>';
        html += '</div>';

        // Helper to render sections (Flat Design)
        function renderSection(title, items, borderColor) {
            if (!items || items.length === 0) return '';
            var sectionHtml = '<div style="margin-bottom:20px; padding-left:10px; border-left:3px solid ' + borderColor + ';">';
            sectionHtml += '<strong style="display:block; margin-bottom:5px; font-size:13px; color:#2271b1;">' + title + '</strong>';
            
            if (Array.isArray(items)) {
                sectionHtml += '<ul style="margin:0 0 0 16px; list-style:disc; padding:0; line-height:1.5;">';
                items.forEach(function(item) {
                    sectionHtml += '<li style="margin-bottom:6px;">' + renderMarkdown(item) + '</li>';
                });
                sectionHtml += '</ul>';
            } else {
                sectionHtml += '<div style="line-height:1.5;">' + renderMarkdown(items) + '</div>';
            }
            sectionHtml += '</div>';
            return sectionHtml;
        }

        // Structure Analysis
        html += renderSection(picot_aio_optimizer.strings.label_structure || 'Structure Analysis', response.structure_analysis, '#2271b1');

        // Content Advice
        html += renderSection(picot_aio_optimizer.strings.label_content_advice || 'Content Advice', response.content_advice, '#d63638');

        // SEO Advice
        html += renderSection(picot_aio_optimizer.strings.label_seo_advice || 'SEO Advice', response.seo_advice, '#008a20');

        // AIO Advice
        html += renderSection(picot_aio_optimizer.strings.label_aio_advice || 'AIO Advice', response.aio_advice, '#dba617');

        // Recommended Content
        html += renderSection(picot_aio_optimizer.strings.label_recommended || 'Recommended Content', response.recommended_content, '#8224e3');

        // SEO Title Ideas
        if (response.seo_title_ideas && response.seo_title_ideas.length > 0) {
            html += '<div style="margin-bottom:20px; padding-left:10px; border-left:3px solid #50575e;">';
            html += '<strong style="display:block; margin-bottom:5px; font-size:13px; color:#50575e;">' + (picot_aio_optimizer.strings.label_titles || 'SEO Title Ideas') + '</strong>';
            html += '<ul style="margin:0 0 0 16px; list-style:none; padding:0; line-height:1.5;">';
            response.seo_title_ideas.forEach(function(title) {
                 html += '<li style="margin-bottom:8px;">' + renderMarkdown(title) + 
                 ' <button type="button" class="button button-small" onclick="window.PicotAioOptimizer.copyToClipboard(\'' + escapeHtml(title).replace(/'/g, "\\'") + '\')" style="margin-left:5px; vertical-align:middle;">' + (picot_aio_optimizer.strings.copy_btn || 'Copy') + '</button></li>';
            });
            html += '</ul></div>';
        }

        // Meta Description Suggestions
        if (response.meta_description_suggestions && response.meta_description_suggestions.length > 0) {
            html += '<div style="margin-bottom:20px; padding-left:10px; border-left:3px solid #00acc1;">';
            html += '<strong style="display:block; margin-bottom:5px; font-size:13px; color:#00acc1;">' + (picot_aio_optimizer.strings.label_meta || 'Meta Description Suggestions') + '</strong>';
            html += '<ul style="margin:0 0 0 16px; list-style:none; padding:0; line-height:1.5;">';
            response.meta_description_suggestions.forEach(function(desc) {
                 html += '<li style="margin-bottom:8px;">' + renderMarkdown(desc) + 
                 ' <button type="button" class="button button-small" onclick="window.PicotAioOptimizer.copyToClipboard(\'' + escapeHtml(desc).replace(/'/g, "\\'") + '\')" style="margin-left:5px; vertical-align:middle;">Copy</button></li>';
            });
            html += '</ul></div>';
        }

        // Append history list at the bottom for quick access
        if (window.PicotAioOptimizer.currentHistory && window.PicotAioOptimizer.currentHistory.length > 0) {
            html += '<div style="margin-top:30px; border-top:1px solid #ccd0d4; padding-top:15px;">';
            html += '<h4 style="margin:0 0 10px 0; font-size:13px; color:#1d2327;">' + (picot_aio_optimizer.strings.history_title || 'Analysis History') + '</h4>';
            html += '<ul style="margin:0; padding:0; list-style:none;">';
            window.PicotAioOptimizer.currentHistory.forEach(function(log) {
                html += '<li style="margin-bottom:8px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">';
                html += '<span>' + log.created_at.split(' ')[0] + '</span>';
                html += '<button type="button" class="button button-small" onclick="window.PicotAioOptimizer.restoreHistoryItem(' + log.id + ', ' + (targetDiv ? 'true' : 'false') + ')">' + (picot_aio_optimizer.strings.show_btn || 'Show') + '</button>';
                html += '</li>';
            });
            html += '</ul></div>';
        }

        // Actions
        html += '<div style="margin-top:20px; padding-top:15px;">';
        html += '<button type="button" class="button button-secondary" onclick="window.location.reload();">' + (picot_aio_optimizer.strings.clear_results_btn || 'Clear Results') + '</button>';
        html += '</div>';
        
        html += '</div>';
        renderTargets.forEach(function(target) {
            target.html(html);
        });
    }

    function renderMarkdown(text) {
        if (!text) return '';
        
        // 1. Escape HTML bits to avoid XSS
        var html = text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // 2. Block Elements (Headers)
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

        // 3. Inline Elements
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
        html = html.replace(/`(.*?)`/g, '<code style="background:#eee;padding:2px 4px;border-radius:3px;">$1</code>'); // Code

        // 4. Lists (Support - and *)
        html = html.replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li>$1</li>');

        // 5. Short line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // ==========================================
    // CLASSIC EDITOR SUPPORT
    // ==========================================
    
    // Check if we're in Classic Editor (no block editor available)
    $(document).ready(function() {
        // Only run if the classic editor's result box exists
        if ($('#picot_aio_optimizer-classic-results').length > 0) {
            setTimeout(function() {
                fetchPostHistory(true);
                loadSavedImageSuggestions();
            }, 1000);
        }

        // Classic Editor: Analyze button
        $('#picot_aio_optimizer-classic-analyze').on('click', function() {
            classicAnalyzeContent();
        });

        // Classic Editor: Rewrite button
        $('#picot_aio_optimizer-classic-rewrite').off('click').on('click', function() {
            classicTriggerRewrite();
        });

        // Classic Editor: Discover Images button
        $('#picot_aio_optimizer-classic-discover-images').on('click', function() {
            classicDiscoverImages();
        });
    });

    /**
     * Classic Editor Rewrite Trigger
     */
    function classicTriggerRewrite() {
        // If Gutenberg is actually active, use its content even if this button was clicked
        if (typeof wp !== 'undefined' && wp.data && typeof wp.data.select === 'function' && wp.data.select("core/editor")) {
            var instructions = $('#picot_aio_optimizer-classic-instructions').val() || '';
            triggerRewrite(instructions);
            return;
        }

        var content = getClassicEditorContent();
        var instructions = $('#picot_aio_optimizer-classic-instructions').val() || '';
        
        if (!content) {
            alert(picot_aio_optimizer.strings.no_content || 'No content found.');
            return;
        }

        if (!confirm(picot_aio_optimizer.strings.confirm_rewrite || 'Are you sure you want to rewrite content?')) {
            return;
        }

        showOverlay(picot_aio_optimizer.strings.rewriting || 'Rewriting...');

        $.ajax({
            url: picot_aio_optimizer.rest_url_rewrite,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: {
                post_id: $('#post_ID').val(),
                content: content,
                gen_img: picot_aio_optimizer.enable_image_gen ? 1 : 0,
                instructions: instructions
            },
            success: function(response) {
                if (response && response.content) {
                    setClassicEditorContent(response.content);
                    alert(picot_aio_optimizer.strings.success_rewrite || 'Rewrite Success!');
                } else {
                    alert(picot_aio_optimizer.strings.error || 'Rewrite failed.');
                }
            },
            error: function(xhr) {
                alert(handleAjaxError(xhr, 'Rewrite'));
            },
            complete: function() {
                hideOverlay();
            }
        });
    }

    // Classic Editor: Get content from TinyMCE or textarea
    function getClassicEditorContent() {
        var content = '';
        
        // Check if TinyMCE is active
        if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
            content = tinymce.activeEditor.getContent();
        } else {
            // Fall back to textarea
            content = $('#content').val() || '';
        }
        
        return content;
    }

    // Classic Editor: Set content to TinyMCE or textarea
    function setClassicEditorContent(content) {
        // Check if TinyMCE is active
        if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
            tinymce.activeEditor.setContent(content);
        } else {
            // Fall back to textarea
            $('#content').val(content);
        }
    }

    // Classic Editor: Get title
    function getClassicEditorTitle() {
        return $('#title').val() || '';
    }

    // Classic Editor: Analyze content
    function classicAnalyzeContent() {
        // If Gutenberg is actually active, use its content even if this button was clicked
        if (typeof wp !== 'undefined' && wp.data && typeof wp.data.select === 'function' && wp.data.select("core/editor")) {
            analyzeContent();
            return;
        }

        var content = getClassicEditorContent();
        var title = getClassicEditorTitle();
        var resultDiv = $('#picot_aio_optimizer-classic-results');

        if (!content) {
            alert(picot_aio_optimizer.strings.no_content || 'No content found.');
            return;
        }

        resultDiv.html('<p><em>' + (picot_aio_optimizer.strings.analyzing || 'Analyzing...') + '</em></p>');

        showOverlay(picot_aio_optimizer.strings.analyzing || 'Analyzing...');

        $.ajax({
            url: picot_aio_optimizer.rest_url_analyze,
            type: 'POST',
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: "content=" + encodeURIComponent(content) + "&title=" + encodeURIComponent(title) + "&post_id=" + $('#post_ID').val(),
            success: function(response) {
                if (response && !response.code) {
                    displayResultsInternal(response, resultDiv);
                } else {
                    resultDiv.html('<div class="notice notice-error"><p>Error: ' + (response.message || 'Unknown error') + '</p></div>');
                }
            },
            error: function(xhr) {
                var errorMsg = picot_aio_optimizer.strings.error || 'Error occurred';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                resultDiv.html('<div class="notice notice-error"><p>' + errorMsg + '</p></div>');
            },
            complete: function() {
                hideOverlay();
            }
        });
    }

    // Classic Editor: Discover image opportunities
    function classicDiscoverImages() {
        // If Gutenberg is actually active, use its content even if this button was clicked
        if (typeof wp !== 'undefined' && wp.data && typeof wp.data.select === 'function' && wp.data.select("core/editor")) {
            discoverImagePrompts();
            return;
        }

        var content = getClassicEditorContent();
        var title = getClassicEditorTitle();
        var resultDiv = $('#picot_aio_optimizer-classic-results');

        if (!content) {
            alert(picot_aio_optimizer.strings.no_content || 'No content found.');
            return;
        }

        resultDiv.html('<p><em>' + (picot_aio_optimizer.strings.discovering_images || 'Discovering image opportunities...') + '</em></p>');

        showOverlay(picot_aio_optimizer.strings.discovering || 'Discovering image opportunities...');
        
        $.ajax({
            url: picot_aio_optimizer.rest_url_suggest_images,
            type: 'POST',
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: "title=" + encodeURIComponent(title) + "&content=" + encodeURIComponent(content),
            success: function(response) {
                if (response.success && response.data) {
                    var suggestions = [];
                    var featuredText = '';
                    
                    if (response.data.suggestions) {
                        suggestions = response.data.suggestions;
                        featuredText = response.data.featured_text || '';
                    } else if (Array.isArray(response.data)) {
                        suggestions = response.data;
                    }

                    if (suggestions.length > 0) {
                        displayClassicImageSuggestions(suggestions, title, resultDiv, featuredText, response.data.featured_prompt || null);
                    } else {
                        resultDiv.html('<div class="notice notice-warning"><p>' + (picot_aio_optimizer.strings.no_suggestions || 'No suggestions found') + '</p></div>');
                    }
                } else {
                    resultDiv.html('<div class="notice notice-warning"><p>' + (picot_aio_optimizer.strings.no_suggestions || 'No suggestions found') + '</p></div>');
                }
            },
            error: function(xhr) {
                var errorMsg = picot_aio_optimizer.strings.error || 'Error occurred';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                resultDiv.html('<div class="notice notice-error"><p>' + errorMsg + '</p></div>');
            },
            complete: function() {
                hideOverlay();
            }
        });
    }

    // Classic Editor: Display image suggestions
    function displayClassicImageSuggestions(suggestions, postTitle, resultDiv, featuredText, featuredPrompt) {
        var featuredPromptText = featuredText ? featuredText : (postTitle || 'Blog Post');
        
        var finalFeaturedPrompt = featuredPrompt ? featuredPrompt : 
                                  'A professional blog featured image (thumbnail). STYLE: Modern Typography Design. ACTION: Render the text "' + featuredPromptText + '" in large, clear, bold characters that EXACTLY MATCH THE LANGUAGE of the article title. Use the same script and language as the title text - do not translate or convert. BACKGROUND: Minimal.';

        var featuredItem = {
            location: picot_aio_optimizer.strings.featured_image || 'Featured Image',
            prompt: finalFeaturedPrompt,
            description: picot_aio_optimizer.strings.featured_image_prompt || 'Generate featured image',
            isFeatured: true
        };

        var allSuggestions = [featuredItem].concat(suggestions);
        window.PicotAioOptimizer.classicImageSuggestions = allSuggestions;

        var html = '<div style="background:#fff; border:1px solid #ccd0d4; padding:10px; border-radius:4px; font-size:12px;">';
        html += '<strong>🖼️ ' + (picot_aio_optimizer.strings.discover_images_btn || 'Image Opportunities') + '</strong>';

        allSuggestions.forEach(function(item, index) {
            var bgColor = item.isFeatured ? '#fff3cd' : '#f9f9f9';
            html += '<div style="background:' + bgColor + '; padding:8px; margin-top:8px; border-radius:3px;">';
            html += '<div style="font-weight:bold; font-size:11px;">' + (item.isFeatured ? '⭐ ' : '📍 ') + escapeHtml(item.location) + '</div>';
            html += '<button type="button" class="button button-small picot_aio_optimizer-classic-gen-btn" data-index="' + index + '" style="margin-top:5px;">' + (picot_aio_optimizer.strings.generate_btn || 'Generate') + '</button>';
            html += '</div>';
        });

        html += '</div>';
        resultDiv.html(html);

        // Bind event handlers
        $('.picot_aio_optimizer-classic-gen-btn').on('click', function() {
            var idx = $(this).data('index');
            generateClassicImage(idx, $(this));
        });
    }

    // Classic Editor: Generate single image
    function generateClassicImage(index, $btn) {
        var suggestion = window.PicotAioOptimizer.classicImageSuggestions[index];
        if (!suggestion) return;

        var originalText = $btn.text();
        showOverlay(picot_aio_optimizer.strings.generating || 'Generating image...');
        $btn.text(picot_aio_optimizer.strings.generating || 'Generating...').prop('disabled', true);

        $.ajax({
            url: picot_aio_optimizer.rest_url_generate_image,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
            },
            data: { prompt: suggestion.prompt },
            success: function(response) {
                if (response.success && response.data) {
                    var imageUrl = response.data.url;
                    var attachmentId = response.data.attachment_id;

                    if (suggestion.isFeatured && attachmentId) {
                        // Set as featured image
                        if (typeof wp.media !== 'undefined' && wp.media.featuredImage) {
                            wp.media.featuredImage.set(attachmentId);
                        }
                        alert(picot_aio_optimizer.strings.featured_set || 'Featured image set!');
                    } else {
                        // Insert into TinyMCE editor
                        insertImageIntoClassicEditor(imageUrl, suggestion.description || '');
                    }

                    $btn.text('✅ ' + originalText);
                } else {
                    alert('Generation failed: ' + (response.message || 'Unknown error'));
                }
            },
            error: function(xhr) {
                var errorMsg = 'Generation failed';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                alert(errorMsg);
            },
            complete: function() {
                $btn.text(originalText).prop('disabled', false);
                hideOverlay();
            }
        });
    }

    // Classic Editor: Insert image into TinyMCE
    function insertImageIntoClassicEditor(imageUrl, altText) {
        var imgHtml = '<img src="' + imageUrl + '" alt="' + escapeHtml(altText) + '" />';
        
        // Check if TinyMCE is active
        if (typeof tinymce !== 'undefined' && tinymce.activeEditor && !tinymce.activeEditor.isHidden()) {
            tinymce.activeEditor.execCommand('mceInsertContent', false, imgHtml);
            alert(picot_aio_optimizer.strings.image_inserted || 'Image inserted!');
        } else {
            // Fall back to textarea - insert at cursor position
            var textarea = document.getElementById('content');
            if (textarea) {
                var start = textarea.selectionStart;
                var end = textarea.selectionEnd;
                var text = textarea.value;
                textarea.value = text.substring(0, start) + imgHtml + text.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + imgHtml.length;
                alert(picot_aio_optimizer.strings.image_inserted || 'Image inserted!');
            } else {
                alert(picot_aio_optimizer.strings.insert_failed || 'Failed to insert image.');
            }
        }
    }

    /**
     * Settings Page Logic
     */
    function initSettingsPage() {
        var $fetchBtn = $('#picot_aio_optimizer_fetch_models');
        if ($fetchBtn.length > 0) {
            $fetchBtn.on('click', function() {
                var $status = $('#picot_aio_optimizer_fetch_status');
                $fetchBtn.prop('disabled', true);
                $status.text(picot_aio_optimizer.strings.fetching || 'Fetching...');
                
                $.ajax({
                    url: picot_aio_optimizer.rest_url_models,
                    type: 'POST',
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
                    },
                    success: function(response) {
                        if (response.success && response.data) {
                            var currentModel = $('#picot_aio_optimizer_model').val();
                            var currentImgModel = $('#picot_aio_optimizer_image_model').val();
                            var $modelSelect = $('#picot_aio_optimizer_model');
                            var $imgModelSelect = $('#picot_aio_optimizer_image_model');
                            $modelSelect.empty();
                            $imgModelSelect.empty();
                            
                            $.each(response.data, function(i, m) {
                                var modelId = m.name.replace('models/', '');
                                var displayName = m.displayName + ' (' + modelId + ')';
                                var methods = m.supportedGenerationMethods || [];
                                var lowerId = modelId.toLowerCase();
                                var isImage = (methods.indexOf('imageGeneration') !== -1 || modelId.indexOf('image') !== -1 || lowerId.indexOf('banana') !== -1);
                                if (methods.indexOf('generateContent') !== -1 && !isImage) {
                                    $modelSelect.append($('<option>', { value: modelId, text: displayName }));
                                }
                                if (isImage) {
                                    $imgModelSelect.append($('<option>', { value: modelId, text: displayName }));
                                }
                            });
                            $modelSelect.val(currentModel);
                            $imgModelSelect.val(currentImgModel);
                            $status.text(picot_aio_optimizer.strings.done || 'Done');
                        } else {
                            $status.text(picot_aio_optimizer.strings.error || 'Error');
                        }
                    },
                    error: function() {
                        $status.text(picot_aio_optimizer.strings.error || 'Error');
                    },
                    complete: function() {
                        $fetchBtn.prop('disabled', false);
                    }
                });
            });
        }

        $('#picot_aio_optimizer_enable_image_gen').on('change', function() {
            if ($(this).is(':checked')) {
                $('#picot_aio_optimizer_image_style_row').show();
                $('#picot_aio_optimizer_image_model_row').show();
            } else {
                $('#picot_aio_optimizer_image_style_row').hide();
                $('#picot_aio_optimizer_image_model_row').hide();
            }
        });

        // Global History List (Settings Page)
        var $historyList = $('#picot_aio_optimizer-history-list');
        if ($historyList.length > 0) {
            var historyData = [];
            
            var fetchGlobalHistory = function() {
                $.ajax({
                    url: picot_aio_optimizer.rest_url_history,
                    type: 'GET',
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('X-WP-Nonce', picot_aio_optimizer.rest_nonce);
                    },
                    success: function(response) {
                        $historyList.empty();
                        if (response.success && response.data) {
                            historyData = response.data;
                            $.each(response.data, function(i, log) {
                                var summary = picot_aio_optimizer.strings.no_data || '(No data)';
                                try {
                                    var parsed = typeof log.advice_result === 'string' ? JSON.parse(log.advice_result) : log.advice_result;
                                    if (parsed && (parsed.summary || parsed.summary_ja)) {
                                        summary = parsed.summary_ja || parsed.summary;
                                    }
                                } catch (e) {}
                                
                                var dateStr = new Date(log.created_at).toLocaleString();
                                var row = $('<div class="picot-history-row" data-index="' + i + '" style="display:flex; padding:10px; border-bottom:1px solid #eee; cursor:pointer;">' +
                                    '<div class="col-date" style="width:150px;">' + dateStr + '</div>' +
                                    '<div class="col-id" style="width:80px;">' + log.post_id + '</div>' +
                                    '<div class="col-summary" style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(summary) + '</div>' +
                                    '<div class="col-action" style="width:80px; text-align:right;"><button type="button" class="button view-detail">' + (picot_aio_optimizer.strings.view_detail || '表示') + '</button></div>' +
                                    '</div>');
                                $historyList.append(row);
                            });
                        } else {
                            $historyList.html('<p style="padding:20px; text-align:center;">' + (picot_aio_optimizer.strings.no_history || '履歴が見つかりません。') + '</p>');
                        }
                    }
                });
            };

            fetchGlobalHistory();

            // Modal logic
            $(document).on('click', '.picot-history-row, .view-detail', function(e) {
                var $row = $(this).closest('.picot-history-row');
                var idx = $row.data('index');
                var log = historyData[idx];
                if (!log) return;

                var $modal = $('#picot_aio_optimizer-modal');
                var $content = $('#picot_aio_optimizer-modal-content');
                
                var resultHtml = '';
                try {
                    var adviceStr = log.advice_result;
                    var cleanAdvice = adviceStr.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
                    var parsed = JSON.parse(cleanAdvice);
                    
                    // Use internal formatter if available
                    resultHtml = '<strong>' + (picot_aio_optimizer.strings.label_history || '分析記録') + ' - Post ID: ' + log.post_id + '</strong><hr>';
                    
                    // Simple display for modal
                    if (parsed.summary_ja || parsed.summary) {
                        resultHtml += '<h4>Summary</h4><p>' + (parsed.summary_ja || parsed.summary) + '</p>';
                    }
                    if (parsed.advice) {
                        resultHtml += '<h4>Advice</h4><ul>';
                        $.each(parsed.advice, function(j, adv) {
                            resultHtml += '<li>' + (adv.advice_ja || adv.advice) + '</li>';
                        });
                        resultHtml += '</ul>';
                    }
                } catch (e) {
                    resultHtml = '<strong>Post ID: ' + log.post_id + '</strong><br><br><pre style="white-space:pre-wrap;">' + escapeHtml(log.advice_result) + '</pre>';
                }

                $content.html(resultHtml);
                $modal.show();
            });

            $('#picot_aio_optimizer-modal-close').on('click', function() {
                $('#picot_aio_optimizer-modal').hide();
            });

            $(window).on('click', function(e) {
                if ($(e.target).is('#picot_aio_optimizer-modal')) {
                    $('#picot_aio_optimizer-modal').hide();
                }
            });
        }
    }

})( jQuery );
